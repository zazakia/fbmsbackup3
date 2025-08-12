import { create } from 'zustand';
import { persist } from 'zustand/middleware';



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
  menuVisibility: MenuVisibilitySettings;
  setMenuVisibility: (menuId: string, visible: boolean) => void;
  toggleAllMenus: (visible: boolean) => void;
  resetToDefaults: () => void;
}



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
      menuVisibility: defaultMenuVisibilitySettings,

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
          menuVisibility: defaultMenuVisibilitySettings
        });
      }
    }),
    {
      name: 'fbms-settings-store',
      version: 5,
      migrate: (persistedState: any, version: number) => {
        // Handle migration from older versions
        if (version < 5) {
          const state = persistedState as any;
          return {
            ...state,
            menuVisibility: {
              ...defaultMenuVisibilitySettings,
              ...state?.menuVisibility
            },
            database: state?.database || { mode: 'remote' }
          };
        }
        return persistedState;
      }
    }
  )
);