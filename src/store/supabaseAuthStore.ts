import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, supabaseAnon } from '../utils/supabase';
import { AuthState, User, LoginCredentials, RegisterData, UserRole } from '../types/auth';

interface SupabaseAuthStore extends AuthState {
  // Derived/auth convenience field
  userRole: UserRole | null;
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

export const useSupabaseAuthStore = create<SupabaseAuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      userRole: null,
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
            // Handle different types of auth errors
            if (error.message.includes('Invalid login credentials')) {
              throw new Error('Invalid email or password. Please check your credentials and try again.');
            }
            if (error.message.includes('Email not confirmed')) {
              throw new Error('Please check your email and click the confirmation link before signing in.');
            }
            if (error.message.includes('User not found') || 
                error.message.includes('Signup not allowed') ||
                error.message.includes('User does not exist')) {
              throw new Error('UNREGISTERED_USER');
            }
            throw new Error(error.message);
          }

          if (data.user) {
            // Get user profile from our users table
            const { data: userProfile, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('email', data.user.email)
              .maybeSingle();

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
              // Profile not found or error fetching it. This should ideally not happen if the trigger works.
              console.warn(
                `User profile not found in public.users for email ${data.user.email} or error fetching:`,
                profileError?.message
              );
              
              // Create basic user from auth data and insert into database as fallback
              console.warn('User profile not found in database, creating user profile...');
              
              // SECURITY: Remove automatic admin role assignment based on email
              // All new users default to lowest privilege role
              const email = data.user.email || '';
              
              const newUserData = {
                id: data.user.id,
                email: email,
                first_name: data.user.user_metadata?.first_name || '',
                last_name: data.user.user_metadata?.last_name || '',
                role: 'employee', // Default to lowest privilege role for security
                is_active: true,
              };

              // Try to create the user profile in the database
              try {
                const { error: insertError } = await supabase
                  .from('users')
                  .insert(newUserData);

                if (insertError) {
                  console.warn('Failed to create user profile in database:', insertError.message);
                } else {
                  console.log('✅ User profile created successfully in database');
                }
              } catch (insertError) {
                console.warn('Error creating user profile:', insertError);
              }
              user = {
                id: data.user.id,
                email: email,
                firstName: data.user.user_metadata?.first_name || '',
                lastName: data.user.user_metadata?.last_name || '',
                role: 'employee', // Default to lowest privilege role for security
                isActive: true,
                createdAt: new Date(),
              };
            }

            // Check if email is verified or if user exists in our database (existing users)
            const isEmailVerified = data.user.email_confirmed_at !== null || userProfile;
            
            set({
              user,
              userRole: user.role,
              isAuthenticated: isEmailVerified,
              isLoading: false,
              error: null,
              hasLoggedOut: false,
              pendingEmailVerification: !isEmailVerified
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error && error.message === 'UNREGISTERED_USER' 
            ? 'Email not registered. Please sign up first.' 
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
            // Check if email is verified (new users need verification)
            const isEmailVerified = authData.user.email_confirmed_at !== null;
            
            // The trigger 'on_auth_user_created' is now responsible for creating the user profile in public.users.
            try {
              const { error: profileError } = await supabase
                .from('users')
                .insert({
                  id: authData.user.id,
                  email: authData.user.email,
                  first_name: data.firstName,
                  last_name: data.lastName,
                  role: data.role || 'cashier',
                  department: data.department,
                  is_active: true,
                });
              
              if (profileError && !profileError.message.includes('duplicate key')) {
                console.warn('Failed to create user profile:', profileError.message);
              }
            } catch (error) {
              console.warn('Error creating user profile during registration:', error);
            }

            // if (profileError) { // This block is removed
            //   console.warn('Failed to create user profile:', profileError.message);
            // }

            const user: User = { // Construct user from signup data for immediate state update
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
              userRole: user.role,
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
          // Import enhanced logout dynamically to avoid circular dependencies
          const { enhancedLogout } = await import('../utils/logoutFix');
          
          const result = await enhancedLogout();
          
          if (!result.success && result.errors) {
            console.warn('Logout completed with issues:', result.errors);
          }
          
          // The enhanced logout already sets the auth state, but ensure it's set
          set({
            user: null,
            userRole: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            hasLoggedOut: true,
            pendingEmailVerification: false,
            passwordResetSent: false
          });
          
          console.log('Enhanced logout completed:', result.message);
          
        } catch (error) {
          console.error('Enhanced logout failed, falling back to basic logout:', error);
          
          // Fallback to basic logout if enhanced logout fails
          try {
            const { error: signOutError } = await supabaseAnon.auth.signOut();
            if (signOutError) {
              console.warn('Basic logout Supabase error:', signOutError.message);
            }
          } catch (basicError) {
            console.warn('Basic logout also failed:', basicError);
          }
          
          // Force clear auth state regardless
          set({
            user: null,
            userRole: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            hasLoggedOut: true,
            pendingEmailVerification: false,
            passwordResetSent: false
          });
          
          // Clear storage
          try {
            localStorage.removeItem('fbms-supabase-auth');
            localStorage.removeItem('supabase.auth.token');
            sessionStorage.clear();
          } catch (storageError) {
            console.warn('Storage cleanup failed:', storageError);
          }
          
          console.log('Fallback logout completed');
        }
      },

      checkAuth: async () => {
        // Prevent re-checking if already in progress
        const currentState = get();
        if (currentState.isLoading) {
          console.log('Auth check already in progress, skipping...');
          return;
        }

        set({ isLoading: true });

        try {
          const { data: { session }, error } = await supabaseAnon.auth.getSession();

          if (error) {
            // Check if it's a JWT expired error
            if (error.message.includes('JWT expired') || error.message.includes('jwt expired')) {
              console.warn('🔄 JWT expired during auth check, clearing session...');
              // Clear invalid tokens and trigger logout
              await get().logout();
              return;
            }
            throw new Error(error.message);
          }

          if (session?.user) {
            // Check if session is expired
            const now = Math.floor(Date.now() / 1000);
            if (session.expires_at && session.expires_at < now) {
              console.warn('🔄 Session expired, clearing session...');
              await get().logout();
              return;
            }

            // Get user profile - try by ID first, then by email
            let userProfile, profileError;

            try {
              // First try by ID
              const idResult = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

              if (idResult.data) {
                userProfile = idResult.data;
                profileError = idResult.error;
              } else {
                // Fallback: try by email
                const emailResult = await supabase
                  .from('users')
                  .select('*')
                  .eq('email', session.user.email)
                  .maybeSingle();

                userProfile = emailResult.data;
                profileError = emailResult.error;
              }
            } catch (profileFetchError: any) {
              // Handle JWT expired errors during profile fetch
              if (profileFetchError.message?.includes('JWT expired') ||
                  profileFetchError.message?.includes('jwt expired')) {
                console.warn('🔄 JWT expired during profile fetch, clearing session...');
                await get().logout();
                return;
              }
              profileError = profileFetchError;
            }

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
              // Profile not found or error fetching it. This should ideally not happen if the trigger works.
              console.warn(
                `User profile not found in public.users for email ${session.user.email} or error fetching:`,
                profileError?.message
              );

              console.warn('User profile not found in database during auth check, creating user profile...');

              // SECURITY: Remove automatic admin role assignment based on email
              // All new users default to lowest privilege role
              const email = session.user.email || '';

              const newUserData = {
                id: session.user.id,
                email: email,
                first_name: session.user.user_metadata?.first_name || '',
                last_name: session.user.user_metadata?.last_name || '',
                role: 'employee', // Default to lowest privilege role for security
                is_active: true,
              };

              // Try to create the user profile in the database
              try {
                const { error: insertError } = await supabase
                  .from('users')
                  .insert(newUserData);

                if (insertError) {
                  console.warn('Failed to create user profile in database during auth check:', insertError.message);
                } else {
                  console.log('✅ User profile created successfully in database during auth check');
                }
              } catch (insertError) {
                console.warn('Error creating user profile during auth check:', insertError);
              }
              user = {
                id: session.user.id,
                email: email,
                firstName: session.user.user_metadata?.first_name || '',
                lastName: session.user.user_metadata?.last_name || '',
                role: 'employee', // Default to lowest privilege role for security
                isActive: true,
                createdAt: new Date(),
              };
            }

            // Check if email is verified or if user exists in our database (existing users)
            const isEmailVerified = session.user.email_confirmed_at !== null || userProfile;

            set({
              user,
              userRole: user.role,
              isAuthenticated: isEmailVerified,
              isLoading: false,
              error: null,
              hasLoggedOut: false,
              pendingEmailVerification: !isEmailVerified
            });
          } else {
            set({
              user: null,
              userRole: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
              hasLoggedOut: false
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Authentication check failed';

          // Handle JWT expired errors
          if (errorMessage.includes('JWT expired') || errorMessage.includes('jwt expired')) {
            console.warn('🔄 JWT expired during auth check, clearing session...');
            await get().logout();
            return;
          }

          set({
            user: null,
            userRole: null,
            isAuthenticated: false,
            isLoading: false,
            error: errorMessage,
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
        userRole: state.userRole,
        isAuthenticated: state.isAuthenticated,
        hasLoggedOut: state.hasLoggedOut,
        pendingEmailVerification: state.pendingEmailVerification,
        passwordResetSent: state.passwordResetSent
      })
    }
  )
);

// Set up auth state listener with enhanced logout handling and debouncing
let isProcessingAuthChange = false;
let authChangeTimeout: NodeJS.Timeout | null = null;
let lastProcessedEvent: string | null = null;
let eventQueue: Array<{ event: string; session: any; timestamp: number }> = [];

const processQueuedEvents = async () => {
  if (eventQueue.length === 0 || isProcessingAuthChange) return;

  // Process only the most recent event to avoid duplicate processing
  const latestEvent = eventQueue[eventQueue.length - 1];
  eventQueue = []; // Clear queue

  await processAuthEvent(latestEvent.event, latestEvent.session);
};

const processAuthEvent = async (event: string, session: any) => {
  // Prevent duplicate processing of the same event
  if (lastProcessedEvent === `${event}-${session?.user?.id || 'no-user'}-${Date.now()}`) {
    console.log('⏭️ Skipping duplicate auth event:', event);
    return;
  }

  lastProcessedEvent = `${event}-${session?.user?.id || 'no-user'}-${Date.now()}`;

  const store = useSupabaseAuthStore.getState();

  console.log('🔄 Auth state change:', event, !!session);

  try {
    if (event === 'SIGNED_OUT' || !session) {
      // Handle logout - prevent infinite loops by checking current state
      if (!store.hasLoggedOut || store.isAuthenticated) {
        console.log('🚪 Processing SIGNED_OUT event...');

        // Clear error state first
        store.clearError();

        // Set the logged out state
        useSupabaseAuthStore.setState({
          user: null,
          userRole: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
          hasLoggedOut: true,
          pendingEmailVerification: false
        });

        // Dispatch logout event for other components to react
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('auth:signed-out', {
            detail: { timestamp: new Date().toISOString() }
          }));
        }

        console.log('✅ SIGNED_OUT processed successfully');
      } else {
        console.log('🔄 Already logged out, skipping SIGNED_OUT processing');
      }

    } else if (event === 'TOKEN_REFRESHED') {
      // Handle successful token refresh - debounce to avoid excessive API calls
      console.log('✅ Token refreshed successfully');

      // Only refresh if we're currently authenticated and not in a logout state
      if (store.isAuthenticated && !store.hasLoggedOut && !store.isLoading) {
        // Debounce the auth check to prevent multiple simultaneous calls
        if (authChangeTimeout) clearTimeout(authChangeTimeout);
        authChangeTimeout = setTimeout(async () => {
          try {
            await store.refreshUser();
          } catch (refreshError) {
            console.warn('⚠️ Auth refresh failed after token refresh:', refreshError);
          }
        }, 500); // 500ms debounce
      }

    } else if (event === 'SIGNED_IN') {
      console.log('🔑 Processing SIGNED_IN event...');

      // Reset any logout state
      useSupabaseAuthStore.setState({ hasLoggedOut: false });

      // Check auth to populate user data with debouncing
      if (authChangeTimeout) clearTimeout(authChangeTimeout);
      authChangeTimeout = setTimeout(async () => {
        try {
          await store.checkAuth();
        } catch (signInError) {
          console.error('❌ Auth check failed after sign in:', signInError);
        }
      }, 300); // 300ms debounce

      // Handle OAuth user profile creation for non-email providers
      if (session?.user?.app_metadata?.provider !== 'email') {
        const handleOAuthProfile = async () => {
          if (!session?.user) return;

          try {
            // Check if user profile exists
            const { data: existingProfile } = await supabase
              .from('users')
              .select('id')
              .eq('id', session.user.id)
              .maybeSingle();

            if (!existingProfile) {
              console.log('🆕 Creating OAuth user profile...');

              // Create user profile for OAuth user - SECURITY: No automatic admin assignment
              const email = session.user.email || '';

              const { error: profileError } = await supabase
                .from('users')
                .insert({
                  id: session.user.id,
                  email: email,
                  first_name: session.user.user_metadata?.first_name ||
                            session.user.user_metadata?.full_name?.split(' ')[0] || '',
                  last_name: session.user.user_metadata?.last_name ||
                           session.user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
                  role: 'employee', // Default to lowest privilege role for security
                  is_active: true,
                });

              if (profileError) {
                console.warn('⚠️ Failed to create OAuth user profile:', profileError.message);
              } else {
                console.log('✅ OAuth user profile created successfully');
              }
            }
          } catch (oauthError) {
            console.warn('⚠️ OAuth profile handling error:', oauthError);
          }
        };

        // Handle OAuth profile creation without blocking
        handleOAuthProfile();
      }

      console.log('✅ SIGNED_IN processed successfully');

    } else {
      console.log('🔄 Unknown auth event:', event);
    }

  } catch (authError) {
    console.error('🚨 Auth state change error:', authError);

    // If there's an error, ensure we don't get stuck in loading state
    if (store.isLoading) {
      useSupabaseAuthStore.setState({ isLoading: false });
    }

  }
};

supabaseAnon.auth.onAuthStateChange(async (event, session) => {
  // Queue the event for processing
  eventQueue.push({ event, session, timestamp: Date.now() });

  // Process events with debouncing
  if (authChangeTimeout) clearTimeout(authChangeTimeout);
  authChangeTimeout = setTimeout(processQueuedEvents, 100);
});
