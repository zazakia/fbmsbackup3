import { supabaseAnon } from './supabase';

export interface AdminSetupResult {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email?: string;
    [key: string]: unknown;
  };
}

export async function setupAdminAccount(): Promise<AdminSetupResult> {
  const adminEmail = 'admin@fbms.com';
  const adminPassword = 'Qweasd145698@';
  
  try {
    console.log('Setting up admin account...');
    
    // First, check if admin already exists
    const { data: existingUser } = await supabaseAnon.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });
    
    if (existingUser.user) {
      console.log('Admin account already exists and is accessible');
      await supabaseAnon.auth.signOut(); // Sign out after check
      return {
        success: true,
        message: 'Admin account already exists and is ready to use',
        user: existingUser.user
      };
    }
    
  } catch (error) {
    console.log('Admin account does not exist or credentials are incorrect, creating new account...');
  }
  
  try {
    // Create new admin account
    const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          first_name: 'System',
          last_name: 'Administrator',
        },
        emailRedirectTo: undefined // Skip email confirmation for admin
      }
    });

    if (authError) {
      console.error('Failed to create admin auth account:', authError.message);
      return {
        success: false,
        message: `Failed to create admin account: ${authError.message}`
      };
    }

    if (!authData.user) {
      return {
        success: false,
        message: 'Failed to create admin account: No user data returned'
      };
    }

    console.log('Admin auth account created successfully');

    // Wait a moment for auth to settle
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create or update admin profile in users table
    try {
      const { error: profileError } = await supabaseAnon
        .from('users')
        .upsert({
          id: authData.user.id,
          email: adminEmail,
          first_name: 'System',
          last_name: 'Administrator',
          role: 'admin',
          department: 'Administration',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (profileError) {
        console.warn('Failed to create admin profile, but auth account exists:', profileError.message);
        // Continue anyway as the auth account was created
      } else {
        console.log('Admin profile created successfully');
      }
    } catch (profileError) {
      console.warn('Error creating admin profile:', profileError);
      // Continue anyway as the auth account was created
    }

    // Sign out after creation
    await supabaseAnon.auth.signOut();

    return {
      success: true,
      message: 'Admin account created successfully! You can now log in with admin@fbms.com',
      user: authData.user
    };

  } catch (error) {
    console.error('Error setting up admin account:', error);
    return {
      success: false,
      message: `Error setting up admin account: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

export async function createAdminAccountIfNeeded(): Promise<void> {
  // Only run in development mode or if explicitly requested
  if (import.meta.env.DEV || localStorage.getItem('setup-admin') === 'true') {
    try {
      const result = await setupAdminAccount();
      if (result.success) {
        console.log('✅ Admin account setup:', result.message);
        localStorage.removeItem('setup-admin'); // Remove flag after successful setup
      } else {
        console.error('❌ Admin account setup failed:', result.message);
      }
    } catch (error) {
      console.error('❌ Error during admin account setup:', error);
    }
  }
}

// Manual function to trigger admin setup
export async function triggerAdminSetup(): Promise<AdminSetupResult> {
  localStorage.setItem('setup-admin', 'true');
  return await setupAdminAccount();
}