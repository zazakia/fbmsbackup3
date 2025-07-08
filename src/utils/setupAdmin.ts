// import { supabaseAnon } from './supabase'; // Disabled for security

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
  // SECURITY: Remove hardcoded credentials - this is a critical security vulnerability
  console.error('❌ SECURITY WARNING: Automatic admin setup is disabled for security reasons');
  console.log('🔒 To create admin accounts:');
  console.log('1. Register manually through the application');
  console.log('2. Contact your system administrator');
  console.log('3. Use database admin tools to update user roles');
  
  return {
    success: false,
    message: 'Automatic admin setup disabled for security. Please create admin accounts manually.'
  };
}

export async function createAdminAccountIfNeeded(): Promise<void> {
  // SECURITY: Disable automatic admin setup completely
  console.log('🔒 Admin account auto-setup is disabled for security reasons');
  console.log('📝 Use proper user registration and database role assignment instead');
  
  // Clean up any existing setup flags
  localStorage.removeItem('setup-admin');
  
  return;
}

// Manual function to trigger admin setup - DISABLED
export async function triggerAdminSetup(): Promise<AdminSetupResult> {
  console.error('❌ Manual admin setup is disabled for security reasons');
  return {
    success: false,
    message: 'Manual admin setup disabled. Use proper user registration and database role assignment.'
  };
}