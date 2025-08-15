import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OfflineState {
  isOnline: boolean;
  pendingSync: any[];
  lastSyncTime: number | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'success';
  
  // Actions
  setOnlineStatus: (status: boolean) => void;
  addPendingSync: (data: any) => void;
  removePendingSync: (id: string) => void;
  clearPendingSync: () => void;
  setSyncStatus: (status: 'idle' | 'syncing' | 'error' | 'success') => void;
  updateLastSyncTime: () => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      isOnline: navigator.onLine ?? true,
      pendingSync: [],
      lastSyncTime: null,
      syncStatus: 'idle',

      setOnlineStatus: (status: boolean) => {
        set({ isOnline: status });
        
        // Auto-sync when coming back online
        if (status && get().pendingSync.length > 0) {
          get().setSyncStatus('syncing');
          // Note: Actual sync implementation would be handled by business services
        }
      },

      addPendingSync: (data: any) => {
        const pendingSync = get().pendingSync;
        set({ 
          pendingSync: [...pendingSync, { 
            ...data, 
            id: data.id || Date.now().toString(),
            timestamp: Date.now() 
          }] 
        });
      },

      removePendingSync: (id: string) => {
        const pendingSync = get().pendingSync.filter(item => item.id !== id);
        set({ pendingSync });
      },

      clearPendingSync: () => {
        set({ pendingSync: [] });
      },

      setSyncStatus: (status: 'idle' | 'syncing' | 'error' | 'success') => {
        set({ syncStatus: status });
      },

      updateLastSyncTime: () => {
        set({ lastSyncTime: Date.now() });
      },
    }),
    {
      name: 'offline-store',
      partialize: (state) => ({
        pendingSync: state.pendingSync,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);

// Online/offline event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useOfflineStore.getState().setOnlineStatus(true);
  });

  window.addEventListener('offline', () => {
    useOfflineStore.getState().setOnlineStatus(false);
  });
}