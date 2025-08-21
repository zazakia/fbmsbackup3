import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'system' | 'peddlr-light' | 'peddlr-dark';

interface ThemeState {
  theme: Theme;
  isDark: boolean;
}

interface ThemeActions {
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initializeTheme: () => void;
}

type ThemeStore = ThemeState & ThemeActions;

// Get system preference
const getSystemTheme = (): boolean => {
  if (typeof window === 'undefined') return true; // Default to dark
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Apply theme to document
const applyTheme = (isDark: boolean, theme: Theme) => {
  if (typeof document === 'undefined') return;
  
  // Remove all theme classes first
  document.documentElement.classList.remove('dark', 'peddlr-light', 'peddlr-dark');
  
  // Apply the appropriate theme class
  if (theme === 'peddlr-light') {
    document.documentElement.classList.add('peddlr-light');
  } else if (theme === 'peddlr-dark') {
    document.documentElement.classList.add('peddlr-dark');
  } else if (isDark) {
    document.documentElement.classList.add('dark');
  }
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'dark', // Default to dark theme
      isDark: true,

      setTheme: (theme: Theme) => {
        let isDark = true;
        
        switch (theme) {
          case 'light':
            isDark = false;
            break;
          case 'dark':
            isDark = true;
            break;
          case 'peddlr-light':
            isDark = false;
            break;
          case 'peddlr-dark':
            isDark = true;
            break;
          case 'system':
            isDark = getSystemTheme();
            break;
        }

        applyTheme(isDark, theme);
        set({ theme, isDark });
      },

      toggleTheme: () => {
        const { theme } = get();
        let newTheme: Theme;
        
        switch (theme) {
          case 'dark':
            newTheme = 'light';
            break;
          case 'light':
            newTheme = 'dark';
            break;
          case 'peddlr-dark':
            newTheme = 'peddlr-light';
            break;
          case 'peddlr-light':
            newTheme = 'peddlr-dark';
            break;
          default:
            newTheme = theme === 'system' ? 'dark' : 'light';
        }
        
        get().setTheme(newTheme);
      },

      initializeTheme: () => {
        const { theme } = get();
        get().setTheme(theme);
      },
    }),
    {
      name: 'fbms-theme',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
); 