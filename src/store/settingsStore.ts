import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { settingsAPI } from '../api/settings';
import { MenuVisibilitySettings as TypedMenuVisibilitySettings } from '../types/settings';
import { useSupabaseAuthStore } from './supabaseAuthStore';



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
  isLoading: boolean;
  lastSyncError: string | null;
  setMenuVisibility: (menuId: string, visible: boolean) => void;
  toggleAllMenus: (visible: boolean) => void;
  resetToDefaults: () => void;
  syncWithSupabase: () => Promise<void>;
  loadFromSupabase: () => Promise<void>;
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
      isLoading: false,
      lastSyncError: null,

      setMenuVisibility: async (menuId: string, visible: boolean) => {
        set((state) => ({
          menuVisibility: {
            ...state.menuVisibility,
            [menuId]: visible
          }
        }));
        
        // Sync with Supabase after local update
        await get().syncWithSupabase();
      },

      toggleAllMenus: async (visible: boolean) => {
        set((state) => {
          const newVisibility: MenuVisibilitySettings = {} as MenuVisibilitySettings;
          Object.keys(state.menuVisibility).forEach(key => {
            newVisibility[key as keyof MenuVisibilitySettings] = visible;
          });
          return { menuVisibility: newVisibility };
        });
        
        // Sync with Supabase after local update
        await get().syncWithSupabase();
      },

      resetToDefaults: async () => {
        set({ 
          menuVisibility: defaultMenuVisibilitySettings
        });
        
        // Sync with Supabase after reset
        await get().syncWithSupabase();
      },

      syncWithSupabase: async () => {
        try {
          set({ isLoading: true, lastSyncError: null });
          
          const authStore = useSupabaseAuthStore.getState();
          const userId = authStore.user?.id;
          
          if (!userId) {
            console.warn('No user ID available for settings sync');
            set({ isLoading: false });
            return;
          }

          const currentState = get();
          const menuVisibilityForSupabase: TypedMenuVisibilitySettings = {
            dashboard: currentState.menuVisibility.dashboard,
            inventory: currentState.menuVisibility.inventory,
            sales: currentState.menuVisibility.sales,
            purchases: currentState.menuVisibility.purchases,
            suppliers: currentState.menuVisibility.suppliers,
            customers: currentState.menuVisibility.customers,
            reports: currentState.menuVisibility.reports,
            analytics: currentState.menuVisibility.bir, // Map bir to analytics
            settings: currentState.menuVisibility.settings,
            users: currentState.menuVisibility.userRoles, // Map userRoles to users
            audit: currentState.menuVisibility.dataHistory, // Map dataHistory to audit
            backup: currentState.menuVisibility.backup,
          };

          const response = await settingsAPI.updateSettingsSection(userId, {
            section: 'menuVisibility',
            data: menuVisibilityForSupabase
          });

          if (!response.success) {
            throw new Error(response.error || 'Failed to sync settings');
          }

          set({ isLoading: false });
        } catch (error) {
          console.error('Failed to sync settings with Supabase:', error);
          set({ 
            isLoading: false, 
            lastSyncError: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      },

      loadFromSupabase: async () => {
        try {
          set({ isLoading: true, lastSyncError: null });
          
          const authStore = useSupabaseAuthStore.getState();
          const userId = authStore.user?.id;
          
          if (!userId) {
            console.warn('No user ID available for settings load');
            set({ isLoading: false });
            return;
          }

          const response = await settingsAPI.getUserSettings(userId);

          if (response.success && response.data?.menuVisibility) {
            const supabaseMenuVisibility = response.data.menuVisibility;
            
            // Map Supabase menu visibility to local store format
            const localMenuVisibility: MenuVisibilitySettings = {
              ...defaultMenuVisibilitySettings,
              dashboard: supabaseMenuVisibility.dashboard,
              inventory: supabaseMenuVisibility.inventory,
              sales: supabaseMenuVisibility.sales,
              purchases: supabaseMenuVisibility.purchases,
              suppliers: supabaseMenuVisibility.suppliers,
              customers: supabaseMenuVisibility.customers,
              reports: supabaseMenuVisibility.reports,
              bir: supabaseMenuVisibility.analytics, // Map analytics to bir
              settings: supabaseMenuVisibility.settings,
              userRoles: supabaseMenuVisibility.users, // Map users to userRoles
              dataHistory: supabaseMenuVisibility.audit, // Map audit to dataHistory
              backup: supabaseMenuVisibility.backup,
            };

            set({ 
              menuVisibility: localMenuVisibility,
              isLoading: false 
            });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Failed to load settings from Supabase:', error);
          set({ 
            isLoading: false, 
            lastSyncError: error instanceof Error ? error.message : 'Unknown error'
          });
        }
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