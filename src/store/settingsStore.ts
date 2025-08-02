import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface EnhancedVersions {
  sales: boolean;
  inventory: boolean;
  accounting: boolean;
  purchases: boolean;
  reports: boolean;
}

interface MainModuleSettings {
  enabled: boolean;
}

interface MenuVisibilitySettings {
  dashboard: boolean;
  sales: boolean;
  inventory: boolean;
  purchases: boolean;
  customers: boolean;
  customerTransactions: boolean;
  suppliers: boolean;
  expenses: boolean;
  payroll: boolean;
  accounting: boolean;
  reports: boolean;
  bir: boolean;
  branches: boolean;
  operations: boolean;
  marketing: boolean;
  loyalty: boolean;
  backup: boolean;
  testing: boolean;
  adminDashboard: boolean;
  userRoles: boolean;
  dataHistory: boolean;
  settings: boolean;
}

interface SettingsStore {
  enhancedVersions: EnhancedVersions;
  mainModule: MainModuleSettings;
  menuVisibility: MenuVisibilitySettings;
  setEnhancedVersion: (module: string, isEnhanced: boolean) => void;
  setMainModuleEnabled: (enabled: boolean) => void;
  setMenuVisibility: (menuId: string, visible: boolean) => void;
  toggleAllMenus: (visible: boolean) => void;
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

const defaultMainModuleSettings: MainModuleSettings = {
  enabled: true  // Main module enabled by default
};

const defaultMenuVisibilitySettings: MenuVisibilitySettings = {
  dashboard: true,
  sales: true,
  inventory: true,
  purchases: true,
  customers: true,
  customerTransactions: true,
  suppliers: true,
  expenses: true,
  payroll: true,
  accounting: true,
  reports: true,
  bir: true,
  branches: true,
  operations: true,
  marketing: true,
  loyalty: true,
  backup: true,
  testing: true,
  adminDashboard: true,
  userRoles: true,
  dataHistory: true,
  settings: true,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      enhancedVersions: defaultEnhancedVersions,
      mainModule: defaultMainModuleSettings,
      menuVisibility: defaultMenuVisibilitySettings,

      setEnhancedVersion: (module: string, isEnhanced: boolean) => {
        set((state) => ({
          enhancedVersions: {
            ...state.enhancedVersions,
            [module]: isEnhanced
          }
        }));
      },

      setMainModuleEnabled: (enabled: boolean) => {
        set((state) => ({
          mainModule: {
            ...state.mainModule,
            enabled
          }
        }));
      },

      setMenuVisibility: (menuId: string, visible: boolean) => {
        set((state) => ({
          menuVisibility: {
            ...state.menuVisibility,
            [menuId]: visible
          }
        }));
      },

      toggleAllMenus: (visible: boolean) => {
        set((state) => {
          const newVisibility: MenuVisibilitySettings = {} as MenuVisibilitySettings;
          Object.keys(state.menuVisibility).forEach(key => {
            newVisibility[key as keyof MenuVisibilitySettings] = visible;
          });
          return { menuVisibility: newVisibility };
        });
      },

      resetToDefaults: () => {
        set({ 
          enhancedVersions: defaultEnhancedVersions,
          mainModule: defaultMainModuleSettings,
          menuVisibility: defaultMenuVisibilitySettings
        });
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
      version: 3
    }
  )
);