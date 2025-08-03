import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Sale, CartItem, Customer, Product } from '../types/business';

export interface OfflineTransaction {
  id: string;
  type: 'sale' | 'inventory_update' | 'customer_update';
  data: any;
  timestamp: Date;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string;
}

export interface OfflineState {
  isOnline: boolean;
  isOfflineMode: boolean;
  pendingTransactions: OfflineTransaction[];
  offlineData: {
    products: Product[];
    customers: Customer[];
    lastSync: Date | null;
  };
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncError?: string;
}

export interface OfflineActions {
  setOnlineStatus: (isOnline: boolean) => void;
  toggleOfflineMode: () => void;
  addPendingTransaction: (transaction: Omit<OfflineTransaction, 'id' | 'timestamp' | 'status' | 'retryCount'>) => void;
  updateTransactionStatus: (id: string, status: OfflineTransaction['status'], error?: string) => void;
  removePendingTransaction: (id: string) => void;
  clearPendingTransactions: () => void;
  updateOfflineData: (data: Partial<OfflineState['offlineData']>) => void;
  setSyncStatus: (status: OfflineState['syncStatus'], error?: string) => void;
  getPendingTransactionsByType: (type: OfflineTransaction['type']) => OfflineTransaction[];
  getFailedTransactions: () => OfflineTransaction[];
  retryFailedTransactions: () => Promise<void>;
}

type OfflineStore = OfflineState & OfflineActions;

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const useOfflineStore = create<OfflineStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isOnline: navigator.onLine,
      isOfflineMode: false,
      pendingTransactions: [],
      offlineData: {
        products: [],
        customers: [],
        lastSync: null,
      },
      syncStatus: 'idle',
      lastSyncError: undefined,

      // Actions
      setOnlineStatus: (isOnline) => {
        set({ isOnline });
        
        // If we're back online and have pending transactions, trigger sync
        if (isOnline && get().pendingTransactions.length > 0) {
          // Trigger sync after a short delay to allow network to stabilize
          setTimeout(() => {
            get().retryFailedTransactions();
          }, 1000);
        }
      },

      toggleOfflineMode: () => {
        set((state) => ({ isOfflineMode: !state.isOfflineMode }));
      },

      addPendingTransaction: (transactionData) => {
        const transaction: OfflineTransaction = {
          ...transactionData,
          id: generateId(),
          timestamp: new Date(),
          status: 'pending',
          retryCount: 0,
        };

        set((state) => ({
          pendingTransactions: [...state.pendingTransactions, transaction],
        }));

        // If online, try to sync immediately
        if (get().isOnline && !get().isOfflineMode) {
          setTimeout(() => {
            get().retryFailedTransactions();
          }, 100);
        }
      },

      updateTransactionStatus: (id, status, error) => {
        set((state) => ({
          pendingTransactions: state.pendingTransactions.map((transaction) =>
            transaction.id === id
              ? {
                  ...transaction,
                  status,
                  lastError: error,
                  retryCount: status === 'failed' ? transaction.retryCount + 1 : transaction.retryCount,
                }
              : transaction
          ),
        }));
      },

      removePendingTransaction: (id) => {
        set((state) => ({
          pendingTransactions: state.pendingTransactions.filter((transaction) => transaction.id !== id),
        }));
      },

      clearPendingTransactions: () => {
        set({ pendingTransactions: [] });
      },

      updateOfflineData: (data) => {
        set((state) => ({
          offlineData: {
            ...state.offlineData,
            ...data,
            lastSync: new Date(),
          },
        }));
      },

      setSyncStatus: (status, error) => {
        set({ syncStatus: status, lastSyncError: error });
      },

      getPendingTransactionsByType: (type) => {
        return get().pendingTransactions.filter((transaction) => transaction.type === type);
      },

      getFailedTransactions: () => {
        return get().pendingTransactions.filter((transaction) => transaction.status === 'failed');
      },

      retryFailedTransactions: async () => {
        const { pendingTransactions, isOnline, setSyncStatus, updateTransactionStatus } = get();
        
        if (!isOnline) {
          return;
        }

        const pendingTxns = pendingTransactions.filter(
          (txn) => txn.status === 'pending' || txn.status === 'failed'
        );

        if (pendingTxns.length === 0) {
          return;
        }

        setSyncStatus('syncing');

        try {
          // Import sync service dynamically to avoid circular dependencies
          const { syncService } = await import('../services/syncService');
          
          for (const transaction of pendingTxns) {
            // Skip transactions that have failed too many times
            if (transaction.retryCount >= 3) {
              continue;
            }

            try {
              updateTransactionStatus(transaction.id, 'syncing');
              await syncService.syncTransaction(transaction);
              updateTransactionStatus(transaction.id, 'synced');
            } catch (error) {
              console.error('Failed to sync transaction:', error);
              updateTransactionStatus(
                transaction.id,
                'failed',
                error instanceof Error ? error.message : 'Unknown error'
              );
            }
          }

          setSyncStatus('idle');
        } catch (error) {
          console.error('Failed to retry transactions:', error);
          setSyncStatus('error', error instanceof Error ? error.message : 'Unknown error');
        }
      },
    }),
    {
      name: 'offline-store',
      partialize: (state) => ({
        pendingTransactions: state.pendingTransactions,
        offlineData: state.offlineData,
        isOfflineMode: state.isOfflineMode,
      }),
    }
  )
);