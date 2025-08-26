-- =============================================
-- Create User Settings Table for FBMS
-- Run this script in your Supabase SQL Editor
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'Asia/Manila',
    date_format VARCHAR(20) DEFAULT 'MM/dd/yyyy',
    time_format VARCHAR(5) DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),
    currency VARCHAR(10) DEFAULT 'PHP',
    notifications JSONB DEFAULT '{
        "enabled": true,
        "email": true,
        "push": true,
        "sms": false,
        "categories": {
            "system": true,
            "inventory": true,
            "sales": true,
            "reports": true,
            "security": true,
            "reminders": true,
            "marketing": false
        },
        "frequency": "immediate",
        "quietHours": {
            "enabled": false,
            "start": "22:00",
            "end": "08:00"
        },
        "channels": {
            "lowStock": ["email", "push"],
            "newSale": ["push"],
            "systemAlert": ["email", "push"],
            "reportReady": ["email"]
        }
    }'::jsonb,
    privacy JSONB DEFAULT '{
        "profileVisibility": "team",
        "activityLogging": true,
        "dataSharing": false,
        "analytics": true,
        "cookies": {
            "essential": true,
            "functional": true,
            "analytics": true,
            "marketing": false
        },
        "dataRetention": 365
    }'::jsonb,
    display JSONB DEFAULT '{
        "sidebarCollapsed": false,
        "density": "comfortable",
        "animations": true,
        "sounds": false,
        "highContrast": false,
        "fontSize": "medium",
        "dashboardLayout": {
            "widgets": [],
            "layout": "grid",
            "columns": 2
        },
        "tableSettings": {
            "rowsPerPage": 25,
            "showRowNumbers": true,
            "stickyHeaders": true
        },
        "topBar": {
            "showDatabaseStatus": true,
            "showSupabaseStatus": true,
            "showThemeToggle": true,
            "showNotifications": true,
            "showSearch": true,
            "showUserProfile": true,
            "showMobileSearch": true
        },
        "showDatabaseStatus": true,
        "showThemeToggle": true
    }'::jsonb,
    reports JSONB DEFAULT '{
        "autoGenerate": {
            "daily": false,
            "weekly": true,
            "monthly": true,
            "quarterly": false
        },
        "emailSchedule": {
            "enabled": false,
            "recipients": [],
            "time": "09:00",
            "day": "monday"
        },
        "exportFormats": ["pdf", "excel"],
        "includeCharts": true,
        "chartTypes": ["bar", "line", "pie"],
        "dataRange": 30,
        "compression": false
    }'::jsonb,
    inventory JSONB DEFAULT '{
        "thresholds": {
            "lowStock": 10,
            "outOfStock": 0,
            "overStock": 1000,
            "expiryWarning": 7
        },
        "autoReorder": {
            "enabled": false,
            "method": "manual",
            "leadTime": 7,
            "safetyStock": 5
        },
        "monitoring": {
            "enabled": true,
            "frequency": "daily",
            "alertChannels": ["email", "push"]
        },
        "barcodeSettings": {
            "enabled": true,
            "format": "code128",
            "autoGenerate": true
        }
    }'::jsonb,
    security JSONB DEFAULT '{
        "twoFactorAuth": {
            "enabled": false,
            "method": "email",
            "backupCodes": []
        },
        "sessionTimeout": 60,
        "passwordPolicy": {
            "minLength": 8,
            "requireUppercase": true,
            "requireLowercase": true,
            "requireNumbers": true,
            "requireSpecialChars": false,
            "expiryDays": 90
        },
        "loginAttempts": {
            "maxAttempts": 5,
            "lockoutDuration": 15
        },
        "auditLog": {
            "enabled": true,
            "retention": 90
        },
        "ipWhitelist": {
            "enabled": false,
            "addresses": []
        }
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at 
    BEFORE UPDATE ON public.user_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON public.user_settings;

-- Create policies for user_settings
CREATE POLICY "Users can view their own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON public.user_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Create system_settings table for admin-level settings
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_info JSONB DEFAULT '{
        "name": "FBMS Business",
        "address": "",
        "phone": "",
        "email": "",
        "taxId": "",
        "website": "",
        "logo": ""
    }'::jsonb,
    integration JSONB DEFAULT '{
        "paymentGateways": {
            "gcash": {"enabled": false, "apiKey": ""},
            "paymaya": {"enabled": false, "apiKey": ""},
            "paypal": {"enabled": false, "apiKey": ""}
        },
        "emailService": {
            "provider": "smtp",
            "config": {}
        },
        "smsService": {
            "provider": "local",
            "config": {}
        }
    }'::jsonb,
    backup JSONB DEFAULT '{
        "enabled": true,
        "frequency": "daily",
        "time": "02:00",
        "retention": 30,
        "location": "local",
        "encryption": true
    }'::jsonb,
    maintenance JSONB DEFAULT '{
        "mode": false,
        "message": "System is under maintenance. Please try again later.",
        "allowedUsers": []
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add updated_at trigger for system_settings
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at 
    BEFORE UPDATE ON public.system_settings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS for system_settings (admin only)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Only admins can access system settings" ON public.system_settings;

-- Create policies for system_settings (admin only)
CREATE POLICY "Only admins can access system settings" ON public.system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Insert default system settings row if it doesn't exist
INSERT INTO public.system_settings (id) 
SELECT gen_random_uuid() 
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings);

-- Grant necessary permissions
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.system_settings TO authenticated;

-- Success message
SELECT 'User settings table created successfully! You can now save Top Bar Settings to Supabase.' as message;