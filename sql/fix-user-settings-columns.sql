-- Fix missing columns in user_settings table
-- Run this in Supabase SQL Editor to add missing columns

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add currency column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' AND column_name = 'currency') THEN
        ALTER TABLE public.user_settings ADD COLUMN currency VARCHAR(10) DEFAULT 'PHP';
    END IF;

    -- Add language column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' AND column_name = 'language') THEN
        ALTER TABLE public.user_settings ADD COLUMN language VARCHAR(10) DEFAULT 'en';
    END IF;

    -- Add timezone column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' AND column_name = 'timezone') THEN
        ALTER TABLE public.user_settings ADD COLUMN timezone VARCHAR(50) DEFAULT 'Asia/Manila';
    END IF;

    -- Add date_format column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' AND column_name = 'date_format') THEN
        ALTER TABLE public.user_settings ADD COLUMN date_format VARCHAR(20) DEFAULT 'MM/dd/yyyy';
    END IF;

    -- Add time_format column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_settings' AND column_name = 'time_format') THEN
        ALTER TABLE public.user_settings ADD COLUMN time_format VARCHAR(5) DEFAULT '12h' CHECK (time_format IN ('12h', '24h'));
    END IF;

    RAISE NOTICE 'Missing columns have been added to user_settings table';
END $$;

-- Verify the table structure
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
ORDER BY ordinal_position;