-- Fix activity_logs table by adding missing 'level' column
-- This resolves the PGRST204 error: "Could not find the 'level' column"

-- Add the missing 'level' column to activity_logs table
ALTER TABLE public.activity_logs 
ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'info' CHECK (level IN ('info', 'warning', 'error', 'success'));

-- Add missing 'module' column that your frontend also expects
ALTER TABLE public.activity_logs 
ADD COLUMN IF NOT EXISTS module TEXT;

-- Update existing records to have a default level value
UPDATE public.activity_logs 
SET level = 'info' 
WHERE level IS NULL;

-- Update existing records to have a default module value based on action
UPDATE public.activity_logs 
SET module = CASE 
    WHEN action LIKE '%login%' OR action LIKE '%logout%' THEN 'Authentication'
    WHEN action LIKE '%product%' OR action LIKE '%inventory%' THEN 'Inventory'
    WHEN action LIKE '%sale%' OR action LIKE '%order%' THEN 'Sales'
    WHEN action LIKE '%user%' THEN 'Users'
    WHEN action LIKE '%system%' OR action LIKE '%table%' OR action LIKE '%database%' THEN 'System'
    ELSE 'General'
END
WHERE module IS NULL;

-- Create index on level column for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_level ON public.activity_logs(level);

-- Create index on module column for better performance  
CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON public.activity_logs(module);

-- Verify the fix
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'activity_logs' 
AND table_schema = 'public'
AND column_name IN ('level', 'module')
ORDER BY column_name;

-- Test that the columns work
SELECT 
    COUNT(*) as total_logs,
    COUNT(*) FILTER (WHERE level = 'info') as info_logs,
    COUNT(*) FILTER (WHERE level = 'error') as error_logs,
    COUNT(*) FILTER (WHERE level = 'warning') as warning_logs,
    COUNT(*) FILTER (WHERE level = 'success') as success_logs
FROM public.activity_logs;

-- Success message
SELECT '✅ activity_logs table fixed! The level and module columns have been added.' as message;
