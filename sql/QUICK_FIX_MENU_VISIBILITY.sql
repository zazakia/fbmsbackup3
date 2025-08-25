-- QUICK FIX: Add missing menuVisibility column to user_settings table
-- Run this script in Supabase SQL Editor to resolve the sync error

-- Add the missing menuVisibility column
DO $$ 
BEGIN
    -- Check if menuVisibility column exists, if not, add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' 
                   AND column_name = 'menuVisibility') THEN
        
        ALTER TABLE public.user_settings 
        ADD COLUMN "menuVisibility" JSONB DEFAULT '{
            "dashboard": true,
            "inventory": true,
            "sales": true,
            "purchases": true,
            "suppliers": true,
            "customers": true,
            "reports": true,
            "analytics": true,
            "settings": true,
            "users": true,
            "audit": true,
            "backup": true
        }'::jsonb;
        
        -- Update existing records to have the default menuVisibility
        UPDATE public.user_settings 
        SET "menuVisibility" = '{
            "dashboard": true,
            "inventory": true,
            "sales": true,
            "purchases": true,
            "suppliers": true,
            "customers": true,
            "reports": true,
            "analytics": true,
            "settings": true,
            "users": true,
            "audit": true,
            "backup": true
        }'::jsonb
        WHERE "menuVisibility" IS NULL;
        
        RAISE NOTICE 'menuVisibility column has been added successfully!';
    ELSE
        RAISE NOTICE 'menuVisibility column already exists!';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
AND column_name = 'menuVisibility';

-- Show a sample of the updated data
SELECT id, user_id, "menuVisibility" 
FROM public.user_settings 
LIMIT 3;