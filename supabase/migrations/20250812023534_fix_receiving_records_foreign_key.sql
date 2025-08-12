-- Fix foreign key constraint violation in purchase_order_receiving_records
-- Error 409: foreign key constraint "purchase_order_receiving_records_received_by_fkey" violated

-- Step 1: Check current constraint and drop it
DO $$
BEGIN
    -- Drop existing foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'purchase_order_receiving_records' 
        AND constraint_name = 'purchase_order_receiving_records_received_by_fkey'
    ) THEN
        ALTER TABLE public.purchase_order_receiving_records 
        DROP CONSTRAINT purchase_order_receiving_records_received_by_fkey;
        RAISE NOTICE 'Dropped existing foreign key constraint';
    END IF;
END
$$;

-- Step 2: Update any invalid received_by references to NULL
-- This prevents constraint violations for existing data
UPDATE public.purchase_order_receiving_records 
SET received_by = NULL 
WHERE received_by IS NOT NULL 
AND received_by NOT IN (
    SELECT id FROM auth.users 
    UNION 
    SELECT id FROM public.users
);

-- Step 3: Create a more flexible constraint that works with your user setup
-- Option A: Reference public.users (your custom users table)
ALTER TABLE public.purchase_order_receiving_records 
ADD CONSTRAINT purchase_order_receiving_records_received_by_fkey 
FOREIGN KEY (received_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Step 4: Alternative - make received_by optional and rely on received_by_name
-- Modify the table to make received_by nullable if it isn't already
ALTER TABLE public.purchase_order_receiving_records 
ALTER COLUMN received_by DROP NOT NULL;

-- Step 5: Add a check constraint to ensure we have either received_by or received_by_name
ALTER TABLE public.purchase_order_receiving_records 
DROP CONSTRAINT IF EXISTS check_receiver_identification;

ALTER TABLE public.purchase_order_receiving_records 
ADD CONSTRAINT check_receiver_identification 
CHECK (received_by IS NOT NULL OR received_by_name IS NOT NULL);

-- Step 6: Create a function to handle user lookup and insertion
CREATE OR REPLACE FUNCTION public.handle_receiving_record_user(
    p_user_id uuid DEFAULT NULL,
    p_user_name text DEFAULT NULL,
    p_user_email text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id uuid;
BEGIN
    -- If user_id is provided and exists, use it
    IF p_user_id IS NOT NULL THEN
        SELECT id INTO v_user_id 
        FROM public.users 
        WHERE id = p_user_id;
        
        IF v_user_id IS NOT NULL THEN
            RETURN v_user_id;
        END IF;
    END IF;
    
    -- If user_email is provided, try to find user by email
    IF p_user_email IS NOT NULL THEN
        SELECT id INTO v_user_id 
        FROM public.users 
        WHERE email = p_user_email;
        
        IF v_user_id IS NOT NULL THEN
            RETURN v_user_id;
        END IF;
    END IF;
    
    -- Return NULL if no valid user found
    RETURN NULL;
END;
$$;

-- Step 7: Add some sample valid users if none exist
INSERT INTO public.users (email, first_name, last_name, role, is_active, status)
SELECT 
    'system@company.com',
    'System',
    'User',
    'system',
    true,
    'active'
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE email = 'system@company.com'
);

INSERT INTO public.users (email, first_name, last_name, role, is_active, status)
SELECT 
    'warehouse@company.com',
    'Warehouse',
    'Manager',
    'warehouse_manager',
    true,
    'active'
WHERE NOT EXISTS (
    SELECT 1 FROM public.users WHERE email = 'warehouse@company.com'
);

-- Step 8: Update existing receiving records to use valid user IDs
DO $$
DECLARE
    system_user_id uuid;
BEGIN
    -- Get system user ID
    SELECT id INTO system_user_id 
    FROM public.users 
    WHERE email = 'system@company.com' 
    LIMIT 1;
    
    -- Update records with NULL received_by to use system user
    UPDATE public.purchase_order_receiving_records 
    SET received_by = system_user_id,
        received_by_name = COALESCE(received_by_name, 'System User')
    WHERE received_by IS NULL 
    AND system_user_id IS NOT NULL;
END
$$;

-- Log the fix
INSERT INTO public.activity_logs (action, entity_type, description, details) 
VALUES (
    'fix_applied', 
    'database', 
    'Fixed foreign key constraint for purchase_order_receiving_records', 
    '{"error": "409_foreign_key_violation", "table": "purchase_order_receiving_records", "constraint": "received_by_fkey"}'
) ON CONFLICT DO NOTHING;
