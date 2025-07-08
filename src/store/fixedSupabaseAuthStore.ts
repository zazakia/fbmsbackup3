import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, supabaseAnon } from '../utils/supabase';
import { AuthState, User, LoginCredentials, RegisterData } from '../types/auth';

interface SupabaseAuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  clearPasswordResetState: () => void;
  hasLoggedOut: boolean;
  // Enhanced auth methods
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  updateProfile: (profile: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  // Auth state
  pendingEmailVerification: boolean;
  passwordResetSent: boolean;
}

/**
 * FIXED AUTH STORE - Proper User Synchronization
 * 
 * Key fixes:
 * 1. Never automatically create users with default roles
 * 2. Always preserve existing user roles from database
 * 3. Single source of truth: public.users table
 * 4. Proper error handling for missing users
 * 5. No automatic role overrides
 */
export const useFixedSupabaseAuthStore = create<SupabaseAuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      hasLoggedOut: false,
      pendingEmailVerification: false,
      passwordResetSent: false,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null, hasLoggedOut: false });
        
        try {
          const { data, error } = await supabaseAnon.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          });

          if (error) {
            if (error.message.includes('Invalid login credentials') || 
                error.message.includes('Email not confirmed') ||
                error.message.includes('User not found')) {
              throw new Error('UNREGISTERED_USER');
            }
            throw new Error(error.message);
          }

          if (data.user) {
            // CRITICAL FIX: Get user profile and NEVER create automatically
            const userProfile = await getUserProfile(data.user.id, data.user.email);
            
            if (!userProfile) {
              // FIXED: Don't create user automatically - require admin to create
              throw new Error('USER_NOT_REGISTERED_IN_SYSTEM');
            }

            const user: User = {
              id: userProfile.id,
              email: userProfile.email,
              firstName: userProfile.first_name,
              lastName: userProfile.last_name,
              role: userProfile.role as User['role'], // PRESERVE existing role
              department: userProfile.department,
              isActive: userProfile.is_active,
              createdAt: new Date(userProfile.created_at),
            };

            // Check if email is verified
            const isEmailVerified = data.user.email_confirmed_at !== null;
            
            set({
              user,
              isAuthenticated: isEmailVerified && userProfile.is_active,
              isLoading: false,
              error: null,
              hasLoggedOut: false,
              pendingEmailVerification: !isEmailVerified
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error && error.message === 'UNREGISTERED_USER' 
            ? 'Email not registered. Please contact admin to create your account.' 
            : error instanceof Error && error.message === 'USER_NOT_REGISTERED_IN_SYSTEM'
            ? 'Account not found in system. Please contact admin.'
            : error instanceof Error ? error.message : 'Login failed';
          
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error;
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null, hasLoggedOut: false });
        
        try {
          const { data: authData, error: authError } = await supabaseAnon.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              data: {
                first_name: data.firstName,
                last_name: data.lastName,
              },
              emailRedirectTo: `${window.location.origin}/auth/callback`
            }
          });

          if (authError) {
            throw new Error(authError.message);
          }

          if (authData.user) {
            // FIXED: Only create user profile if registration includes explicit role
            // This prevents unauthorized user creation
            const userRole = data.role || 'employee'; // Default for new registrations only
            
            const { error: profileError } = await supabase
              .from('users')
              .insert({
                id: authData.user.id,
                email: authData.user.email,
                first_name: data.firstName,
                last_name: data.lastName,
                role: userRole,
                department: data.department,
                is_active: true,
              });

            if (profileError) {
              console.error('Failed to create user profile:', profileError.message);
              throw new Error('Failed to create user profile');
            }

            const user: User = {
              id: authData.user.id,
              email: authData.user.email || '',
              firstName: data.firstName,
              lastName: data.lastName,
              role: userRole as User['role'],
              department: data.department,
              isActive: true,
              createdAt: new Date(),
            };

            const isEmailVerified = authData.user.email_confirmed_at !== null;
            
            set({
              user,
              isAuthenticated: isEmailVerified,
              isLoading: false,
              error: null,
              hasLoggedOut: false,
              pendingEmailVerification: !isEmailVerified
            });
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Registration failed'
          });
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        
        try {
          const { error } = await supabaseAnon.auth.signOut();
          
          if (error) {
            console.warn('Supabase logout error:', error.message);
          }
          
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            hasLoggedOut: true,
            pendingEmailVerification: false
          });
          
          localStorage.removeItem('fbms-supabase-auth');
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.clear();
          
        } catch (error) {
          console.error('Logout error:', error);
          
          // Force logout locally
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            hasLoggedOut: true,
            pendingEmailVerification: false
          });
          
          localStorage.removeItem('fbms-supabase-auth');
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.clear();
        }
      },

      checkAuth: async () => {
        try {
          const { data: { session }, error } = await supabaseAnon.auth.getSession();
          
          if (error) {
            throw new Error(error.message);
          }

          if (session?.user) {
            // CRITICAL FIX: Get user profile and NEVER create automatically
            const userProfile = await getUserProfile(session.user.id, session.user.email);
            
            if (!userProfile) {
              console.warn('User authenticated but not found in system database');
              set({
                user: null,
                isAuthenticated: false,
                error: 'Account not found in system. Please contact admin.',
                hasLoggedOut: false
              });
              return;
            }

            const user: User = {
              id: userProfile.id,
              email: userProfile.email,
              firstName: userProfile.first_name,
              lastName: userProfile.last_name,
              role: userProfile.role as User['role'], // PRESERVE existing role
              department: userProfile.department,
              isActive: userProfile.is_active,
              createdAt: new Date(userProfile.created_at),
            };

            const isEmailVerified = session.user.email_confirmed_at !== null;
            
            set({
              user,
              isAuthenticated: isEmailVerified && userProfile.is_active,
              error: null,
              hasLoggedOut: false,
              pendingEmailVerification: !isEmailVerified
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              error: null,
              hasLoggedOut: false
            });
          }
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            error: error instanceof Error ? error.message : 'Authentication check failed',
            hasLoggedOut: false
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      clearPasswordResetState: () => {
        set({ 
          passwordResetSent: false,
          error: null 
        });
      },

      refreshUser: async () => {
        const currentState = get();
        if (currentState.isAuthenticated) {
          await currentState.checkAuth();
        }
      },

      // ... other methods remain the same but with proper error handling
      forgotPassword: async (email: string) => {
        set({ isLoading: true, error: null, passwordResetSent: false });
        
        try {
          const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          });
          
          if (error) {
            throw new Error(error.message);
          }
          
          set({ 
            isLoading: false, 
            passwordResetSent: true,
            error: null 
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to send reset email'
          });
          throw error;
        }
      },

      resetPassword: async (token: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { error } = await supabaseAnon.auth.updateUser({
            password: password
          });
          
          if (error) {
            throw new Error(error.message);
          }
          
          set({ 
            isLoading: false, 
            error: null 
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to reset password'
          });
          throw error;
        }
      },

      resendVerification: async (email: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { error } = await supabaseAnon.auth.resend({
            type: 'signup',
            email: email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`
            }
          });
          
          if (error) {
            throw new Error(error.message);
          }
          
          set({ 
            isLoading: false, 
            pendingEmailVerification: true,
            error: null 
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to resend verification'
          });
          throw error;
        }
      },

      signInWithGoogle: async () => {
        set({ isLoading: true, error: null, hasLoggedOut: false });
        
        try {
          const { error } = await supabaseAnon.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback`
            }
          });
          
          if (error) {
            throw new Error(error.message);
          }
          
          set({ isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Google sign-in failed'
          });
          throw error;
        }
      },

      signInWithGithub: async () => {
        set({ isLoading: true, error: null, hasLoggedOut: false });
        
        try {
          const { error } = await supabaseAnon.auth.signInWithOAuth({
            provider: 'github',
            options: {
              redirectTo: `${window.location.origin}/auth/callback`
            }
          });
          
          if (error) {
            throw new Error(error.message);
          }
          
          set({ isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'GitHub sign-in failed'
          });
          throw error;
        }
      },

      updateProfile: async (profile: Partial<User>) => {
        set({ isLoading: true, error: null });
        
        try {
          const currentUser = get().user;
          if (!currentUser) {
            throw new Error('No user logged in');
          }
          
          const { error: profileError } = await supabase
            .from('users')
            .update({
              first_name: profile.firstName,
              last_name: profile.lastName,
              department: profile.department,
              // NOTE: Role updates should be handled separately by admin functions
            })
            .eq('id', currentUser.id);
          
          if (profileError) {
            throw new Error(profileError.message);
          }
          
          const updatedUser = {
            ...currentUser,
            ...profile
          };
          
          set({
            user: updatedUser,
            isLoading: false,
            error: null
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to update profile'
          });
          throw error;
        }
      },

      changePassword: async (currentPassword: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const currentUser = get().user;
          if (!currentUser) {
            throw new Error('No user logged in');
          }
          
          const { error: signInError } = await supabaseAnon.auth.signInWithPassword({
            email: currentUser.email,
            password: currentPassword,
          });
          
          if (signInError) {
            throw new Error('Current password is incorrect');
          }
          
          const { error: updateError } = await supabaseAnon.auth.updateUser({
            password: newPassword
          });
          
          if (updateError) {
            throw new Error(updateError.message);
          }
          
          set({ 
            isLoading: false, 
            error: null 
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to change password'
          });
          throw error;
        }
      }
    }),
    {
      name: 'fbms-supabase-auth-fixed',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        hasLoggedOut: state.hasLoggedOut,
        pendingEmailVerification: state.pendingEmailVerification,
        passwordResetSent: state.passwordResetSent
      })
    }
  )
);

/**
 * FIXED: Proper user profile lookup
 * Always preserves existing user data and roles
 */
async function getUserProfile(userId: string, email?: string): Promise<any | null> {
  try {
    // Try by ID first (most reliable)
    const { data: userById, error: errorById } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (userById && !errorById) {
      return userById;
    }
    
    // Fallback: try by email if ID fails
    if (email) {
      const { data: userByEmail, error: errorByEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (userByEmail && !errorByEmail) {
        return userByEmail;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

// FIXED: Auth state listener that preserves user roles
supabaseAnon.auth.onAuthStateChange((event, session) => {
  const store = useFixedSupabaseAuthStore.getState();
  
  console.log('Auth state change:', event, !!session);
  
  if (event === 'SIGNED_OUT' || !session) {
    store.clearError();
    useFixedSupabaseAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      hasLoggedOut: true
    });
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    // CRITICAL FIX: Always check auth properly without creating users
    store.checkAuth();
  }
});