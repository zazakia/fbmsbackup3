import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, supabaseAnon } from '../utils/supabase';
import { AuthState, User, LoginCredentials, RegisterData } from '../types/auth';

interface SupabaseAuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
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

export const useSupabaseAuthStore = create<SupabaseAuthStore>()(
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
            throw new Error(error.message);
          }

          if (data.user) {
            // Get user profile from our users table
            const { data: userProfile, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('email', data.user.email)
              .single();

            let user: User;
            if (userProfile && !profileError) {
              user = {
                id: userProfile.id,
                email: userProfile.email,
                firstName: userProfile.first_name,
                lastName: userProfile.last_name,
                role: userProfile.role as User['role'],
                department: userProfile.department,
                isActive: userProfile.is_active,
                createdAt: new Date(userProfile.created_at),
              };
            } else {
              // Create basic user from auth data
              console.warn('User profile not found in database, creating basic user object');
              user = {
                id: data.user.id,
                email: data.user.email || '',
                firstName: data.user.user_metadata?.first_name || '',
                lastName: data.user.user_metadata?.last_name || '',
                role: 'cashier', // Default to lowest privilege role
                isActive: true,
                createdAt: new Date(),
              };
            }

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              hasLoggedOut: false
            });
          }
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed'
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
              }
            }
          });

          if (authError) {
            throw new Error(authError.message);
          }

          if (authData.user) {
            // Create user profile in our users table
            const { error: profileError } = await supabase
              .from('users')
              .insert({
                id: authData.user.id,
                email: authData.user.email,
                first_name: data.firstName,
                last_name: data.lastName,
                role: data.role || 'user',
                department: data.department,
                is_active: true,
              });

            if (profileError) {
              console.warn('Failed to create user profile:', profileError.message);
            }

            const user: User = {
              id: authData.user.id,
              email: authData.user.email || '',
              firstName: data.firstName,
              lastName: data.lastName,
              role: data.role || 'cashier', // Default to lowest privilege role
              department: data.department,
              isActive: true,
              createdAt: new Date(),
            };

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              hasLoggedOut: false
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
          // Sign out from Supabase
          const { error } = await supabaseAnon.auth.signOut();
          
          if (error) {
            console.warn('Supabase logout error:', error.message);
          }
          
          // Clear all auth state
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            hasLoggedOut: true
          });
          
          // Clear persisted state
          localStorage.removeItem('fbms-supabase-auth');
          
          // Clear any other stored auth data
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.clear();
          
          console.log('Logout successful');
          
        } catch (error) {
          console.error('Logout error:', error);
          
          // Force logout locally even if Supabase call fails
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            hasLoggedOut: true
          });
          
          // Clear persisted state
          localStorage.removeItem('fbms-supabase-auth');
          
          // Clear any other stored auth data
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.clear();
          
          console.log('Forced local logout completed');
        }
      },

      checkAuth: async () => {
        try {
          const { data: { session }, error } = await supabaseAnon.auth.getSession();
          
          if (error) {
            throw new Error(error.message);
          }

          if (session?.user) {
            // Get user profile
            const { data: userProfile, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('email', session.user.email)
              .single();

            let user: User;
            if (userProfile && !profileError) {
              user = {
                id: userProfile.id,
                email: userProfile.email,
                firstName: userProfile.first_name,
                lastName: userProfile.last_name,
                role: userProfile.role as User['role'],
                department: userProfile.department,
                isActive: userProfile.is_active,
                createdAt: new Date(userProfile.created_at),
              };
            } else {
              console.warn('User profile not found in database during auth check');
              user = {
                id: session.user.id,
                email: session.user.email || '',
                firstName: session.user.user_metadata?.first_name || '',
                lastName: session.user.user_metadata?.last_name || '',
                role: 'cashier', // Default to lowest privilege role
                isActive: true,
                createdAt: new Date(),
              };
            }

            set({
              user,
              isAuthenticated: true,
              error: null,
              hasLoggedOut: false
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

      // Enhanced authentication methods
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
          
          // Note: The actual login will be handled by the auth state change listener
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
          
          // Note: The actual login will be handled by the auth state change listener
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
          
          // Update user profile in our users table
          const { error: profileError } = await supabase
            .from('users')
            .update({
              first_name: profile.firstName,
              last_name: profile.lastName,
              department: profile.department,
            })
            .eq('id', currentUser.id);
          
          if (profileError) {
            throw new Error(profileError.message);
          }
          
          // Update local state
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
          
          // First verify current password by attempting to sign in
          const { error: signInError } = await supabaseAnon.auth.signInWithPassword({
            email: currentUser.email,
            password: currentPassword,
          });
          
          if (signInError) {
            throw new Error('Current password is incorrect');
          }
          
          // Update password
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
      name: 'fbms-supabase-auth',
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

// Set up auth state listener
supabaseAnon.auth.onAuthStateChange((event, session) => {
  const store = useSupabaseAuthStore.getState();
  
  console.log('Auth state change:', event, !!session);
  
  if (event === 'SIGNED_OUT' || !session) {
    // Only clear state, don't call logout() to avoid infinite loop
    store.clearError();
    useSupabaseAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      hasLoggedOut: true
    });
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    store.checkAuth();
    
    // If this is an OAuth login, we need to create user profile if it doesn't exist
    if (event === 'SIGNED_IN' && session?.user?.app_metadata?.provider !== 'email') {
      // Handle OAuth user profile creation
      const handleOAuthProfile = async () => {
        if (!session?.user) return;
        
        // Check if user profile exists
        const { data: existingProfile } = await supabase
          .from('users')
          .select('id')
          .eq('id', session.user.id)
          .single();
        
        if (!existingProfile) {
          // Create user profile for OAuth user
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: session.user.id,
              email: session.user.email,
              first_name: session.user.user_metadata?.first_name || 
                         session.user.user_metadata?.full_name?.split(' ')[0] || '',
              last_name: session.user.user_metadata?.last_name || 
                        session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
              role: 'cashier', // Default role for OAuth users
              is_active: true,
            });
          
          if (profileError) {
            console.warn('Failed to create OAuth user profile:', profileError.message);
          }
        }
      };
      
      handleOAuthProfile();
    }
  }
});