import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { UserRole } from '../../../types/auth';
import { PurchaseOrder, EnhancedPurchaseOrderStatus } from '../../../types/business';
import {
  hasPurchaseOrderPermission,
  getPurchaseOrderPermissions,
  canPerformActionOnStatus,
  getAllowedActionsForStatus,
  validatePurchaseOrderApproval,
  validatePurchaseOrderReceiving,
  validatePurchaseOrderCancellation,
  getPurchaseOrderPermissionDeniedMessage,
  PurchaseOrderAction
} from '../../../utils/purchaseOrderPermissions';

// Mock window and localStorage for testing
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Sample purchase order data
const createMockPurchaseOrder = (overrides?: Partial<PurchaseOrder>): PurchaseOrder => ({
  id: 'po-123',
  poNumber: 'PO-2024-001',
  supplierId: 'sup-1',
  supplierName: 'Test Supplier',
  items: [
    {
      id: 'item-1',
      productId: 'prod-1',
      productName: 'Test Product',
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
  createdBy: 'user-1',
  createdAt: new Date('2024-01-01'),
  ...overrides
});

describe('Purchase Order Permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage mock
    (window.localStorage.getItem as Mock).mockReturnValue(null);
  });

  describe('hasPurchaseOrderPermission', () => {
    it('should grant all permissions to admin users', () => {
      expect(hasPurchaseOrderPermission('admin', 'create')).toBe(true);
      expect(hasPurchaseOrderPermission('admin', 'edit')).toBe(true);
      expect(hasPurchaseOrderPermission('admin', 'approve')).toBe(true);
      expect(hasPurchaseOrderPermission('admin', 'receive')).toBe(true);
      expect(hasPurchaseOrderPermission('admin', 'cancel')).toBe(true);
      expect(hasPurchaseOrderPermission('admin', 'view_history')).toBe(true);
    });

    it('should grant appropriate permissions to manager users', () => {
      expect(hasPurchaseOrderPermission('manager', 'create')).toBe(true);
      expect(hasPurchaseOrderPermission('manager', 'edit')).toBe(true);
      expect(hasPurchaseOrderPermission('manager', 'approve')).toBe(true);
      expect(hasPurchaseOrderPermission('manager', 'receive')).toBe(true);
      expect(hasPurchaseOrderPermission('manager', 'cancel')).toBe(true);
      expect(hasPurchaseOrderPermission('manager', 'view_history')).toBe(true);
    });

    it('should restrict permissions for cashier users', () => {
      expect(hasPurchaseOrderPermission('cashier', 'create')).toBe(false);
      expect(hasPurchaseOrderPermission('cashier', 'edit')).toBe(false);
      expect(hasPurchaseOrderPermission('cashier', 'approve')).toBe(false);
      expect(hasPurchaseOrderPermission('cashier', 'receive')).toBe(false);
      expect(hasPurchaseOrderPermission('cashier', 'cancel')).toBe(false);
      expect(hasPurchaseOrderPermission('cashier', 'view')).toBe(true);
      expect(hasPurchaseOrderPermission('cashier', 'view_history')).toBe(false);
    });

    it('should restrict permissions for accountant users', () => {
      expect(hasPurchaseOrderPermission('accountant', 'create')).toBe(false);
      expect(hasPurchaseOrderPermission('accountant', 'edit')).toBe(false);
      expect(hasPurchaseOrderPermission('accountant', 'approve')).toBe(false);
      expect(hasPurchaseOrderPermission('accountant', 'receive')).toBe(false);
      expect(hasPurchaseOrderPermission('accountant', 'cancel')).toBe(false);
      expect(hasPurchaseOrderPermission('accountant', 'view')).toBe(true);
      expect(hasPurchaseOrderPermission('accountant', 'view_history')).toBe(true);
      expect(hasPurchaseOrderPermission('accountant', 'view_audit_trail')).toBe(true);
    });

    it('should restrict all permissions for employee users', () => {
      const actions: PurchaseOrderAction[] = ['create', 'view', 'edit', 'approve', 'receive', 'cancel', 'view_history', 'view_audit_trail'];
      actions.forEach(action => {
        expect(hasPurchaseOrderPermission('employee', action)).toBe(false);
      });
    });

    it('should enforce approval amount limits for managers', () => {
      const po = createMockPurchaseOrder({ total: 150000 }); // Above 100k limit
      
      expect(hasPurchaseOrderPermission('manager', 'approve', po, 50000)).toBe(true);
      expect(hasPurchaseOrderPermission('manager', 'approve', po, 100000)).toBe(true);
      expect(hasPurchaseOrderPermission('manager', 'approve', po, 150000)).toBe(false);
    });

    it('should check status-based permissions when purchase order is provided', () => {
      const draftPO = createMockPurchaseOrder({ status: 'draft' });
      const receivedPO = createMockPurchaseOrder({ status: 'received' });
      
      expect(hasPurchaseOrderPermission('manager', 'approve', draftPO)).toBe(true);
      expect(hasPurchaseOrderPermission('manager', 'approve', receivedPO)).toBe(false);
      
      expect(hasPurchaseOrderPermission('manager', 'receive', draftPO)).toBe(false);
      expect(hasPurchaseOrderPermission('manager', 'cancel', receivedPO)).toBe(false);
    });

    it('should handle emergency bypass for specific user', () => {
      (window.localStorage.getItem as Mock).mockReturnValue('{"user":{"email":"cybergada@gmail.com"}}');
      
      expect(hasPurchaseOrderPermission('employee', 'create')).toBe(true);
      expect(hasPurchaseOrderPermission('employee', 'approve')).toBe(true);
    });
  });

  describe('getPurchaseOrderPermissions', () => {
    it('should return correct permissions for each role', () => {
      const adminPerms = getPurchaseOrderPermissions('admin');
      expect(adminPerms.canCreate).toBe(true);
      expect(adminPerms.canApprove).toBe(true);
      expect(adminPerms.maxApprovalAmount).toBeUndefined();

      const managerPerms = getPurchaseOrderPermissions('manager');
      expect(managerPerms.canCreate).toBe(true);
      expect(managerPerms.canApprove).toBe(true);
      expect(managerPerms.maxApprovalAmount).toBe(100000);

      const cashierPerms = getPurchaseOrderPermissions('cashier');
      expect(cashierPerms.canCreate).toBe(false);
      expect(cashierPerms.canApprove).toBe(false);
      expect(cashierPerms.canView).toBe(true);

      const employeePerms = getPurchaseOrderPermissions('employee');
      expect(employeePerms.canCreate).toBe(false);
      expect(employeePerms.canView).toBe(false);
    });
  });

  describe('canPerformActionOnStatus', () => {
    it('should allow correct actions for draft status', () => {
      expect(canPerformActionOnStatus('view', 'draft')).toBe(true);
      expect(canPerformActionOnStatus('edit', 'draft')).toBe(true);
      expect(canPerformActionOnStatus('approve', 'draft')).toBe(true);
      expect(canPerformActionOnStatus('cancel', 'draft')).toBe(true);
      expect(canPerformActionOnStatus('receive', 'draft')).toBe(false);
    });

    it('should allow correct actions for approved status', () => {
      expect(canPerformActionOnStatus('view', 'approved')).toBe(true);
      expect(canPerformActionOnStatus('receive', 'approved')).toBe(true);
      expect(canPerformActionOnStatus('cancel', 'approved')).toBe(true);
      expect(canPerformActionOnStatus('edit', 'approved')).toBe(false);
      expect(canPerformActionOnStatus('approve', 'approved')).toBe(false);
    });

    it('should allow correct actions for fully_received status', () => {
      expect(canPerformActionOnStatus('view', 'fully_received')).toBe(true);
      expect(canPerformActionOnStatus('view_history', 'fully_received')).toBe(true);
      expect(canPerformActionOnStatus('view_audit_trail', 'fully_received')).toBe(true);
      expect(canPerformActionOnStatus('edit', 'fully_received')).toBe(false);
      expect(canPerformActionOnStatus('approve', 'fully_received')).toBe(false);
      expect(canPerformActionOnStatus('receive', 'fully_received')).toBe(false);
    });
  });

  describe('getAllowedActionsForStatus', () => {
    it('should return correct actions for each status', () => {
      const draftActions = getAllowedActionsForStatus('draft');
      expect(draftActions).toContain('view');
      expect(draftActions).toContain('edit');
      expect(draftActions).toContain('approve');
      expect(draftActions).toContain('cancel');

      const approvedActions = getAllowedActionsForStatus('approved');
      expect(approvedActions).toContain('view');
      expect(approvedActions).toContain('receive');
      expect(approvedActions).toContain('cancel');
      expect(approvedActions).toContain('view_history');

      const cancelledActions = getAllowedActionsForStatus('cancelled');
      expect(cancelledActions).toContain('view');
      expect(cancelledActions).toContain('view_history');
      expect(cancelledActions).toContain('view_audit_trail');
      expect(cancelledActions).not.toContain('edit');
      expect(cancelledActions).not.toContain('approve');
    });
  });

  describe('validatePurchaseOrderApproval', () => {
    it('should validate successful approval for authorized users', () => {
      const po = createMockPurchaseOrder({ total: 50000 });
      
      const adminResult = validatePurchaseOrderApproval('admin', 50000, po);
      expect(adminResult.isValid).toBe(true);
      
      const managerResult = validatePurchaseOrderApproval('manager', 50000, po);
      expect(managerResult.isValid).toBe(true);
    });

    it('should reject approval for unauthorized users', () => {
      const po = createMockPurchaseOrder({ total: 50000 });
      
      const cashierResult = validatePurchaseOrderApproval('cashier', 50000, po);
      expect(cashierResult.isValid).toBe(false);
      expect(cashierResult.reason).toContain('does not have permission to approve');
    });

    it('should reject approval when amount exceeds limit', () => {
      const po = createMockPurchaseOrder({ total: 150000 });
      
      const managerResult = validatePurchaseOrderApproval('manager', 150000, po);
      expect(managerResult.isValid).toBe(false);
      expect(managerResult.reason).toContain('exceeds limit');
    });

    it('should reject approval for invalid status', () => {
      const po = createMockPurchaseOrder({ status: 'received', total: 50000 });
      
      const adminResult = validatePurchaseOrderApproval('admin', 50000, po);
      expect(adminResult.isValid).toBe(false);
      expect(adminResult.reason).toContain('Cannot approve purchase order in status');
    });
  });

  describe('validatePurchaseOrderReceiving', () => {
    it('should validate successful receiving for authorized users', () => {
      const po = createMockPurchaseOrder({ status: 'approved' });
      
      const adminResult = validatePurchaseOrderReceiving('admin', po);
      expect(adminResult.isValid).toBe(true);
      
      const managerResult = validatePurchaseOrderReceiving('manager', po);
      expect(managerResult.isValid).toBe(true);
    });

    it('should reject receiving for unauthorized users', () => {
      const po = createMockPurchaseOrder({ status: 'approved' });
      
      const cashierResult = validatePurchaseOrderReceiving('cashier', po);
      expect(cashierResult.isValid).toBe(false);
      expect(cashierResult.reason).toContain('does not have permission to receive');
    });

    it('should reject receiving for invalid status', () => {
      const po = createMockPurchaseOrder({ status: 'draft' });
      
      const adminResult = validatePurchaseOrderReceiving('admin', po);
      expect(adminResult.isValid).toBe(false);
      expect(adminResult.reason).toContain('Cannot receive items for purchase order in status');
    });
  });

  describe('validatePurchaseOrderCancellation', () => {
    it('should validate successful cancellation for authorized users', () => {
      const po = createMockPurchaseOrder({ status: 'draft' });
      
      const adminResult = validatePurchaseOrderCancellation('admin', po);
      expect(adminResult.isValid).toBe(true);
      
      const managerResult = validatePurchaseOrderCancellation('manager', po);
      expect(managerResult.isValid).toBe(true);
    });

    it('should reject cancellation for unauthorized users', () => {
      const po = createMockPurchaseOrder({ status: 'draft' });
      
      const cashierResult = validatePurchaseOrderCancellation('cashier', po);
      expect(cashierResult.isValid).toBe(false);
      expect(cashierResult.reason).toContain('does not have permission to cancel');
    });

    it('should reject cancellation for invalid status', () => {
      const po = createMockPurchaseOrder({ status: 'received' });
      
      const adminResult = validatePurchaseOrderCancellation('admin', po);
      expect(adminResult.isValid).toBe(false);
      expect(adminResult.reason).toContain('Cannot cancel purchase order in status');
    });
  });

  describe('getPurchaseOrderPermissionDeniedMessage', () => {
    it('should return appropriate messages for role-based restrictions', () => {
      const message = getPurchaseOrderPermissionDeniedMessage('cashier', 'create');
      expect(message).toContain("role 'cashier' does not have permission to create");
    });

    it('should return appropriate messages for status-based restrictions', () => {
      const po = createMockPurchaseOrder({ status: 'received' });
      const message = getPurchaseOrderPermissionDeniedMessage('admin', 'approve', po);
      expect(message).toContain("cannot be performed on a purchase order with status 'received'");
    });

    it('should return specific messages for different actions', () => {
      expect(getPurchaseOrderPermissionDeniedMessage('employee', 'approve')).toContain('approve purchase orders');
      expect(getPurchaseOrderPermissionDeniedMessage('employee', 'receive')).toContain('receive purchase orders');
      expect(getPurchaseOrderPermissionDeniedMessage('employee', 'cancel')).toContain('cancel purchase orders');
      expect(getPurchaseOrderPermissionDeniedMessage('employee', 'view_history')).toContain('view purchase order history');
    });
  });
});

describe('Edge Cases and Error Handling', () => {
  it('should handle unknown user roles gracefully', () => {
    const unknownRole = 'unknown' as UserRole;
    expect(hasPurchaseOrderPermission(unknownRole, 'view')).toBe(false);
    
    const permissions = getPurchaseOrderPermissions(unknownRole);
    expect(permissions.canView).toBe(false);
    expect(permissions.canCreate).toBe(false);
  });

  it('should handle undefined purchase order gracefully', () => {
    expect(hasPurchaseOrderPermission('manager', 'approve', undefined, 50000)).toBe(true);
    expect(hasPurchaseOrderPermission('manager', 'view', undefined)).toBe(true);
  });

  it('should handle undefined amount for approval', () => {
    const po = createMockPurchaseOrder();
    expect(hasPurchaseOrderPermission('manager', 'approve', po)).toBe(true);
  });

  it('should handle edge case status values', () => {
    const unknownStatus = 'unknown_status' as EnhancedPurchaseOrderStatus;
    const actions = getAllowedActionsForStatus(unknownStatus);
    expect(actions).toEqual([]);
    
    expect(canPerformActionOnStatus('view', unknownStatus)).toBe(false);
  });
});

describe('Integration Scenarios', () => {
  it('should handle complete purchase order workflow permissions', () => {
    const po = createMockPurchaseOrder({ status: 'draft', total: 50000 });
    
    // Draft: Manager can edit and approve
    expect(hasPurchaseOrderPermission('manager', 'edit', { ...po, status: 'draft' })).toBe(true);
    expect(hasPurchaseOrderPermission('manager', 'approve', { ...po, status: 'draft' }, 50000)).toBe(true);
    
    // Approved: Manager can receive and cancel, but not edit
    expect(hasPurchaseOrderPermission('manager', 'receive', { ...po, status: 'approved' })).toBe(true);
    expect(hasPurchaseOrderPermission('manager', 'cancel', { ...po, status: 'approved' })).toBe(true);
    expect(hasPurchaseOrderPermission('manager', 'edit', { ...po, status: 'approved' })).toBe(false);
    
    // Received: Manager can only view and view history
    expect(hasPurchaseOrderPermission('manager', 'view', { ...po, status: 'received' })).toBe(true);
    expect(hasPurchaseOrderPermission('manager', 'view_history', { ...po, status: 'received' })).toBe(true);
    expect(hasPurchaseOrderPermission('manager', 'edit', { ...po, status: 'received' })).toBe(false);
    expect(hasPurchaseOrderPermission('manager', 'receive', { ...po, status: 'received' })).toBe(false);
  });

  it('should handle multi-user role scenario', () => {
    const po = createMockPurchaseOrder({ total: 50000 });
    
    const roles: UserRole[] = ['admin', 'manager', 'cashier', 'accountant', 'employee'];
    
    roles.forEach(role => {
      const permissions = getPurchaseOrderPermissions(role);
      const canApprove = hasPurchaseOrderPermission(role, 'approve', po, 50000);
      
      if (role === 'admin' || role === 'manager') {
        expect(canApprove).toBe(true);
        expect(permissions.canApprove).toBe(true);
      } else {
        expect(canApprove).toBe(false);
        expect(permissions.canApprove).toBe(false);
      }
    });
  });
});