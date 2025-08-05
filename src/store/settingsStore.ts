import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  mainModule: MainModuleSettings;
  menuVisibility: MenuVisibilitySettings;
  setMainModuleEnabled: (enabled: boolean) => void;
  setMenuVisibility: (menuId: string, visible: boolean) => void;
  toggleAllMenus: (visible: boolean) => void;
  resetToDefaults: () => void;
}

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
      mainModule: defaultMainModuleSettings,
      menuVisibility: defaultMenuVisibilitySettings,

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
          mainModule: defaultMainModuleSettings,
          menuVisibility: defaultMenuVisibilitySettings
        });
      }
    }),
    {
      name: 'fbms-settings-store',
      version: 3
    }
  )
);