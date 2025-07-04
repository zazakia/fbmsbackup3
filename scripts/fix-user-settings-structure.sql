-- Fix existing user_settings records to have complete structure
UPDATE public.user_settings 
SET 
  display = jsonb_set(
    jsonb_set(
      jsonb_set(
        COALESCE(display, '{}'),
        '{tableSettings}',
        '{"rowsPerPage": 25, "showRowNumbers": true, "stickyHeaders": true}'
      ),
      '{dashboardLayout}',
      '{"widgets": [], "layout": "grid", "columns": 2}'
    ),
    '{topBar}',
    COALESCE(display->'topBar', '{"showDatabaseStatus": true, "showSupabaseStatus": true, "showThemeToggle": true, "showNotifications": true, "showSearch": true, "showUserProfile": true, "showMobileSearch": true}')
  ),
  notifications = COALESCE(notifications, '{"enabled": true, "email": true, "push": true, "sms": false}'),
  privacy = COALESCE(privacy, '{"profileVisibility": "team", "activityLogging": true, "dataSharing": false, "analytics": true}'),
  security = COALESCE(security, '{"sessionTimeout": 60, "twoFactorAuth": {"enabled": false, "method": "email"}}'),
  reports = COALESCE(reports, '{"autoGenerate": {"daily": false, "weekly": true, "monthly": true}, "exportFormats": ["pdf", "excel"]}'),
  inventory = COALESCE(inventory, '{"thresholds": {"lowStock": 10, "outOfStock": 0, "expiryWarning": 7}}'),
  updated_at = NOW()
WHERE display IS NULL OR 
      display->'tableSettings' IS NULL OR 
      display->'dashboardLayout' IS NULL OR
      notifications IS NULL OR
      privacy IS NULL OR
      security IS NULL OR
      reports IS NULL OR
      inventory IS NULL;

-- Verify the update
SELECT 
  user_id,
  display->'tableSettings' as table_settings,
  display->'topBar' as top_bar,
  display->'dashboardLayout' as dashboard_layout
FROM public.user_settings;