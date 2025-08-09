import { describe, it, expect, beforeEach } from 'vitest';
import { 
  PurchaseOrderStateMachine,
  TransitionContext
} from '../../../services/purchaseOrderStateMachine';
import { PurchaseOrder } from '../../../types/business';

describe('PurchaseOrderStateMachine', () => {
  let stateMachine: PurchaseOrderStateMachine;
  let mockPurchaseOrder: PurchaseOrder;
  let mockTransitionContext: TransitionContext;

  beforeEach(() => {
    stateMachine = new PurchaseOrderStateMachine();
    
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
        },
        {
          id: 'item-2',
          productId: 'prod-2',
          productName: 'Test Product 2',
          sku: 'TEST-002',
          quantity: 5,
          cost: 200,
          total: 1000
        }
      ],
      subtotal: 2000,
      tax: 240,
      total: 2240,
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

  describe('canTransition', () => {
    it('should allow valid transitions from draft status', () => {
      expect(stateMachine.canTransition('draft', 'pending_approval')).toBe(true);
      expect(stateMachine.canTransition('draft', 'cancelled')).toBe(true);
    });

    it('should reject invalid transitions from draft status', () => {
      expect(stateMachine.canTransition('draft', 'approved')).toBe(false);
      expect(stateMachine.canTransition('draft', 'fully_received')).toBe(false);
      expect(stateMachine.canTransition('draft', 'closed')).toBe(false);
    });

    it('should allow valid transitions from pending_approval status', () => {
      expect(stateMachine.canTransition('pending_approval', 'approved')).toBe(true);
      expect(stateMachine.canTransition('pending_approval', 'draft')).toBe(true);
      expect(stateMachine.canTransition('pending_approval', 'cancelled')).toBe(true);
    });

    it('should allow valid transitions from approved status', () => {
      expect(stateMachine.canTransition('approved', 'sent_to_supplier')).toBe(true);
      expect(stateMachine.canTransition('approved', 'partially_received')).toBe(true);
      expect(stateMachine.canTransition('approved', 'fully_received')).toBe(true);
      expect(stateMachine.canTransition('approved', 'cancelled')).toBe(true);
    });

    it('should allow valid transitions from partially_received status', () => {
      expect(stateMachine.canTransition('partially_received', 'fully_received')).toBe(true);
    });

    it('should reject transitions from partially_received to other statuses', () => {
      expect(stateMachine.canTransition('partially_received', 'cancelled')).toBe(false);
      expect(stateMachine.canTransition('partially_received', 'draft')).toBe(false);
      expect(stateMachine.canTransition('partially_received', 'approved')).toBe(false);
    });

    it('should allow transition from fully_received to closed', () => {
      expect(stateMachine.canTransition('fully_received', 'closed')).toBe(true);
    });

    it('should not allow any transitions from final states', () => {
      expect(stateMachine.canTransition('cancelled', 'draft')).toBe(false);
      expect(stateMachine.canTransition('cancelled', 'approved')).toBe(false);
      expect(stateMachine.canTransition('closed', 'fully_received')).toBe(false);
    });
  });

  describe('validateTransition', () => {
    it('should validate successful transition from draft to pending_approval', () => {
      const result = stateMachine.validateTransition(
        mockPurchaseOrder,
        'pending_approval',
        mockTransitionContext
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject transition when purchase order has no items', () => {
      const poWithNoItems = { ...mockPurchaseOrder, items: [] };
      const result = stateMachine.validateTransition(
        poWithNoItems,
        'pending_approval',
        mockTransitionContext
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('NO_ITEMS');
    });

    it('should reject transition when purchase order has zero total', () => {
      const poWithZeroTotal = { ...mockPurchaseOrder, total: 0 };
      const result = stateMachine.validateTransition(
        poWithZeroTotal,
        'pending_approval',
        mockTransitionContext
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INVALID_TOTAL')).toBe(true);
    });

    it('should reject transition when no supplier is selected', () => {
      const poWithNoSupplier = { ...mockPurchaseOrder, supplierId: '' };
      const result = stateMachine.validateTransition(
        poWithNoSupplier,
        'pending_approval',
        mockTransitionContext
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'NO_SUPPLIER')).toBe(true);
    });

    it('should reject approval without approver information', () => {
      const contextWithoutApprover = { ...mockTransitionContext, performedBy: '' };
      const result = stateMachine.validateTransition(
        mockPurchaseOrder,
        'approved',
        contextWithoutApprover
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'NO_APPROVER')).toBe(true);
    });

    it('should reject receiving without proper prerequisite status', () => {
      const result = stateMachine.validateTransition(
        mockPurchaseOrder,
        'partially_received',
        mockTransitionContext
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'NOT_READY_FOR_RECEIVING')).toBe(true);
    });

    it('should reject cancellation of received orders', () => {
      const receivedPO = { ...mockPurchaseOrder, status: 'received' };
      const result = stateMachine.validateTransition(
        receivedPO,
        'cancelled',
        mockTransitionContext
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'CANNOT_CANCEL_RECEIVED')).toBe(true);
    });

    it('should allow multiple validation errors', () => {
      const invalidPO = {
        ...mockPurchaseOrder,
        items: [],
        total: 0,
        supplierId: ''
      };

      const result = stateMachine.validateTransition(
        invalidPO,
        'pending_approval',
        mockTransitionContext
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors.some(e => e.code === 'NO_ITEMS')).toBe(true);
      expect(result.errors.some(e => e.code === 'INVALID_TOTAL')).toBe(true);
      expect(result.errors.some(e => e.code === 'NO_SUPPLIER')).toBe(true);
    });
  });

  describe('executeTransition', () => {
    it('should successfully execute valid transition', async () => {
      const result = await stateMachine.executeTransition(
        mockPurchaseOrder,
        'pending_approval',
        mockTransitionContext
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.updatedPurchaseOrder).toBeDefined();
      expect(result.transition).toBeDefined();
      expect(result.transition.fromStatus).toBe('draft');
      expect(result.transition.toStatus).toBe('pending_approval');
      expect(result.transition.performedBy).toBe(mockTransitionContext.performedBy);
    });

    it('should fail to execute invalid transition', async () => {
      const result = await stateMachine.executeTransition(
        mockPurchaseOrder,
        'fully_received',
        mockTransitionContext
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.updatedPurchaseOrder).toEqual(mockPurchaseOrder);
    });

    it('should set received date when transitioning to fully_received', async () => {
      const approvedPO = { ...mockPurchaseOrder, status: 'sent' };
      const result = await stateMachine.executeTransition(
        approvedPO,
        'fully_received',
        mockTransitionContext
      );

      expect(result.isValid).toBe(true);
      expect(result.updatedPurchaseOrder.receivedDate).toBeDefined();
      expect(result.updatedPurchaseOrder.receivedDate).toBeInstanceOf(Date);
    });

    it('should generate unique transition IDs', async () => {
      const result1 = await stateMachine.executeTransition(
        mockPurchaseOrder,
        'pending_approval',
        mockTransitionContext
      );
      
      const result2 = await stateMachine.executeTransition(
        mockPurchaseOrder,
        'pending_approval',
        mockTransitionContext
      );

      expect(result1.transition.id).toBeDefined();
      expect(result2.transition.id).toBeDefined();
      expect(result1.transition.id).not.toBe(result2.transition.id);
    });
  });

  describe('getValidTransitions', () => {
    it('should return correct valid transitions for draft status', () => {
      const validTransitions = stateMachine.getValidTransitions('draft');
      expect(validTransitions).toContain('pending_approval');
      expect(validTransitions).toContain('cancelled');
      expect(validTransitions).toHaveLength(2);
    });

    it('should return correct valid transitions for approved status', () => {
      const validTransitions = stateMachine.getValidTransitions('approved');
      expect(validTransitions).toContain('sent_to_supplier');
      expect(validTransitions).toContain('partially_received');
      expect(validTransitions).toContain('fully_received');
      expect(validTransitions).toContain('cancelled');
      expect(validTransitions).toHaveLength(4);
    });

    it('should return empty array for final states', () => {
      expect(stateMachine.getValidTransitions('cancelled')).toHaveLength(0);
      expect(stateMachine.getValidTransitions('closed')).toHaveLength(0);
    });
  });

  describe('isFinalState', () => {
    it('should correctly identify final states', () => {
      expect(stateMachine.isFinalState('cancelled')).toBe(true);
      expect(stateMachine.isFinalState('closed')).toBe(true);
    });

    it('should correctly identify non-final states', () => {
      expect(stateMachine.isFinalState('draft')).toBe(false);
      expect(stateMachine.isFinalState('pending_approval')).toBe(false);
      expect(stateMachine.isFinalState('approved')).toBe(false);
      expect(stateMachine.isFinalState('partially_received')).toBe(false);
    });
  });

  describe('getNextLogicalStatus', () => {
    it('should suggest next logical status for draft', () => {
      const nextStatus = stateMachine.getNextLogicalStatus(mockPurchaseOrder);
      expect(nextStatus).toBe('pending_approval');
    });

    it('should suggest next logical status based on received quantities', () => {
      const sentPO = { ...mockPurchaseOrder, status: 'sent' };
      
      const partiallyReceivedQuantities = { 'prod-1': 5, 'prod-2': 0 };
      const nextStatus1 = stateMachine.getNextLogicalStatus(sentPO, partiallyReceivedQuantities);
      expect(nextStatus1).toBe('partially_received');

      const fullyReceivedQuantities = { 'prod-1': 10, 'prod-2': 5 };
      const nextStatus2 = stateMachine.getNextLogicalStatus(sentPO, fullyReceivedQuantities);
      expect(nextStatus2).toBe('fully_received');
    });

    it('should return null for final states', () => {
      const cancelledPO = { ...mockPurchaseOrder, status: 'cancelled' };
      const nextStatus = stateMachine.getNextLogicalStatus(cancelledPO);
      expect(nextStatus).toBeNull();
    });
  });

  describe('validateUserPermissions', () => {
    it('should allow admin to perform any transition', () => {
      const result = stateMachine.validateUserPermissions(
        'admin',
        'approved',
        mockPurchaseOrder
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow manager to approve orders', () => {
      const result = stateMachine.validateUserPermissions(
        'manager',
        'approved',
        mockPurchaseOrder
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject unauthorized user actions', () => {
      const result = stateMachine.validateUserPermissions(
        'employee',
        'approved',
        mockPurchaseOrder
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INSUFFICIENT_PERMISSIONS')).toBe(true);
    });

    it('should reject manager approval for high-value orders', () => {
      const highValuePO = { ...mockPurchaseOrder, total: 100000 };
      const result = stateMachine.validateUserPermissions(
        'manager',
        'approved',
        highValuePO
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'EXCEEDS_APPROVAL_LIMIT')).toBe(true);
    });

    it('should allow warehouse staff to receive orders', () => {
      const result = stateMachine.validateUserPermissions(
        'warehouse',
        'partially_received',
        mockPurchaseOrder
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject warehouse staff from approving orders', () => {
      const result = stateMachine.validateUserPermissions(
        'warehouse',
        'approved',
        mockPurchaseOrder
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INSUFFICIENT_PERMISSIONS')).toBe(true);
    });
  });

  describe('Legacy Status Mapping', () => {
    it('should correctly map legacy statuses to enhanced statuses', () => {
      const draftPO = { ...mockPurchaseOrder, status: 'draft' };
      const result1 = stateMachine.validateTransition(draftPO, 'pending_approval', mockTransitionContext);
      expect(result1.isValid).toBe(true);

      const sentPO = { ...mockPurchaseOrder, status: 'sent' };
      const result2 = stateMachine.validateTransition(sentPO, 'partially_received', mockTransitionContext);
      expect(result2.isValid).toBe(true);

      const partialPO = { ...mockPurchaseOrder, status: 'partial' };
      const result3 = stateMachine.validateTransition(partialPO, 'fully_received', mockTransitionContext);
      expect(result3.isValid).toBe(true);
    });

    it('should correctly map enhanced statuses back to legacy statuses', async () => {
      const result1 = await stateMachine.executeTransition(
        mockPurchaseOrder,
        'pending_approval',
        mockTransitionContext
      );
      expect(result1.updatedPurchaseOrder.status).toBe('draft');

      const result2 = await stateMachine.executeTransition(
        { ...mockPurchaseOrder, status: 'sent' },
        'fully_received',
        mockTransitionContext
      );
      expect(result2.updatedPurchaseOrder.status).toBe('received');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing transition context gracefully', () => {
      const invalidContext = {} as TransitionContext;
      const result = stateMachine.validateTransition(
        mockPurchaseOrder,
        'approved',
        invalidContext
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'NO_APPROVER')).toBe(true);
    });

    it('should validate against undefined purchase order properties', () => {
      const incompletePO = {
        ...mockPurchaseOrder,
        items: undefined as unknown as typeof mockPurchaseOrder.items,
        supplierId: undefined as unknown as string
      };

      const result = stateMachine.validateTransition(
        incompletePO,
        'pending_approval',
        mockTransitionContext
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Business Rule Edge Cases', () => {
    it('should handle empty received quantities correctly', () => {
      const sentPO = { ...mockPurchaseOrder, status: 'sent' };
      const emptyQuantities = {};
      
      const nextStatus = stateMachine.getNextLogicalStatus(sentPO, emptyQuantities);
      expect(nextStatus).toBe('partially_received');
    });

    it('should handle over-received quantities', () => {
      const sentPO = { ...mockPurchaseOrder, status: 'sent' };
      const overReceivedQuantities = { 'prod-1': 15, 'prod-2': 10 };
      
      const nextStatus = stateMachine.getNextLogicalStatus(sentPO, overReceivedQuantities);
      expect(nextStatus).toBe('fully_received');
    });

    it('should validate permission for unknown user roles', () => {
      const result = stateMachine.validateUserPermissions(
        'unknown_role',
        'approved',
        mockPurchaseOrder
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'INSUFFICIENT_PERMISSIONS')).toBe(true);
    });
  });
});