# 🚨 Quick Fix for Login Issue

## Problem
The app is connecting to local Supabase (`http://127.0.0.1:54321`) instead of remote Supabase, causing 503 Service Temporarily Unavailable errors during login.

## Root Cause
Browser localStorage has database mode set to 'local' from previous testing.

## Quick Fix Solution

### Option 1: Browser Console Fix (Recommended)
1. Open your FBMS app at `http://localhost:5180`
2. Open browser Developer Tools (F12)
3. Go to Console tab
4. Paste and run this code:

```javascript
// Fix database mode to remote
console.log('🔧 Fixing database mode...');
const settings = JSON.parse(localStorage.getItem('fbms-settings-store') || '{}');
if (!settings.state) settings.state = {};
if (!settings.state.database) settings.state.database = {};
settings.state.database.mode = 'remote';
settings.version = 5;
localStorage.setItem('fbms-settings-store', JSON.stringify(settings));
console.log('✅ Fixed! Refreshing page...');
setTimeout(() => window.location.reload(), 1000);
```

### Option 2: Clear All Settings
1. Open browser Developer Tools (F12) 
2. Go to Application tab → Storage → Local Storage
3. Find `fbms-settings-store` and delete it
4. Refresh the page

### Option 3: Use the Diagnostic Tool
1. Navigate to: `http://localhost:5180/fix_database_mode.html`
2. Click "Check Current Settings"
3. Click "Switch to Remote Mode" if needed
4. Refresh your main FBMS app

## Verification
After applying the fix:
1. Check browser console logs should show:
   ```
   Database mode: remote
   Supabase URL: https://coqjcziquviehgyifhek.supabase.co
   ```
2. Login should work with demo account:
   - Email: `admin@fbms.com`
   - Password: `Qweasd145698@`

## Technical Details
- **Remote Supabase**: `https://coqjcziquviehgyifhek.supabase.co` ✅ Working
- **Local Supabase**: `http://127.0.0.1:54321` ❌ Not running (503 errors)
- **Default Mode**: Should be 'remote' but localStorage override was 'local'