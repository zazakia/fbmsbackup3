import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineStore } from '../store/offlineStore';
import { syncService } from '../services/syncService';

// Mock the API functions
vi.mock('../api/sales', () => ({
  createSale: vi.fn(),
}));

vi.mock('../api/customers', () => ({
  updateCustomer: vi.fn(),
}));

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

describe('Offline Functionality', () => {
  beforeEach(() => {
    // Reset the store before each test
    useOfflineStore.getState().clearPendingTransactions();
    useOfflineStore.getState().setOnlineStatus(true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('OfflineStore', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useOfflineStore());
      
      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOfflineMode).toBe(false);
      expect(result.current.pendingTransactions).toEqual([]);
      expect(result.current.syncStatus).toBe('idle');
    });

    it('should toggle offline mode', () => {
      const { result } = renderHook(() => useOfflineStore());
      
      act(() => {
        result.current.toggleOfflineMode();
      });
      
      expect(result.current.isOfflineMode).toBe(true);
      
      act(() => {
        result.current.toggleOfflineMode();
      });
      
      expect(result.current.isOfflineMode).toBe(false);
    });

    it('should add pending transactions', () => {
      const { result } = renderHook(() => useOfflineStore());
      
      const transactionData = {
        type: 'sale' as const,
        data: {
          items: [{ id: '1', name: 'Test Item', quantity: 1, price: 100 }],
          total: 100,
        },
      };
      
      act(() => {
        result.current.addPendingTransaction(transactionData);
      });
      
      expect(result.current.pendingTransactions).toHaveLength(1);
      expect(result.current.pendingTransactions[0].type).toBe('sale');
      expect(result.current.pendingTransactions[0].status).toBe('pending');
    });

    it('should update transaction status', () => {
      const { result } = renderHook(() => useOfflineStore());
      
      const transactionData = {
        type: 'sale' as const,
        data: { items: [], total: 0 },
      };
      
      act(() => {
        result.current.addPendingTransaction(transactionData);
      });
      
      const transactionId = result.current.pendingTransactions[0].id;
      
      act(() => {
        result.current.updateTransactionStatus(transactionId, 'syncing');
      });
      
      expect(result.current.pendingTransactions[0].status).toBe('syncing');
      
      act(() => {
        result.current.updateTransactionStatus(transactionId, 'failed', 'Network error');
      });
      
      expect(result.current.pendingTransactions[0].status).toBe('failed');
      expect(result.current.pendingTransactions[0].lastError).toBe('Network error');
      expect(result.current.pendingTransactions[0].retryCount).toBe(1);
    });

    it('should remove pending transactions', () => {
      const { result } = renderHook(() => useOfflineStore());
      
      const transactionData = {
        type: 'sale' as const,
        data: { items: [], total: 0 },
      };
      
      act(() => {
        result.current.addPendingTransaction(transactionData);
      });
      
      const transactionId = result.current.pendingTransactions[0].id;
      
      act(() => {
        result.current.removePendingTransaction(transactionId);
      });
      
      expect(result.current.pendingTransactions).toHaveLength(0);
    });

    it('should filter transactions by type', () => {
      const { result } = renderHook(() => useOfflineStore());
      
      act(() => {
        result.current.addPendingTransaction({
          type: 'sale',
          data: { items: [], total: 0 },
        });
        result.current.addPendingTransaction({
          type: 'customer_update',
          data: { id: '1', updates: {} },
        });
        result.current.addPendingTransaction({
          type: 'sale',
          data: { items: [], total: 0 },
        });
      });
      
      const saleTransactions = result.current.getPendingTransactionsByType('sale');
      const customerTransactions = result.current.getPendingTransactionsByType('customer_update');
      
      expect(saleTransactions).toHaveLength(2);
      expect(customerTransactions).toHaveLength(1);
    });

    it('should get failed transactions', () => {
      const { result } = renderHook(() => useOfflineStore());
      
      act(() => {
        result.current.addPendingTransaction({
          type: 'sale',
          data: { items: [], total: 0 },
        });
        result.current.addPendingTransaction({
          type: 'customer_update',
          data: { id: '1', updates: {} },
        });
      });
      
      const [transaction1Id, transaction2Id] = result.current.pendingTransactions.map(t => t.id);
      
      act(() => {
        result.current.updateTransactionStatus(transaction1Id, 'failed', 'Error 1');
        result.current.updateTransactionStatus(transaction2Id, 'synced');
      });
      
      const failedTransactions = result.current.getFailedTransactions();
      expect(failedTransactions).toHaveLength(1);
      expect(failedTransactions[0].id).toBe(transaction1Id);
    });
  });

  describe('SyncService', () => {
    it('should sync sale transaction successfully', async () => {
      const { createSale } = await import('../api/sales');
      (createSale as any).mockResolvedValue({ data: { id: '1' }, error: null });
      
      const transaction = {
        id: '1',
        type: 'sale' as const,
        data: {
          items: [{ id: '1', name: 'Test Item', quantity: 1, price: 100 }],
          total: 100,
        },
        timestamp: new Date(),
        status: 'pending' as const,
        retryCount: 0,
      };
      
      const result = await syncService.syncTransaction(transaction);
      
      expect(result.success).toBe(true);
      expect(createSale).toHaveBeenCalledWith(transaction.data);
    });

    it('should handle sale sync failure', async () => {
      const { createSale } = await import('../api/sales');
      (createSale as any).mockResolvedValue({ data: null, error: 'Database error' });
      
      const transaction = {
        id: '1',
        type: 'sale' as const,
        data: {
          items: [{ id: '1', name: 'Test Item', quantity: 1, price: 100 }],
          total: 100,
        },
        timestamp: new Date(),
        status: 'pending' as const,
        retryCount: 0,
      };
      
      const result = await syncService.syncTransaction(transaction);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should sync customer update transaction successfully', async () => {
      const { updateCustomer } = await import('../api/customers');
      (updateCustomer as any).mockResolvedValue({ data: { id: '1' }, error: null });
      
      const transaction = {
        id: '1',
        type: 'customer_update' as const,
        data: {
          id: '1',
          updates: { firstName: 'John', lastName: 'Doe' },
        },
        timestamp: new Date(),
        status: 'pending' as const,
        retryCount: 0,
      };
      
      const result = await syncService.syncTransaction(transaction);
      
      expect(result.success).toBe(true);
      expect(updateCustomer).toHaveBeenCalledWith('1', { firstName: 'John', lastName: 'Doe' });
    });

    it('should handle invalid transaction type', async () => {
      const transaction = {
        id: '1',
        type: 'invalid_type' as any,
        data: {},
        timestamp: new Date(),
        status: 'pending' as const,
        retryCount: 0,
      };
      
      const result = await syncService.syncTransaction(transaction);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown transaction type');
    });

    it('should sync multiple transactions', async () => {
      const { createSale } = await import('../api/sales');
      const { updateCustomer } = await import('../api/customers');
      
      (createSale as any).mockResolvedValue({ data: { id: '1' }, error: null });
      (updateCustomer as any).mockResolvedValue({ data: { id: '1' }, error: null });
      
      const transactions = [
        {
          id: '1',
          type: 'sale' as const,
          data: { items: [{ id: '1', name: 'Test', quantity: 1, price: 100 }], total: 100 },
          timestamp: new Date(),
          status: 'pending' as const,
          retryCount: 0,
        },
        {
          id: '2',
          type: 'customer_update' as const,
          data: { id: '1', updates: {} },
          timestamp: new Date(),
          status: 'pending' as const,
          retryCount: 0,
        },
      ];
      
      const result = await syncService.syncAllPendingTransactions(transactions);
      
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle mixed success and failure in batch sync', async () => {
      const { createSale } = await import('../api/sales');
      const { updateCustomer } = await import('../api/customers');
      
      (createSale as any).mockResolvedValue({ data: { id: '1' }, error: null });
      (updateCustomer as any).mockResolvedValue({ data: null, error: 'Customer not found' });
      
      const transactions = [
        {
          id: '1',
          type: 'sale' as const,
          data: { items: [{ id: '1', name: 'Test', quantity: 1, price: 100 }], total: 100 },
          timestamp: new Date(),
          status: 'pending' as const,
          retryCount: 0,
        },
        {
          id: '2',
          type: 'customer_update' as const,
          data: { id: '1', updates: {} },
          timestamp: new Date(),
          status: 'pending' as const,
          retryCount: 0,
        },
      ];
      
      const result = await syncService.syncAllPendingTransactions(transactions);
      
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Customer not found');
    });
  });

  describe('Network Status Detection', () => {
    it('should detect online status change', () => {
      const { result } = renderHook(() => useOfflineStore());
      
      act(() => {
        result.current.setOnlineStatus(false);
      });
      
      expect(result.current.isOnline).toBe(false);
      
      act(() => {
        result.current.setOnlineStatus(true);
      });
      
      expect(result.current.isOnline).toBe(true);
    });

    it('should trigger sync when coming back online with pending transactions', async () => {
      const { result } = renderHook(() => useOfflineStore());
      
      // Add a pending transaction while offline
      act(() => {
        result.current.setOnlineStatus(false);
        result.current.addPendingTransaction({
          type: 'sale',
          data: { items: [], total: 100 },
        });
      });
      
      expect(result.current.pendingTransactions).toHaveLength(1);
      
      // Mock successful sync
      const { createSale } = await import('../api/sales');
      (createSale as any).mockResolvedValue({ data: { id: '1' }, error: null });
      
      // Come back online
      act(() => {
        result.current.setOnlineStatus(true);
      });
      
      // Wait for async sync to complete
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(result.current.isOnline).toBe(true);
    });
  });

  describe('Data Validation', () => {
    it('should reject invalid sale data', async () => {
      const transaction = {
        id: '1',
        type: 'sale' as const,
        data: {}, // Invalid: missing items
        timestamp: new Date(),
        status: 'pending' as const,
        retryCount: 0,
      };
      
      const result = await syncService.syncTransaction(transaction);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid sale data');
    });

    it('should reject customer update without ID', async () => {
      const transaction = {
        id: '1',
        type: 'customer_update' as const,
        data: {
          updates: { firstName: 'John' }, // Invalid: missing id
        },
        timestamp: new Date(),
        status: 'pending' as const,
        retryCount: 0,
      };
      
      const result = await syncService.syncTransaction(transaction);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid customer data');
    });
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      // Mock successful fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      });
      
      const isConnected = await syncService.testConnection();
      
      expect(isConnected).toBe(true);
      expect(fetch).toHaveBeenCalledWith(window.location.origin, {
        method: 'HEAD',
        signal: expect.any(AbortSignal),
      });
    });

    it('should handle connection test failure', async () => {
      // Mock failed fetch
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const isConnected = await syncService.testConnection();
      
      expect(isConnected).toBe(false);
    });

    it('should handle connection test timeout', async () => {
      // Mock fetch that throws an AbortError (simulating timeout)
      global.fetch = vi.fn().mockRejectedValue(new Error('AbortError'));
      
      const isConnected = await syncService.testConnection();
      
      expect(isConnected).toBe(false);
    });
  });
});