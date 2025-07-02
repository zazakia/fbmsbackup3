import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'system';

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
const applyTheme = (isDark: boolean) => {
  if (typeof document === 'undefined') return;
  
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
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
          case 'system':
            isDark = getSystemTheme();
            break;
        }

        applyTheme(isDark);
        set({ theme, isDark });
      },

      toggleTheme: () => {
        const { theme } = get();
        const newTheme = theme === 'dark' ? 'light' : 'dark';
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