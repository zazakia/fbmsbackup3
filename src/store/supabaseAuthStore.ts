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
}

export const useSupabaseAuthStore = create<SupabaseAuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        
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
              // Profile not found or error fetching it. This should ideally not happen if the trigger works.
              console.warn(
                `User profile not found in public.users for email ${data.user.email} or error fetching:`,
                profileError?.message
              );
              // Fallback to auth metadata, but this might indicate an issue with profile creation.
              user = {
                id: data.user.id,
                email: data.user.email || '',
                firstName: data.user.user_metadata?.first_name || '',
                lastName: data.user.user_metadata?.last_name || '',
                role: 'user', // Default role, actual role should come from public.users
                isActive: true,
                createdAt: new Date(),
              };
            }

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null
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
        set({ isLoading: true, error: null });
        
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
            // The trigger 'on_auth_user_created' is now responsible for creating the user profile in public.users.
            // We no longer insert directly from the client here.
            // We'll immediately set the auth state with data from the signup,
            // and subsequent profile fetches (e.g., in checkAuth or page loads) will get the full profile.

            // if (profileError) { // This block is removed
            //   console.warn('Failed to create user profile:', profileError.message);
            // }

            const user: User = { // Construct user from signup data for immediate state update
              id: authData.user.id,
              email: authData.user.email || '',
              firstName: data.firstName,
              lastName: data.lastName,
              role: data.role || 'user',
              department: data.department,
              isActive: true,
              createdAt: new Date(),
            };

            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null
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
        try {
          await supabaseAnon.auth.signOut();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
        } catch (error) {
          console.error('Logout error:', error);
          // Force logout locally even if Supabase call fails
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
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
              // Profile not found or error fetching it. This should ideally not happen if the trigger works.
              console.warn(
                `User profile not found in public.users for email ${session.user.email} or error fetching:`,
                profileError?.message
              );
              // Fallback to auth metadata, but this might indicate an issue with profile creation.
              user = {
                id: session.user.id,
                email: session.user.email || '',
                firstName: session.user.user_metadata?.first_name || '',
                lastName: session.user.user_metadata?.last_name || '',
                role: 'user', // Default role, actual role should come from public.users
                isActive: true,
                createdAt: new Date(),
              };
            }

            set({
              user,
              isAuthenticated: true,
              error: null
            });
          } else {
            set({
              user: null,
              isAuthenticated: false,
              error: null
            });
          }
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            error: error instanceof Error ? error.message : 'Authentication check failed'
          });
        }
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'fbms-supabase-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

// Set up auth state listener
supabaseAnon.auth.onAuthStateChange((event, session) => {
  const store = useSupabaseAuthStore.getState();
  
  if (event === 'SIGNED_OUT' || !session) {
    store.logout();
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    store.checkAuth();
  }
});