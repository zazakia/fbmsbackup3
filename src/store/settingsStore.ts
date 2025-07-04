import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EnhancedVersions {
  sales: boolean;
  inventory: boolean;
  accounting: boolean;
  purchases: boolean;
  reports: boolean;
}

interface SettingsStore {
  enhancedVersions: EnhancedVersions;
  setEnhancedVersion: (module: string, isEnhanced: boolean) => void;
  resetToDefaults: () => void;
  toggleAllEnhanced: (enabled: boolean) => void;
}

const defaultEnhancedVersions: EnhancedVersions = {
  sales: true,      // Enhanced by default
  inventory: true,  // Enhanced by default
  accounting: true, // Enhanced by default
  purchases: true,  // Enhanced by default
  reports: true     // Enhanced by default
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      enhancedVersions: defaultEnhancedVersions,

      setEnhancedVersion: (module: string, isEnhanced: boolean) => {
        set((state) => ({
          enhancedVersions: {
            ...state.enhancedVersions,
            [module]: isEnhanced
          }
        }));
      },

      resetToDefaults: () => {
        set({ enhancedVersions: defaultEnhancedVersions });
      },

      toggleAllEnhanced: (enabled: boolean) => {
        set((state) => {
          const newVersions: EnhancedVersions = {} as EnhancedVersions;
          Object.keys(state.enhancedVersions).forEach(key => {
            newVersions[key as keyof EnhancedVersions] = enabled;
          });
          return { enhancedVersions: newVersions };
        });
      }
    }),
    {
      name: 'fbms-settings-store',
      version: 1
    }
  )
);