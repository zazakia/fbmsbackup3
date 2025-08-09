import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { UserRole } from '../../../types/auth';
import { PurchaseOrder, PurchaseOrderItem } from '../../../types/business';
import {
  createPurchaseOrderWithPermission,
  updatePurchaseOrderWithPermission,
  approvePurchaseOrderWithPermission,
  receivePurchaseOrderWithPermission,
  cancelPurchaseOrderWithPermission,
  getPurchaseOrdersWithPermission,
  getPurchaseOrderWithPermission,
  canPerformPurchaseOrderAction,
  getUserPurchaseOrderActions
} from '../../../api/purchaseOrderPermissionAPI';

// Mock the underlying API functions
vi.mock('../../../api/purchases', () => ({
  createPurchaseOrder: vi.fn(),
  updatePurchaseOrder: vi.fn(),
  getPurchaseOrder: vi.fn(),
  getPurchaseOrders: vi.fn(),
  receivePurchaseOrder: vi.fn()
}));

// Mock the middleware functions
vi.mock('../../../utils/purchaseOrderMiddleware', () => ({
  withPurchaseOrderPermission: vi.fn(),
  withApprovalPermission: vi.fn(),
  withReceivingPermission: vi.fn(),
  withCancellationPermission: vi.fn(),
  checkPurchaseOrderPermissionWithLogging: vi.fn(),
  getCurrentUserContext: vi.fn()
}));

// Mock the auth store
vi.mock('../../../store/supabaseAuthStore', () => ({
  useSupabaseAuthStore: {
    getState: vi.fn()
  }
}));

import {
  createPurchaseOrder,
  updatePurchaseOrder,
  getPurchaseOrder,
  getPurchaseOrders,
  receivePurchaseOrder
} from '../../../api/purchases';

import {
  withPurchaseOrderPermission,
  withApprovalPermission,
  withReceivingPermission,
  withCancellationPermission,
  checkPurchaseOrderPermissionWithLogging
} from '../../../utils/purchaseOrderMiddleware';

import { useSupabaseAuthStore } from '../../../store/supabaseAuthStore';

// Cast mocked functions
const mockCreatePurchaseOrder = createPurchaseOrder as Mock;
const mockUpdatePurchaseOrder = updatePurchaseOrder as Mock;
const mockGetPurchaseOrder = getPurchaseOrder as Mock;
const mockGetPurchaseOrders = getPurchaseOrders as Mock;
const mockReceivePurchaseOrder = receivePurchaseOrder as Mock;

const mockWithPurchaseOrderPermission = withPurchaseOrderPermission as Mock;
const mockWithApprovalPermission = withApprovalPermission as Mock;
const mockWithReceivingPermission = withReceivingPermission as Mock;
const mockWithCancellationPermission = withCancellationPermission as Mock;
const mockCheckPurchaseOrderPermissionWithLogging = checkPurchaseOrderPermissionWithLogging as Mock;

const mockUseSupabaseAuthStore = useSupabaseAuthStore as {
  getState: Mock;
};

// Sample data
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

const createMockUser = (role: UserRole = 'manager') => ({
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: { full_name: 'Test User' }
});

describe('Purchase Order Permission API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSupabaseAuthStore.getState.mockReturnValue({
      user: createMockUser(),
      userRole: 'manager'
    });
  });

  describe('createPurchaseOrderWithPermission', () => {
    it('should create purchase order when permission is granted', async () => {
      const poData = createMockPurchaseOrder();
      delete (poData as any).id;
      delete (poData as any).createdAt;

      const expectedResult = { data: createMockPurchaseOrder(), error: null };
      
      mockWithPurchaseOrderPermission.mockResolvedValue(expectedResult);

      const result = await createPurchaseOrderWithPermission(poData);

      expect(result.data).toEqual(expectedResult.data);
      expect(result.error).toBeNull();
      expect(result.permissionError).toBeUndefined();
      expect(mockWithPurchaseOrderPermission).toHaveBeenCalledWith(
        'create',
        expect.any(Function)
      );
    });

    it('should return permission error when permission is denied', async () => {
      const poData = createMockPurchaseOrder();
      delete (poData as any).id;
      delete (poData as any).createdAt;

      mockWithPurchaseOrderPermission.mockRejectedValue(new Error('INSUFFICIENT_PERMISSIONS: User does not have permission to create'));

      const result = await createPurchaseOrderWithPermission(poData);

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
      expect(result.permissionError).toEqual({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'User does not have permission to create'
      });
    });

    it('should handle API errors from underlying function', async () => {
      const poData = createMockPurchaseOrder();
      delete (poData as any).id;
      delete (poData as any).createdAt;

      const apiError = new Error('Database error');
      const expectedResult = { data: null, error: apiError };
      
      mockWithPurchaseOrderPermission.mockResolvedValue(expectedResult);

      const result = await createPurchaseOrderWithPermission(poData);

      expect(result.data).toBeNull();
      expect(result.error).toBe(apiError);
      expect(result.permissionError).toBeUndefined();
    });
  });

  describe('updatePurchaseOrderWithPermission', () => {
    it('should update purchase order with edit permission', async () => {
      const poData = createMockPurchaseOrder();
      const updates = { supplierName: 'Updated Supplier' };
      const expectedResult = { data: { ...poData, ...updates }, error: null };

      mockGetPurchaseOrder.mockResolvedValue({ data: poData, error: null });
      mockWithPurchaseOrderPermission.mockResolvedValue(expectedResult);

      const result = await updatePurchaseOrderWithPermission('po-123', updates);

      expect(result.data).toEqual(expectedResult.data);
      expect(result.error).toBeNull();
      expect(mockWithPurchaseOrderPermission).toHaveBeenCalledWith(
        'edit',
        expect.any(Function),
        poData
      );
    });

    it('should use approval permission for status changes to approved', async () => {
      const poData = createMockPurchaseOrder({ status: 'draft' });
      const updates = { status: 'approved' as const };
      const expectedResult = { data: { ...poData, ...updates }, error: null };

      mockGetPurchaseOrder.mockResolvedValue({ data: poData, error: null });
      mockWithApprovalPermission.mockResolvedValue(expectedResult);

      const result = await updatePurchaseOrderWithPermission('po-123', updates);

      expect(result.data).toEqual(expectedResult.data);
      expect(mockWithApprovalPermission).toHaveBeenCalledWith(
        poData,
        expect.any(Function)
      );
    });

    it('should use cancellation permission for status changes to cancelled', async () => {
      const poData = createMockPurchaseOrder({ status: 'draft' });
      const updates = { status: 'cancelled' as const };
      const expectedResult = { data: { ...poData, ...updates }, error: null };

      mockGetPurchaseOrder.mockResolvedValue({ data: poData, error: null });
      mockWithCancellationPermission.mockResolvedValue(expectedResult);

      const result = await updatePurchaseOrderWithPermission('po-123', updates);

      expect(result.data).toEqual(expectedResult.data);
      expect(mockWithCancellationPermission).toHaveBeenCalledWith(
        poData,
        expect.any(Function)
      );
    });

    it('should handle purchase order not found', async () => {
      const updates = { supplierName: 'Updated Supplier' };
      mockGetPurchaseOrder.mockResolvedValue({ data: null, error: new Error('Not found') });

      const result = await updatePurchaseOrderWithPermission('po-123', updates);

      expect(result.data).toBeNull();
      expect(result.error).toEqual(new Error('Not found'));
      expect(result.permissionError).toBeUndefined();
    });
  });

  describe('approvePurchaseOrderWithPermission', () => {
    it('should approve purchase order when permission is granted', async () => {
      const poData = createMockPurchaseOrder({ status: 'draft' });
      const expectedResult = { data: { ...poData, status: 'approved' }, error: null };

      mockGetPurchaseOrder.mockResolvedValue({ data: poData, error: null });
      mockWithApprovalPermission.mockResolvedValue(expectedResult);

      const result = await approvePurchaseOrderWithPermission('po-123');

      expect(result.data).toEqual(expectedResult.data);
      expect(result.error).toBeNull();
      expect(mockWithApprovalPermission).toHaveBeenCalledWith(
        poData,
        expect.any(Function)
      );
    });

    it('should reject approval for invalid status', async () => {
      const poData = createMockPurchaseOrder({ status: 'received' });
      mockGetPurchaseOrder.mockResolvedValue({ data: poData, error: null });

      const result = await approvePurchaseOrderWithPermission('po-123');

      expect(result.data).toBeNull();
      expect(result.error).toEqual(new Error('Cannot approve purchase order in status: received'));
      expect(result.permissionError).toBeUndefined();
    });

    it('should handle permission errors', async () => {
      const poData = createMockPurchaseOrder({ status: 'draft' });
      mockGetPurchaseOrder.mockResolvedValue({ data: poData, error: null });
      mockWithApprovalPermission.mockRejectedValue(new Error('APPROVAL_NOT_ALLOWED: Amount exceeds limit'));

      const result = await approvePurchaseOrderWithPermission('po-123');

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
      expect(result.permissionError).toEqual({
        code: 'APPROVAL_NOT_ALLOWED',
        message: 'Amount exceeds limit'
      });
    });
  });

  describe('receivePurchaseOrderWithPermission', () => {
    it('should receive purchase order when permission is granted', async () => {
      const poData = createMockPurchaseOrder({ status: 'approved' });
      const receivedItems: PurchaseOrderItem[] = [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Test Product',
          sku: 'TEST-001',
          quantity: 10,
          cost: 100,
          total: 1000
        }
      ];
      const expectedResult = { data: { ...poData, status: 'received' }, error: null };

      mockGetPurchaseOrder.mockResolvedValue({ data: poData, error: null });
      mockWithReceivingPermission.mockResolvedValue(expectedResult);

      const result = await receivePurchaseOrderWithPermission('po-123', receivedItems);

      expect(result.data).toEqual(expectedResult.data);
      expect(result.error).toBeNull();
      expect(mockWithReceivingPermission).toHaveBeenCalledWith(
        poData,
        expect.any(Function)
      );
    });

    it('should handle receiving permission errors', async () => {
      const poData = createMockPurchaseOrder({ status: 'approved' });
      mockGetPurchaseOrder.mockResolvedValue({ data: poData, error: null });
      mockWithReceivingPermission.mockRejectedValue(new Error('RECEIVING_NOT_ALLOWED: User does not have permission'));

      const result = await receivePurchaseOrderWithPermission('po-123');

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
      expect(result.permissionError).toEqual({
        code: 'RECEIVING_NOT_ALLOWED',
        message: 'User does not have permission'
      });
    });
  });

  describe('cancelPurchaseOrderWithPermission', () => {
    it('should cancel purchase order when permission is granted', async () => {
      const poData = createMockPurchaseOrder({ status: 'draft' });
      const expectedResult = { data: { ...poData, status: 'cancelled' }, error: null };

      mockGetPurchaseOrder.mockResolvedValue({ data: poData, error: null });
      mockWithCancellationPermission.mockResolvedValue(expectedResult);

      const result = await cancelPurchaseOrderWithPermission('po-123', 'Test cancellation');

      expect(result.data).toEqual(expectedResult.data);
      expect(result.error).toBeNull();
      expect(mockWithCancellationPermission).toHaveBeenCalledWith(
        poData,
        expect.any(Function)
      );
    });

    it('should handle cancellation permission errors', async () => {
      const poData = createMockPurchaseOrder({ status: 'draft' });
      mockGetPurchaseOrder.mockResolvedValue({ data: poData, error: null });
      mockWithCancellationPermission.mockRejectedValue(new Error('CANCELLATION_NOT_ALLOWED: Status not allowed'));

      const result = await cancelPurchaseOrderWithPermission('po-123');

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
      expect(result.permissionError).toEqual({
        code: 'CANCELLATION_NOT_ALLOWED',
        message: 'Status not allowed'
      });
    });
  });

  describe('getPurchaseOrdersWithPermission', () => {
    it('should get purchase orders when permission is granted', async () => {
      const poList = [createMockPurchaseOrder(), createMockPurchaseOrder({ id: 'po-456' })];
      const expectedResult = { data: poList, error: null };

      mockWithPurchaseOrderPermission.mockResolvedValue(expectedResult);

      const result = await getPurchaseOrdersWithPermission(10, 0);

      expect(result.data).toEqual(expectedResult.data);
      expect(result.error).toBeNull();
      expect(mockWithPurchaseOrderPermission).toHaveBeenCalledWith(
        'view',
        expect.any(Function)
      );
    });

    it('should handle view permission errors', async () => {
      mockWithPurchaseOrderPermission.mockRejectedValue(new Error('VIEW_NOT_ALLOWED: User cannot view'));

      const result = await getPurchaseOrdersWithPermission();

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
      expect(result.permissionError).toEqual({
        code: 'VIEW_NOT_ALLOWED',
        message: 'User cannot view'
      });
    });
  });

  describe('getPurchaseOrderWithPermission', () => {
    it('should get single purchase order when permission is granted', async () => {
      const poData = createMockPurchaseOrder();
      const expectedResult = { data: poData, error: null };

      mockWithPurchaseOrderPermission.mockResolvedValue(expectedResult);

      const result = await getPurchaseOrderWithPermission('po-123');

      expect(result.data).toEqual(expectedResult.data);
      expect(result.error).toBeNull();
      expect(mockWithPurchaseOrderPermission).toHaveBeenCalledWith(
        'view',
        expect.any(Function)
      );
    });
  });

  describe('canPerformPurchaseOrderAction', () => {
    it('should check if user can perform specific actions', () => {
      const poData = createMockPurchaseOrder();
      
      mockCheckPurchaseOrderPermissionWithLogging.mockReturnValue({
        allowed: true
      });

      const result = canPerformPurchaseOrderAction('edit', poData);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(mockCheckPurchaseOrderPermissionWithLogging).toHaveBeenCalledWith(
        'edit',
        poData,
        undefined
      );
    });

    it('should return reason when action is not allowed', () => {
      const poData = createMockPurchaseOrder();
      
      mockCheckPurchaseOrderPermissionWithLogging.mockReturnValue({
        allowed: false,
        error: { message: 'Permission denied' }
      });

      const result = canPerformPurchaseOrderAction('approve', poData, 50000);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Permission denied');
      expect(mockCheckPurchaseOrderPermissionWithLogging).toHaveBeenCalledWith(
        'approve',
        poData,
        50000
      );
    });
  });

  describe('getUserPurchaseOrderActions', () => {
    it('should return all user actions for a purchase order', () => {
      const poData = createMockPurchaseOrder();
      
      // Mock different permission checks
      mockCheckPurchaseOrderPermissionWithLogging
        .mockReturnValueOnce({ allowed: true })   // canView
        .mockReturnValueOnce({ allowed: true })   // canEdit
        .mockReturnValueOnce({ allowed: true })   // canApprove
        .mockReturnValueOnce({ allowed: false })  // canReceive
        .mockReturnValueOnce({ allowed: true })   // canCancel
        .mockReturnValueOnce({ allowed: true });  // canViewHistory

      const actions = getUserPurchaseOrderActions(poData);

      expect(actions).toEqual({
        canView: true,
        canEdit: true,
        canApprove: true,
        canReceive: false,
        canCancel: true,
        canViewHistory: true
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed permission error messages', async () => {
      const poData = createMockPurchaseOrder();
      delete (poData as any).id;
      delete (poData as any).createdAt;

      mockWithPurchaseOrderPermission.mockRejectedValue(new Error('Malformed error without colon'));

      const result = await createPurchaseOrderWithPermission(poData);

      expect(result.permissionError).toEqual({
        code: 'PERMISSION_DENIED',
        message: 'Malformed error without colon'
      });
    });

    it('should handle non-Error objects thrown from middleware', async () => {
      const poData = createMockPurchaseOrder();
      delete (poData as any).id;
      delete (poData as any).createdAt;

      mockWithPurchaseOrderPermission.mockRejectedValue('String error');

      const result = await createPurchaseOrderWithPermission(poData);

      expect(result.permissionError).toEqual({
        code: 'PERMISSION_DENIED',
        message: 'Permission denied'
      });
    });

    it('should handle missing purchase order in update functions', async () => {
      mockGetPurchaseOrder.mockResolvedValue({ data: null, error: null });

      const result = await updatePurchaseOrderWithPermission('po-123', { supplierName: 'Test' });

      expect(result.data).toBeNull();
      expect(result.error).toEqual(new Error('Purchase order not found'));
    });

    it('should handle API function returning undefined result', async () => {
      mockWithPurchaseOrderPermission.mockResolvedValue(undefined);

      const result = await getPurchaseOrdersWithPermission();

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  describe('Integration with Different User Roles', () => {
    it('should handle admin user permissions', async () => {
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: createMockUser('admin'),
        userRole: 'admin'
      });

      const poData = createMockPurchaseOrder();
      
      mockCheckPurchaseOrderPermissionWithLogging
        .mockReturnValue({ allowed: true });

      const actions = getUserPurchaseOrderActions(poData);

      expect(Object.values(actions).every(action => action === true)).toBe(true);
    });

    it('should handle cashier user restrictions', async () => {
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: createMockUser('cashier'),
        userRole: 'cashier'
      });

      const poData = createMockPurchaseOrder();
      
      mockCheckPurchaseOrderPermissionWithLogging
        .mockReturnValueOnce({ allowed: true })   // canView
        .mockReturnValueOnce({ allowed: false })  // canEdit
        .mockReturnValueOnce({ allowed: false })  // canApprove
        .mockReturnValueOnce({ allowed: false })  // canReceive
        .mockReturnValueOnce({ allowed: false })  // canCancel
        .mockReturnValueOnce({ allowed: false }); // canViewHistory

      const actions = getUserPurchaseOrderActions(poData);

      expect(actions.canView).toBe(true);
      expect(actions.canEdit).toBe(false);
      expect(actions.canApprove).toBe(false);
      expect(actions.canReceive).toBe(false);
      expect(actions.canCancel).toBe(false);
      expect(actions.canViewHistory).toBe(false);
    });
  });
});