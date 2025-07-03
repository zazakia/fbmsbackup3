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
            error: null
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
            error: null
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
  
  console.log('Auth state change:', event, !!session);
  
  if (event === 'SIGNED_OUT' || !session) {
    // Only clear state, don't call logout() to avoid infinite loop
    store.clearError();
    useSupabaseAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    store.checkAuth();
  }
});