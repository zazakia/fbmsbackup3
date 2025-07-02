import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, User, LoginCredentials, RegisterData } from '../types/auth';
import { authenticateUser, registerUser, verifyToken, getUserById } from '../utils/auth';

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        
        try {
          const { user, token } = await authenticateUser(credentials);
          
          // Store token in localStorage
          localStorage.setItem('fbms_token', token);
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
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
          const { user, token } = await registerUser(data);
          
          // Store token in localStorage
          localStorage.setItem('fbms_token', token);
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Registration failed'
          });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('fbms_token');
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      },

      checkAuth: () => {
        const token = localStorage.getItem('fbms_token');
        
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        try {
          const decoded = verifyToken(token);
          const user = getUserById(decoded.id);
          
          if (user) {
            set({
              user,
              isAuthenticated: true,
              error: null
            });
          } else {
            // User not found, clear token
            localStorage.removeItem('fbms_token');
            set({ isAuthenticated: false, user: null });
          }
        } catch (error) {
          // Invalid token, clear it
          localStorage.removeItem('fbms_token');
          set({
            isAuthenticated: false,
            user: null,
            error: 'Session expired. Please login again.'
          });
        }
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'fbms-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);