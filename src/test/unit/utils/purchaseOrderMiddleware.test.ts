import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { UserRole } from '../../../types/auth';
import { PurchaseOrder } from '../../../types/business';
import {
  getCurrentUserContext,
  checkPurchaseOrderPermission,
  checkPurchaseOrderApprovalPermission,
  checkPurchaseOrderReceivingPermission,
  checkPurchaseOrderCancellationPermission,
  withPurchaseOrderPermission,
  withApprovalPermission,
  withReceivingPermission,
  withCancellationPermission,
  logPermissionCheck,
  checkPurchaseOrderPermissionWithLogging
} from '../../../utils/purchaseOrderMiddleware';

// Mock the auth store
vi.mock('../../../store/supabaseAuthStore', () => ({
  useSupabaseAuthStore: {
    getState: vi.fn()
  }
}));

import { useSupabaseAuthStore } from '../../../store/supabaseAuthStore';

const mockUseSupabaseAuthStore = useSupabaseAuthStore as {
  getState: Mock;
};

// Mock console.log for testing
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

// Sample data
const createMockUser = (role: UserRole = 'manager') => ({
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: { full_name: 'Test User' }
});

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

describe('Purchase Order Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSupabaseAuthStore.getState.mockReturnValue({
      user: null,
      userRole: null
    });
  });

  describe('getCurrentUserContext', () => {
    it('should return null when no user is authenticated', () => {
      const context = getCurrentUserContext();
      expect(context).toBeNull();
    });

    it('should return user context when user is authenticated', () => {
      const mockUser = createMockUser();
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: mockUser,
        userRole: 'manager'
      });

      const context = getCurrentUserContext();
      expect(context).toEqual({
        userId: 'user-123',
        userRole: 'manager',
        email: 'test@example.com',
        fullName: 'Test User'
      });
    });

    it('should handle user without full_name metadata', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: {}
      };
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: mockUser,
        userRole: 'manager'
      });

      const context = getCurrentUserContext();
      expect(context?.fullName).toBeUndefined();
      expect(context?.email).toBe('test@example.com');
    });
  });

  describe('checkPurchaseOrderPermission', () => {
    it('should return authentication required when no user context', () => {
      const result = checkPurchaseOrderPermission('create');
      
      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe('AUTHENTICATION_REQUIRED');
      expect(result.error?.statusCode).toBe(401);
    });

    it('should allow action when user has permission', () => {
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: createMockUser(),
        userRole: 'manager'
      });

      const result = checkPurchaseOrderPermission('create');
      
      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should deny action when user lacks permission', () => {
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: createMockUser(),
        userRole: 'employee'
      });

      const result = checkPurchaseOrderPermission('create');
      
      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe('INSUFFICIENT_PERMISSIONS');
      expect(result.error?.statusCode).toBe(403);
      expect(result.error?.message).toContain('does not have permission to create');
    });

    it('should check amount limits for approval actions', () => {
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: createMockUser(),
        userRole: 'manager'
      });

      const po = createMockPurchaseOrder({ total: 150000 });
      
      const result = checkPurchaseOrderPermission('approve', po, 150000);
      
      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('checkPurchaseOrderApprovalPermission', () => {
    it('should validate approval permission with amount checking', () => {
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: createMockUser(),
        userRole: 'manager'
      });

      const po = createMockPurchaseOrder({ total: 50000, status: 'draft' });
      
      const result = checkPurchaseOrderApprovalPermission(po);
      
      expect(result.allowed).toBe(true);
    });

    it('should reject approval when amount exceeds limit', () => {
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: createMockUser(),
        userRole: 'manager'
      });

      const po = createMockPurchaseOrder({ total: 150000, status: 'draft' });
      
      const result = checkPurchaseOrderApprovalPermission(po);
      
      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe('APPROVAL_NOT_ALLOWED');
    });

    it('should reject approval for wrong status', () => {
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: createMockUser(),
        userRole: 'manager'
      });

      const po = createMockPurchaseOrder({ total: 50000, status: 'received' });
      
      const result = checkPurchaseOrderApprovalPermission(po);
      
      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe('APPROVAL_NOT_ALLOWED');
    });
  });

  describe('checkPurchaseOrderReceivingPermission', () => {
    it('should validate receiving permission for approved orders', () => {
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: createMockUser(),
        userRole: 'manager'
      });

      const po = createMockPurchaseOrder({ status: 'approved' });
      
      const result = checkPurchaseOrderReceivingPermission(po);
      
      expect(result.allowed).toBe(true);
    });

    it('should reject receiving for unauthorized users', () => {
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: createMockUser(),
        userRole: 'cashier'
      });

      const po = createMockPurchaseOrder({ status: 'approved' });
      
      const result = checkPurchaseOrderReceivingPermission(po);
      
      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe('RECEIVING_NOT_ALLOWED');
    });

    it('should reject receiving for wrong status', () => {
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: createMockUser(),
        userRole: 'manager'
      });

      const po = createMockPurchaseOrder({ status: 'draft' });
      
      const result = checkPurchaseOrderReceivingPermission(po);
      
      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe('RECEIVING_NOT_ALLOWED');
    });
  });

  describe('checkPurchaseOrderCancellationPermission', () => {
    it('should validate cancellation permission for valid statuses', () => {
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: createMockUser(),
        userRole: 'manager'
      });

      const po = createMockPurchaseOrder({ status: 'draft' });
      
      const result = checkPurchaseOrderCancellationPermission(po);
      
      expect(result.allowed).toBe(true);
    });

    it('should reject cancellation for unauthorized users', () => {
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: createMockUser(),
        userRole: 'cashier'
      });

      const po = createMockPurchaseOrder({ status: 'draft' });
      
      const result = checkPurchaseOrderCancellationPermission(po);
      
      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe('CANCELLATION_NOT_ALLOWED');
    });

    it('should reject cancellation for received orders', () => {
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: createMockUser(),
        userRole: 'manager'
      });

      const po = createMockPurchaseOrder({ status: 'received' });
      
      const result = checkPurchaseOrderCancellationPermission(po);
      
      expect(result.allowed).toBe(false);
      expect(result.error?.code).toBe('CANCELLATION_NOT_ALLOWED');
    });
  });

  describe('Permission Wrapper Functions', () => {
    describe('withPurchaseOrderPermission', () => {
      it('should execute function when permission is granted', async () => {
        mockUseSupabaseAuthStore.getState.mockReturnValue({
          user: createMockUser(),
          userRole: 'manager'
        });

        const mockApiFunction = vi.fn().mockResolvedValue({ data: 'success' });
        
        const result = await withPurchaseOrderPermission('create', mockApiFunction);
        
        expect(mockApiFunction).toHaveBeenCalled();
        expect(result).toEqual({ data: 'success' });
      });

      it('should throw error when permission is denied', async () => {
        mockUseSupabaseAuthStore.getState.mockReturnValue({
          user: createMockUser(),
          userRole: 'employee'
        });

        const mockApiFunction = vi.fn();
        
        await expect(
          withPurchaseOrderPermission('create', mockApiFunction)
        ).rejects.toThrow('INSUFFICIENT_PERMISSIONS');
        
        expect(mockApiFunction).not.toHaveBeenCalled();
      });
    });

    describe('withApprovalPermission', () => {
      it('should execute function for valid approval', async () => {
        mockUseSupabaseAuthStore.getState.mockReturnValue({
          user: createMockUser(),
          userRole: 'manager'
        });

        const po = createMockPurchaseOrder({ total: 50000, status: 'draft' });
        const mockApiFunction = vi.fn().mockResolvedValue({ data: 'approved' });
        
        const result = await withApprovalPermission(po, mockApiFunction);
        
        expect(mockApiFunction).toHaveBeenCalled();
        expect(result).toEqual({ data: 'approved' });
      });

      it('should throw error for invalid approval', async () => {
        mockUseSupabaseAuthStore.getState.mockReturnValue({
          user: createMockUser(),
          userRole: 'manager'
        });

        const po = createMockPurchaseOrder({ total: 150000, status: 'draft' });
        const mockApiFunction = vi.fn();
        
        await expect(
          withApprovalPermission(po, mockApiFunction)
        ).rejects.toThrow('APPROVAL_NOT_ALLOWED');
        
        expect(mockApiFunction).not.toHaveBeenCalled();
      });
    });

    describe('withReceivingPermission', () => {
      it('should execute function for valid receiving', async () => {
        mockUseSupabaseAuthStore.getState.mockReturnValue({
          user: createMockUser(),
          userRole: 'manager'
        });

        const po = createMockPurchaseOrder({ status: 'approved' });
        const mockApiFunction = vi.fn().mockResolvedValue({ data: 'received' });
        
        const result = await withReceivingPermission(po, mockApiFunction);
        
        expect(mockApiFunction).toHaveBeenCalled();
        expect(result).toEqual({ data: 'received' });
      });

      it('should throw error for invalid receiving', async () => {
        mockUseSupabaseAuthStore.getState.mockReturnValue({
          user: createMockUser(),
          userRole: 'cashier'
        });

        const po = createMockPurchaseOrder({ status: 'approved' });
        const mockApiFunction = vi.fn();
        
        await expect(
          withReceivingPermission(po, mockApiFunction)
        ).rejects.toThrow('RECEIVING_NOT_ALLOWED');
        
        expect(mockApiFunction).not.toHaveBeenCalled();
      });
    });

    describe('withCancellationPermission', () => {
      it('should execute function for valid cancellation', async () => {
        mockUseSupabaseAuthStore.getState.mockReturnValue({
          user: createMockUser(),
          userRole: 'manager'
        });

        const po = createMockPurchaseOrder({ status: 'draft' });
        const mockApiFunction = vi.fn().mockResolvedValue({ data: 'cancelled' });
        
        const result = await withCancellationPermission(po, mockApiFunction);
        
        expect(mockApiFunction).toHaveBeenCalled();
        expect(result).toEqual({ data: 'cancelled' });
      });

      it('should throw error for invalid cancellation', async () => {
        mockUseSupabaseAuthStore.getState.mockReturnValue({
          user: createMockUser(),
          userRole: 'cashier'
        });

        const po = createMockPurchaseOrder({ status: 'draft' });
        const mockApiFunction = vi.fn();
        
        await expect(
          withCancellationPermission(po, mockApiFunction)
        ).rejects.toThrow('CANCELLATION_NOT_ALLOWED');
        
        expect(mockApiFunction).not.toHaveBeenCalled();
      });
    });
  });

  describe('logPermissionCheck', () => {
    it('should log permission check attempts', () => {
      const userContext = {
        userId: 'user-123',
        userRole: 'manager' as UserRole,
        email: 'test@example.com',
        fullName: 'Test User'
      };

      const po = createMockPurchaseOrder();
      
      logPermissionCheck('approve', true, userContext, po, 'Permission granted');
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[PURCHASE_ORDER_PERMISSION_CHECK]',
        expect.objectContaining({
          action: 'approve',
          allowed: true,
          userId: 'user-123',
          userRole: 'manager',
          purchaseOrderId: 'po-123',
          purchaseOrderNumber: 'PO-2024-001',
          reason: 'Permission granted'
        })
      );
    });

    it('should handle missing user context in logging', () => {
      logPermissionCheck('create', false, undefined, undefined, 'No user context');
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[PURCHASE_ORDER_PERMISSION_CHECK]',
        expect.objectContaining({
          action: 'create',
          allowed: false,
          userId: 'anonymous',
          userRole: 'unknown',
          reason: 'No user context'
        })
      );
    });
  });

  describe('checkPurchaseOrderPermissionWithLogging', () => {
    it('should check permission and log the result', () => {
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: createMockUser(),
        userRole: 'manager'
      });

      const result = checkPurchaseOrderPermissionWithLogging('create');
      
      expect(result.allowed).toBe(true);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[PURCHASE_ORDER_PERMISSION_CHECK]',
        expect.objectContaining({
          action: 'create',
          allowed: true,
          userRole: 'manager'
        })
      );
    });

    it('should log permission denials', () => {
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: createMockUser(),
        userRole: 'employee'
      });

      const result = checkPurchaseOrderPermissionWithLogging('create');
      
      expect(result.allowed).toBe(false);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[PURCHASE_ORDER_PERMISSION_CHECK]',
        expect.objectContaining({
          action: 'create',
          allowed: false,
          userRole: 'employee',
          reason: expect.stringContaining('does not have permission to create')
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API function errors gracefully in permission wrappers', async () => {
      mockUseSupabaseAuthStore.getState.mockReturnValue({
        user: createMockUser(),
        userRole: 'manager'
      });

      const mockApiFunction = vi.fn().mockRejectedValue(new Error('API Error'));
      
      await expect(
        withPurchaseOrderPermission('create', mockApiFunction)
      ).rejects.toThrow('API Error');
      
      expect(mockApiFunction).toHaveBeenCalled();
    });

    it('should handle network errors in permission checks', () => {
      // Simulate network error scenario
      mockUseSupabaseAuthStore.getState.mockImplementation(() => {
        throw new Error('Network error');
      });

      expect(() => checkPurchaseOrderPermission('create')).toThrow('Network error');
    });
  });
});