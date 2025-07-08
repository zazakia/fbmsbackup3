# Manual Admin Fix - Step by Step

Since the console methods can't access the Supabase client, here are **manual methods** to fix your admin access:

## Method 1: Direct Database Access (Recommended)

If you have direct access to your Supabase database:

1. **Go to Supabase Dashboard**
   - Open https://supabase.com/dashboard
   - Navigate to your project
   - Go to "SQL Editor"

2. **Run this SQL:**
```sql
-- Update existing user to admin
UPDATE public.users 
SET role = 'admin', updated_at = NOW() 
WHERE email = 'cybergada@gmail.com';

-- Create user if doesn't exist
INSERT INTO public.users (email, first_name, last_name, role, is_active, created_at, updated_at)
SELECT 'cybergada@gmail.com', 'Cyber', 'Gada', 'admin', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'cybergada@gmail.com');

-- Verify the result
SELECT email, role, is_active FROM public.users WHERE email = 'cybergada@gmail.com';
```

## Method 2: Use React DevTools

1. **Install React DevTools** (Chrome/Firefox extension)
2. **Open DevTools** → React tab
3. **Find Auth Store Component**
4. **Manually update the user object:**
   - Look for components with "auth" or "store" in the name
   - Find the user object
   - Change `role` from 'employee' to 'admin'
   - Force a re-render

## Method 3: Code-Based Fix

1. **Temporarily add this to your App.tsx:**
```typescript
// Add this to the top of App.tsx temporarily
import { useEffect } from 'react';
import { supabase } from './utils/supabase';
import { useSupabaseAuthStore } from './store/supabaseAuthStore';

// Add this inside your App component
useEffect(() => {
  const fixAdminAccess = async () => {
    try {
      // Update database
      const { error } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .eq('email', 'cybergada@gmail.com');
      
      if (!error) {
        // Force auth refresh
        const authStore = useSupabaseAuthStore.getState();
        await authStore.checkAuth();
        console.log('Admin access fixed!');
      }
    } catch (err) {
      console.error('Fix failed:', err);
    }
  };
  
  // Run once on app load
  if (window.location.search.includes('fix-admin')) {
    fixAdminAccess();
  }
}, []);
```

2. **Access your app with:** `http://localhost:3000?fix-admin`

## Method 4: API Tool (Postman/Insomnia)

1. **Get your Supabase URL and API key** from `.env` or `supabase.ts`
2. **Make a PATCH request:**
   - URL: `https://your-project.supabase.co/rest/v1/users?email=eq.cybergada@gmail.com`
   - Headers:
     ```
     Authorization: Bearer YOUR_ANON_KEY
     apikey: YOUR_ANON_KEY
     Content-Type: application/json
     ```
   - Body:
     ```json
     { "role": "admin" }
     ```

## Method 5: Browser Console with Manual Import

1. **Add this to any component file temporarily:**
```typescript
// Add to any component
if (typeof window !== 'undefined') {
  window.manualAdminFix = async () => {
    const { supabase } = await import('./utils/supabase');
    const { useSupabaseAuthStore } = await import('./store/supabaseAuthStore');
    
    await supabase.from('users').update({ role: 'admin' }).eq('email', 'cybergada@gmail.com');
    await useSupabaseAuthStore.getState().checkAuth();
    window.location.reload();
  };
}
```

2. **In browser console, run:** `window.manualAdminFix()`

## Method 6: Environment Variable Override

1. **Add to your `.env.local`:**
```env
REACT_APP_ADMIN_OVERRIDE=true
REACT_APP_ADMIN_EMAIL=cybergada@gmail.com
```

2. **Add this check in your auth store:**
```typescript
// In checkAuth() method, add this check:
if (process.env.REACT_APP_ADMIN_OVERRIDE === 'true' && 
    session?.user?.email === process.env.REACT_APP_ADMIN_EMAIL) {
  user.role = 'admin';
}
```

## Why the Console Fix Failed

The Supabase client isn't exposed to `window` object in your React app. This is actually **good security practice**. The manual methods above work around this limitation.

## Recommended Order

1. **Try Method 1** (SQL Editor) - fastest
2. **Try Method 3** (Code fix) - most reliable
3. **Try Method 5** (Manual import) - if you can edit files
4. **Try Method 2** (React DevTools) - last resort

After any method succeeds, **refresh your browser** and log in again to see admin access restored.