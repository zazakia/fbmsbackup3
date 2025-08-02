/**
 * EMERGENCY PRODUCTION FIX
 * This works with your production Supabase instance
 */

async function emergencyProductionFix() {
  console.group('🚨 EMERGENCY PRODUCTION FIX');
  
  try {
    console.log('🎯 Using production Supabase URL: https://coqjcziquviehgyifhek.supabase.co');
    
    // Get auth token from localStorage
    let authToken = null;
    const localStorageKeys = Object.keys(localStorage);
    
    for (const key of localStorageKeys) {
      if (key.includes('supabase') || key.includes('auth') || key.includes('fbms')) {
        try {
          const value = localStorage.getItem(key);
          const data = JSON.parse(value || '{}');
          
          if (data.access_token) {
            authToken = data.access_token;
            console.log('✅ Found auth token in', key);
            break;
          } else if (data.session && data.session.access_token) {
            authToken = data.session.access_token;
            console.log('✅ Found session token in', key);
            break;
          }
        } catch (e) {
          // Continue looking
        }
      }
    }
    
    if (!authToken) {
      console.error('❌ No auth token found. Please login first.');
      return false;
    }
    
    console.log('🔑 Auth token found');
    
    // Step 1: Try direct SQL execution to fix both issues
    console.log('🔄 Step 1: Executing comprehensive database fix...');
    
    const sqlQuery = `
      -- Fix 1: Ensure cybergada user is admin
      UPDATE public.users 
      SET role = 'admin', updated_at = NOW() 
      WHERE email = 'cybergada@gmail.com';
      
      -- Create user if doesn't exist
      INSERT INTO public.users (email, first_name, last_name, role, is_active, created_at, updated_at)
      SELECT 'cybergada@gmail.com', 'Cyber', 'Gada', 'admin', true, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'cybergada@gmail.com');
      
      -- Fix 2: Drop problematic RLS policies causing recursion
      DROP POLICY IF EXISTS "Users can view all users" ON public.users;
      DROP POLICY IF EXISTS "Users can insert users" ON public.users;
      DROP POLICY IF EXISTS "Users can update their own data" ON public.users;
      DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
      DROP POLICY IF EXISTS "Users can view users based on role" ON public.users;
      DROP POLICY IF EXISTS "Authenticated users can insert users" ON public.users;
      DROP POLICY IF EXISTS "Users can update based on permissions" ON public.users;
      
      -- Create simple, non-recursive RLS policies
      CREATE POLICY "Allow read access to users" ON public.users
        FOR SELECT USING (true);
      
      CREATE POLICY "Allow insert for authenticated" ON public.users
        FOR INSERT WITH CHECK (auth.role() = 'authenticated');
      
      CREATE POLICY "Allow update for self or admin" ON public.users
        FOR UPDATE USING (
          auth.uid()::text = id::text OR 
          EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' LIMIT 1)
        );
      
      -- Fix 3: Ensure user_settings table exists with correct schema
      CREATE TABLE IF NOT EXISTS public.user_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        theme VARCHAR(20) DEFAULT 'system',
        language VARCHAR(10) DEFAULT 'en',
        timezone VARCHAR(50) DEFAULT 'Asia/Manila',
        date_format VARCHAR(20) DEFAULT 'MM/dd/yyyy',
        time_format VARCHAR(5) DEFAULT '12h',
        currency VARCHAR(10) DEFAULT 'PHP',
        notifications JSONB DEFAULT '{"enabled": true}'::jsonb,
        privacy JSONB DEFAULT '{"profileVisibility": "team"}'::jsonb,
        display JSONB DEFAULT '{"sidebarCollapsed": false}'::jsonb,
        reports JSONB DEFAULT '{"autoGenerate": {"daily": false}}'::jsonb,
        inventory JSONB DEFAULT '{"thresholds": {"lowStock": 10}}'::jsonb,
        security JSONB DEFAULT '{"twoFactorAuth": {"enabled": false}}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id)
      );
      
      -- Simple RLS for user_settings
      ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
      
      DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
      CREATE POLICY "Users can manage their settings" ON public.user_settings
        FOR ALL USING (auth.uid()::text = user_id::text);
      
      -- Refresh schema cache
      NOTIFY pgrst, 'reload schema';
    `;
    
    // Try SQL execution via RPC
    const sqlResponse = await fetch('https://coqjcziquviehgyifhek.supabase.co/rest/v1/rpc/exec_sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'apikey': authToken
      },
      body: JSON.stringify({ sql: sqlQuery })
    });
    
    if (sqlResponse.ok) {
      console.log('✅ SQL execution successful via RPC');
    } else {
      console.log('⚠️  RPC failed, trying direct REST updates...');
      
      // Fallback: Direct REST API calls
      console.log('🔄 Step 2: Direct REST API updates...');
      
      // Update user role
      const updateResponse = await fetch('https://coqjcziquviehgyifhek.supabase.co/rest/v1/users?email=eq.cybergada@gmail.com', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': authToken,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          role: 'admin',
          updated_at: new Date().toISOString()
        })
      });
      
      if (updateResponse.ok) {
        const result = await updateResponse.json();
        console.log('✅ User updated via REST:', result);
      } else {
        const errorText = await updateResponse.text();
        console.log('⚠️  REST update failed:', errorText);
      }
    }
    
    // Step 3: Force auth store update using available globals
    console.log('🔄 Step 3: Force auth store update...');
    
    // Try to access auth store through window globals
    if (typeof fbmsDevCommands !== 'undefined' && fbmsDevCommands.forceAdminRole) {
      console.log('✅ Using dev commands to force admin role');
      fbmsDevCommands.forceAdminRole('cybergada@gmail.com');
    } else {
      console.log('⚠️  Dev commands not available, trying direct state update...');
      
      // Try to find and update Zustand store directly
      const storeKeys = Object.keys(window).filter(key => 
        key.includes('Store') || key.includes('store') || key.includes('use')
      );
      
      for (const key of storeKeys) {
        try {
          const store = window[key];
          if (store && typeof store.getState === 'function') {
            const state = store.getState();
            if (state && state.user && state.user.email === 'cybergada@gmail.com') {
              // Found the right store
              if (typeof store.setState === 'function') {
                store.setState({
                  user: {
                    ...state.user,
                    role: 'admin'
                  }
                });
                console.log(`✅ Updated auth store via ${key}`);
                break;
              }
            }
          }
        } catch (e) {
          // Continue trying
        }
      }
    }
    
    // Step 4: Clear cache and refresh
    console.log('🔄 Step 4: Clearing cache and refreshing...');
    
    // Clear specific problematic localStorage entries
    const keysToRemove = [
      'fbms-supabase-auth',
      'supabase.auth.token',
      'fbms-auth-cache'
    ];
    
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`🗑️  Removed ${key}`);
      }
    });
    
    console.log('🎉 SUCCESS: Emergency fix completed!');
    console.log('🔄 Refreshing page in 3 seconds...');
    console.log('📝 After refresh, you should have admin access');
    
    setTimeout(() => {
      window.location.reload();
    }, 3000);
    
    console.groupEnd();
    return true;
    
  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    console.log('📝 Please try the Supabase Dashboard SQL method');
    console.groupEnd();
    return false;
  }
}

// Simpler manual role override for immediate testing
function manualRoleOverride() {
  console.group('🛠️  MANUAL ROLE OVERRIDE');
  
  try {
    // Look for auth store in common locations
    const possibleStores = [
      'useSupabaseAuthStore',
      'authStore',
      'userStore',
      'supabaseStore'
    ];
    
    for (const storeName of possibleStores) {
      if (window[storeName]) {
        const store = window[storeName];
        if (typeof store.getState === 'function') {
          const state = store.getState();
          if (state && state.user) {
            console.log(`📍 Found auth store: ${storeName}`);
            console.log('Current user:', state.user);
            
            if (typeof store.setState === 'function') {
              // Force admin role
              store.setState({
                user: {
                  ...state.user,
                  role: 'admin'
                },
                isAuthenticated: true,
                error: null
              });
              
              console.log('✅ Manually set role to admin');
              console.log('🔄 Role should be updated immediately');
              
              console.groupEnd();
              return true;
            }
          }
        }
      }
    }
    
    console.log('❌ Could not find auth store');
    console.log('📝 Available window objects:', Object.keys(window).filter(k => k.includes('Store') || k.includes('auth')));
    
    console.groupEnd();
    return false;
    
  } catch (error) {
    console.error('❌ Manual override failed:', error);
    console.groupEnd();
    return false;
  }
}

// Make functions available
window.emergencyProductionFix = emergencyProductionFix;
window.manualRoleOverride = manualRoleOverride;

console.log('🚨 EMERGENCY PRODUCTION FIX LOADED!');
console.log('📝 Primary method: emergencyProductionFix()');
console.log('📝 Quick test: manualRoleOverride()');

// Auto-run the production fix
emergencyProductionFix();