import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { usePurchaseOrderStore } from '../../../store/purchaseOrderStore';
import { PurchaseOrder, EnhancedPurchaseOrderStatus } from '../../../types/business';
import { purchaseOrderStateMachine, TransitionContext } from '../../../services/purchaseOrderStateMachine';

// Mock the API functions
vi.mock('../../../api/purchases', () => ({
  updatePurchaseOrder: vi.fn()
}));

// Mock the services
vi.mock('../../../services/performanceService', () => ({
  PerformanceService: {
    recordOperationDuration: vi.fn(),
    cacheProduct: vi.fn()
  }
}));

vi.mock('../../../services/errorHandlingService', () => ({
  ErrorHandlingService: {
    formatDatabaseError: vi.fn((error) => ({ message: error.message || 'Unknown error' })),
    logError: vi.fn()
  }
}));

describe('PurchaseOrderStore State Machine Integration', () => {
  let store: ReturnType<typeof usePurchaseOrderStore>;
  let mockPurchaseOrder: PurchaseOrder;
  let mockTransitionContext: TransitionContext;

  beforeEach(() => {
    // Clear the store state
    store = usePurchaseOrderStore.getState();
    usePurchaseOrderStore.setState({
      purchaseOrders: [],
      selectedPO: null,
      loading: false,
      error: null,
      page: 1,
      limit: 10,
      totalCount: 0,
      supplierFilter: null,
      statusFilter: null
    });

    mockPurchaseOrder = {
      id: 'po-123',
      poNumber: 'PO-2024-001',
      supplierId: 'supplier-123',
      supplierName: 'Test Supplier',
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Test Product 1',
          sku: 'TEST-001',
          quantity: 10,
          cost: 100,
          total: 1000
        }
      ],
      subtotal: 1000,
      tax: 120,
      total: 1120,
      status: 'draft',
      createdAt: new Date(),
      createdBy: 'user-123'
    };

    mockTransitionContext = {
      performedBy: 'manager-123',
      reason: 'Test transition',
      timestamp: new Date()
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateTransition', () => {
    it('should validate transitions using state machine', () => {
      const result = store.validateTransition(
        mockPurchaseOrder,
        'pending_approval',
        mockTransitionContext
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid transitions', () => {
      const result = store.validateTransition(
        mockPurchaseOrder,
        'fully_received',
        mockTransitionContext
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate business rules', () => {
      const poWithNoItems = { ...mockPurchaseOrder, items: [] };
      const result = store.validateTransition(
        poWithNoItems,
        'pending_approval',
        mockTransitionContext
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'NO_ITEMS')).toBe(true);
    });
  });

  describe('getValidTransitions', () => {
    it('should return valid transitions for draft status', () => {
      const validTransitions = store.getValidTransitions('draft');
      
      expect(validTransitions).toContain('pending_approval');
      expect(validTransitions).toContain('cancelled');
      expect(validTransitions).toHaveLength(2);
    });

    it('should return valid transitions for approved status', () => {
      const validTransitions = store.getValidTransitions('approved');
      
      expect(validTransitions).toContain('sent_to_supplier');
      expect(validTransitions).toContain('partially_received');
      expect(validTransitions).toContain('fully_received');
      expect(validTransitions).toContain('cancelled');
      expect(validTransitions).toHaveLength(4);
    });

    it('should return empty array for final states', () => {
      const cancelledTransitions = store.getValidTransitions('cancelled');
      const closedTransitions = store.getValidTransitions('closed');
      
      expect(cancelledTransitions).toHaveLength(0);
      expect(closedTransitions).toHaveLength(0);
    });
  });

  describe('getNextLogicalStatus', () => {
    it('should suggest next logical status', () => {
      const nextStatus = store.getNextLogicalStatus(mockPurchaseOrder);
      expect(nextStatus).toBe('pending_approval');
    });

    it('should suggest status based on received quantities', () => {
      const sentPO = { ...mockPurchaseOrder, status: 'sent' };
      
      const partialQuantities = { 'prod-1': 5 };
      const nextStatus1 = store.getNextLogicalStatus(sentPO, partialQuantities);
      expect(nextStatus1).toBe('partially_received');

      const fullQuantities = { 'prod-1': 10 };
      const nextStatus2 = store.getNextLogicalStatus(sentPO, fullQuantities);
      expect(nextStatus2).toBe('fully_received');
    });

    it('should return null for final states', () => {
      const cancelledPO = { ...mockPurchaseOrder, status: 'cancelled' };
      const nextStatus = store.getNextLogicalStatus(cancelledPO);
      expect(nextStatus).toBeNull();
    });
  });

  describe('transitionStatus', () => {
    beforeEach(() => {
      // Setup store with purchase order
      usePurchaseOrderStore.setState({
        purchaseOrders: [mockPurchaseOrder],
        selectedPO: mockPurchaseOrder
      });
    });

    it('should successfully transition valid status', async () => {
      const mockUpdatePurchaseOrder = await import('../../../api/purchases');
      vi.mocked(mockUpdatePurchaseOrder.updatePurchaseOrder).mockResolvedValue({
        data: { ...mockPurchaseOrder, status: 'draft' }, // State machine maps pending_approval back to draft
        error: null
      });

      const result = await store.transitionStatus(
        'po-123',
        'pending_approval',
        mockTransitionContext
      );

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockUpdatePurchaseOrder.updatePurchaseOrder).toHaveBeenCalledWith('po-123', {
        status: 'draft',
        receivedDate: undefined
      });
    });

    it('should fail to transition invalid status', async () => {
      const result = await store.transitionStatus(
        'po-123',
        'fully_received',
        mockTransitionContext
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle purchase order not found', async () => {
      // Clear the store state to ensure no purchase orders exist
      usePurchaseOrderStore.setState({
        purchaseOrders: [],
        selectedPO: null
      });

      const result = await store.transitionStatus(
        'non-existent-po',
        'pending_approval',
        mockTransitionContext
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Purchase order not found');
    });

    it('should handle API errors gracefully', async () => {
      const mockUpdatePurchaseOrder = await import('../../../api/purchases');
      vi.mocked(mockUpdatePurchaseOrder.updatePurchaseOrder).mockResolvedValue({
        data: null,
        error: new Error('API Error')
      });

      const result = await store.transitionStatus(
        'po-123',
        'pending_approval',
        mockTransitionContext
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should update store state on successful transition', async () => {
      // Use a valid transition from draft to pending_approval
      const updatedPO = { ...mockPurchaseOrder, status: 'draft' }; // pending_approval maps back to draft
      const mockUpdatePurchaseOrder = await import('../../../api/purchases');
      vi.mocked(mockUpdatePurchaseOrder.updatePurchaseOrder).mockResolvedValue({
        data: updatedPO,
        error: null
      });

      const result = await store.transitionStatus(
        'po-123',
        'pending_approval',
        mockTransitionContext
      );

      expect(result.success).toBe(true);
      
      const currentState = usePurchaseOrderStore.getState();
      const updatedPOInStore = currentState.purchaseOrders.find(po => po.id === 'po-123');
      expect(updatedPOInStore?.status).toBe('draft'); // pending_approval maps back to draft for legacy compatibility
    });

    it('should set received date when transitioning to fully_received', async () => {
      const approvedPO = { ...mockPurchaseOrder, status: 'sent' };
      usePurchaseOrderStore.setState({
        purchaseOrders: [approvedPO],
        selectedPO: approvedPO
      });

      const mockUpdatePurchaseOrder = await import('../../../api/purchases');
      vi.mocked(mockUpdatePurchaseOrder.updatePurchaseOrder).mockImplementation((id, updates) => {
        return Promise.resolve({
          data: { ...approvedPO, ...updates },
          error: null
        });
      });

      const result = await store.transitionStatus(
        'po-123',
        'fully_received',
        mockTransitionContext
      );

      expect(result.success).toBe(true);
      expect(mockUpdatePurchaseOrder.updatePurchaseOrder).toHaveBeenCalledWith(
        'po-123',
        expect.objectContaining({
          status: 'received',
          receivedDate: expect.any(Date)
        })
      );
    });

    it('should handle validation errors appropriately', async () => {
      const poWithNoItems = { ...mockPurchaseOrder, items: [] };
      usePurchaseOrderStore.setState({
        purchaseOrders: [poWithNoItems],
        selectedPO: poWithNoItems
      });

      const result = await store.transitionStatus(
        'po-123',
        'pending_approval',
        mockTransitionContext
      );

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('at least one item'))).toBe(true);
    });

    it('should handle loading state correctly', async () => {
      const mockUpdatePurchaseOrder = await import('../../../api/purchases');
      vi.mocked(mockUpdatePurchaseOrder.updatePurchaseOrder).mockImplementation(() => {
        return new Promise(resolve => {
          // Check loading state during async operation
          const state = usePurchaseOrderStore.getState();
          expect(state.loading).toBe(true);
          
          resolve({
            data: { ...mockPurchaseOrder, status: 'draft' },
            error: null
          });
        });
      });

      await store.transitionStatus(
        'po-123',
        'pending_approval',
        mockTransitionContext
      );

      // Check loading state after operation
      const finalState = usePurchaseOrderStore.getState();
      expect(finalState.loading).toBe(false);
    });
  });

  describe('Integration with State Machine', () => {
    it('should use the same state machine instance', () => {
      const validTransitions = store.getValidTransitions('draft');
      const stateMachineTransitions = purchaseOrderStateMachine.getValidTransitions('draft');
      
      expect(validTransitions).toEqual(stateMachineTransitions);
    });

    it('should validate using the same rules', () => {
      const storeResult = store.validateTransition(
        mockPurchaseOrder,
        'pending_approval',
        mockTransitionContext
      );
      
      const stateMachineResult = purchaseOrderStateMachine.validateTransition(
        mockPurchaseOrder,
        'pending_approval',
        mockTransitionContext
      );
      
      expect(storeResult.isValid).toBe(stateMachineResult.isValid);
      expect(storeResult.errors.length).toBe(stateMachineResult.errors.length);
    });

    it('should maintain consistency between store and state machine', () => {
      const testStatuses: EnhancedPurchaseOrderStatus[] = [
        'draft', 'pending_approval', 'approved', 'sent_to_supplier',
        'partially_received', 'fully_received', 'cancelled', 'closed'
      ];

      testStatuses.forEach(status => {
        const storeTransitions = store.getValidTransitions(status);
        const machineTransitions = purchaseOrderStateMachine.getValidTransitions(status);
        
        expect(storeTransitions).toEqual(machineTransitions);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during transition', async () => {
      const mockUpdatePurchaseOrder = await import('../../../api/purchases');
      vi.mocked(mockUpdatePurchaseOrder.updatePurchaseOrder).mockRejectedValue(
        new Error('Network error')
      );

      const result = await store.transitionStatus(
        'po-123',
        'pending_approval',
        mockTransitionContext
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should clear error state on successful operation', async () => {
      // First set an error and ensure we have a purchase order in the store
      usePurchaseOrderStore.setState({ 
        error: 'Previous error',
        purchaseOrders: [mockPurchaseOrder],
        selectedPO: mockPurchaseOrder
      });

      const mockUpdatePurchaseOrder = await import('../../../api/purchases');
      vi.mocked(mockUpdatePurchaseOrder.updatePurchaseOrder).mockResolvedValue({
        data: { ...mockPurchaseOrder, status: 'draft' },
        error: null
      });

      await store.transitionStatus(
        'po-123',
        'pending_approval',
        mockTransitionContext
      );

      const currentState = usePurchaseOrderStore.getState();
      expect(currentState.error).toBeNull();
    });

    it('should set error state on failed operation', async () => {
      const result = await store.transitionStatus(
        'po-123',
        'fully_received', // Invalid transition
        mockTransitionContext
      );

      expect(result.success).toBe(false);
      
      const currentState = usePurchaseOrderStore.getState();
      expect(currentState.error).toBeTruthy();
      expect(currentState.loading).toBe(false);
    });
  });
});