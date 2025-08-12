# Fix for PGRST116 User Settings Error

## Error Description
The error occurs when trying to fetch user settings from Supabase and the query returns no rows, but the client code expects to receive exactly one row (using `.single()`).

**Error Details:**
```javascript
{
  "status": 406,
  "statusText": "",
  "url": "https://coqjcziquviehgyifhek.supabase.co/rest/v1/user_settings?select=*&user_id=eq.123e4567-e89b-12d3-a456-426614174000",
  "body": {
    "code": "PGRST116",
    "details": "The result contains 0 rows",
    "hint": null,
    "message": "JSON object requested, multiple (or no) rows returned"
  }
}
```

## Root Causes

1. **New User Without Settings**: A user exists in the system but doesn't have a corresponding record in `user_settings` table
2. **Authentication Issues**: Invalid or missing user ID being passed to the settings API
3. **RLS Policy Issues**: Row Level Security policies preventing access to user settings
4. **Test Data**: Hard-coded test UUIDs being used in production code

## Solutions Implemented

### 1. Enhanced Error Handling in Settings API

The `getUserSettings` method now properly handles PGRST116 errors:

```typescript
// Handle PGRST116 (no rows returned) - this is expected for new users
if (error && error.code === 'PGRST116') {
  console.log('No existing settings found for user, creating defaults:', userId);
  return this.createDefaultUserSettings(userId);
}
```

### 2. Input Validation

Added proper validation for user IDs:

```typescript
// Validate user ID format
if (!userId || typeof userId !== 'string' || userId.trim() === '') {
  console.warn('Invalid user ID provided to getUserSettings:', userId);
  return { 
    success: false, 
    error: 'Invalid user ID provided' 
  };
}
```

### 3. Component-Level Protection

Updated `UserPreferences` component to validate users before making API calls:

```typescript
const loadSettings = async () => {
  // Double check user exists and has valid ID
  if (!user?.id || typeof user.id !== 'string' || user.id.trim() === '') {
    console.warn('Cannot load settings: Invalid user or user ID', { user, userId: user?.id });
    setLoading(false);
    return;
  }
  // ... rest of the function
};
```

### 4. Improved Logging

Added detailed error logging that matches the format from your error report:

```typescript
console.error('Supabase HTTP error', {
  status: error.code,
  statusText: error.message,
  url: `user_settings query for user_id=${userId}`,
  body: {
    code: error.code,
    details: error.details,
    hint: error.hint,
    message: error.message
  }
});
```

## Database Fixes

### 1. Ensure User Settings Table Exists

Run this SQL in Supabase SQL Editor:

```sql
-- Check if user_settings table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'user_settings'
) as table_exists;
```

If `table_exists` is `false`, run the migration:
```bash
# Run the user settings table migration
psql -f scripts/create-user-settings-table.sql
```

### 2. Check RLS Policies

Ensure users can access their own settings:

```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_settings';

-- If policies are missing, create them:
CREATE POLICY "Users can view their own settings" ON public.user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON public.user_settings
    FOR UPDATE USING (auth.uid() = user_id);
```

### 3. Create Missing Settings

For existing users without settings:

```sql
-- Find users without settings
SELECT u.id, u.email, u.first_name, u.last_name 
FROM public.users u 
LEFT JOIN public.user_settings us ON u.id = us.user_id 
WHERE us.user_id IS NULL 
  AND u.is_active = true;

-- Create default settings for users who don't have them
INSERT INTO public.user_settings (
    user_id, theme, language, timezone, date_format, time_format, currency,
    notifications, privacy, display, reports, inventory, security
)
SELECT 
    u.id,
    'system',
    'en',
    'Asia/Manila',
    'MM/dd/yyyy',
    '12h',
    'PHP',
    '{"enabled": true, "email": true, "push": true, "sms": false}'::jsonb,
    '{"profileVisibility": "team", "activityLogging": true, "dataSharing": false, "analytics": true}'::jsonb,
    '{"sidebarCollapsed": false, "density": "comfortable", "animations": true, "sounds": false}'::jsonb,
    '{"autoGenerate": {"daily": false, "weekly": true, "monthly": true}}'::jsonb,
    '{"thresholds": {"lowStock": 10, "outOfStock": 0, "expiryWarning": 7}}'::jsonb,
    '{"sessionTimeout": 60, "twoFactorAuth": {"enabled": false, "method": "email"}}'::jsonb
FROM public.users u 
LEFT JOIN public.user_settings us ON u.id = us.user_id 
WHERE us.user_id IS NULL 
  AND u.is_active = true;
```

## Testing the Fix

### 1. Run the Debug Script

Use the provided debug script to investigate the issue:

```bash
# Run the debug script in Supabase SQL Editor
cat scripts/debug-user-settings-error.sql
```

### 2. Test API Calls

In your browser console, test the settings API:

```javascript
// Test with a real user ID
import { settingsAPI } from '../api/settings';

// This should now handle PGRST116 gracefully
const result = await settingsAPI.getUserSettings('your-user-id-here');
console.log('Settings result:', result);
```

### 3. Monitor Console Logs

After implementing the fixes, you should see logs like:
- `"Fetching user settings for user ID: [user-id]"`
- `"No existing settings found for user, creating defaults: [user-id]"` (for new users)

## Prevention

### 1. Automatic Settings Creation

The updated code automatically creates default settings for new users when they first access the settings API.

### 2. Proper User Validation

All components now validate user objects before making API calls.

### 3. Graceful Error Handling

PGRST116 errors are now handled gracefully instead of being treated as failures.

## Monitoring

To monitor for this error in the future:

1. Check console logs for "Supabase HTTP error" messages
2. Monitor user feedback about settings not loading
3. Run the debug SQL script periodically to ensure data integrity

## Verification

After implementing these fixes, the error should no longer occur. The system will:

1. ✅ Validate user IDs before making API calls
2. ✅ Automatically create default settings for new users
3. ✅ Handle PGRST116 errors gracefully
4. ✅ Provide better error logging for debugging
5. ✅ Prevent invalid API calls from components

The specific error `PGRST116` with user ID `123e4567-e89b-12d3-a456-426614174000` should be resolved, and similar errors for other users should be prevented.
