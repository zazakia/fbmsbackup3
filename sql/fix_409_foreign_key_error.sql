-- IMMEDIATE FIX for 409 Foreign Key Constraint Error
-- Run this script to resolve the purchase_order_receiving_records error

-- 1. Drop the problematic foreign key constraint
ALTER TABLE public.purchase_order_receiving_records 
DROP CONSTRAINT IF EXISTS purchase_order_receiving_records_received_by_fkey;

-- 2. Make received_by column nullable (allows NULL values)
ALTER TABLE public.purchase_order_receiving_records 
ALTER COLUMN received_by DROP NOT NULL;

-- 3. Clean up any invalid received_by references
UPDATE public.purchase_order_receiving_records 
SET received_by = NULL 
WHERE received_by IS NOT NULL 
AND received_by NOT IN (
    SELECT id FROM public.users WHERE id IS NOT NULL
);

-- 4. Create system users if they don't exist
INSERT INTO public.users (email, first_name, last_name, role, is_active, status)
VALUES 
    ('system@erp.local', 'System', 'User', 'system', true, 'active'),
    ('warehouse@erp.local', 'Warehouse', 'Manager', 'warehouse_manager', true, 'active')
ON CONFLICT (email) DO NOTHING;

-- 5. Get system user ID and update records
DO $$
DECLARE
    system_user_id uuid;
BEGIN
    SELECT id INTO system_user_id 
    FROM public.users 
    WHERE email = 'system@erp.local' 
    LIMIT 1;
    
    -- Update records without valid received_by
    UPDATE public.purchase_order_receiving_records 
    SET received_by = system_user_id,
        received_by_name = COALESCE(received_by_name, 'System User')
    WHERE received_by IS NULL;
END
$$;

-- 6. Recreate foreign key constraint pointing to public.users
ALTER TABLE public.purchase_order_receiving_records 
ADD CONSTRAINT purchase_order_receiving_records_received_by_fkey 
FOREIGN KEY (received_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 7. Add constraint to ensure we have identification
ALTER TABLE public.purchase_order_receiving_records 
DROP CONSTRAINT IF EXISTS check_receiver_identification;

ALTER TABLE public.purchase_order_receiving_records 
ADD CONSTRAINT check_receiver_identification 
CHECK (received_by IS NOT NULL OR received_by_name IS NOT NULL);

-- Verification query
SELECT 
    'Fix completed successfully!' as status,
    COUNT(*) as total_records,
    COUNT(received_by) as records_with_user_id,
    COUNT(received_by_name) as records_with_user_name
FROM public.purchase_order_receiving_records;
