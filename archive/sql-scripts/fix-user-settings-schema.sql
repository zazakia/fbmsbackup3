-- Fix user_settings table schema issues
-- This addresses the missing 'inventory' column error

-- Add missing columns to user_settings table
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS notifications BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS inventory BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS pos BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS purchases BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS suppliers BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS expenses BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS payroll BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS accounting BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS bir BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS branches BOOLEAN DEFAULT true;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS admin_dashboard BOOLEAN DEFAULT true;

-- Create RLS policy for user_settings that doesn't cause recursion
DROP POLICY IF EXISTS "Users can manage own settings" ON user_settings;

CREATE POLICY "allow_user_settings_access" ON user_settings
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id OR auth.uid() IN (
        SELECT id FROM users WHERE role = 'admin'
    ))
    WITH CHECK (auth.uid() = user_id OR auth.uid() IN (
        SELECT id FROM users WHERE role = 'admin'
    ));

-- Ensure RLS is enabled
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create default settings for the current user
INSERT INTO user_settings (
    user_id, 
    theme, 
    language, 
    notifications, 
    inventory, 
    pos, 
    purchases, 
    suppliers, 
    expenses, 
    payroll, 
    accounting, 
    bir, 
    branches, 
    admin_dashboard
) VALUES (
    'fe1deb78-6fe5-420e-930f-7063e9fe0d57',
    'light',
    'en',
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true
) ON CONFLICT (user_id) DO UPDATE SET
    inventory = true,
    pos = true,
    purchases = true,
    suppliers = true,
    expenses = true,
    payroll = true,
    accounting = true,
    bir = true,
    branches = true,
    admin_dashboard = true;