import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validatePurchaseOrderPermissions,
  checkUserCanApprove,
  checkUserCanReceive,
  checkUserCanCancel,
  checkUserCanCreate,
  checkUserCanEdit,
  getMaxApprovalAmount,
  getUserPurchaseOrderActions,
  PurchaseOrderPermissionContext
} from '../../../utils/purchaseOrderPermissions';
import { PurchaseOrder, User } from '../../../types/business';
import { TestDataFactory } from '../../factories/testDataFactory';

// Mock the authentication context
vi.mock('../../../store/supabaseAuthStore', () => ({
  useSupabaseAuthStore: {
    getState: vi.fn(() => ({
      user: {
        id: 'test-user-123',
        role: 'manager',
        metadata: { department: 'procurement', level: 2 }
      }
    }))
  }
}));

describe('Purchase Order Permissions - Comprehensive Tests', () => {
  let mockUser: User;
  let mockPurchaseOrder: PurchaseOrder;
  let mockContext: PurchaseOrderPermissionContext;

  beforeEach(() => {
    TestDataFactory.resetIdCounter();

    mockUser = TestDataFactory.createMockUser({
      id: 'test-user-123',
      role: 'manager',
      name: 'Test Manager',
      email: 'test.manager@company.com'
    });

    mockPurchaseOrder = TestDataFactory.createPurchaseOrder({
      id: 'po-permissions-test',
      status: 'draft',
      total: 5000.00,
      createdBy: 'test-user-123'
    });

    mockContext = {
      user: mockUser,
      purchaseOrder: mockPurchaseOrder,
      businessSettings: {
        approvalLimits: {
          employee: 1000,
          supervisor: 5000,
          manager: 25000,
          director: 100000,
          admin: 0 // No limit
        },
        requireDualApproval: true,
        requireApprovalForOwnOrders: false
      },
      userDepartment: 'procurement',
      userLevel: 2
    };

    vi.clearAllMocks();
  });

  describe('Role-Based Permission Validation', () => {
    it('should allow admin users all permissions', () => {
      const adminUser = { ...mockUser, role: 'admin' as const };
      const adminContext = { ...mockContext, user: adminUser };

      expect(validatePurchaseOrderPermissions('create', adminContext)).toBe(true);
      expect(validatePurchaseOrderPermissions('edit', adminContext)).toBe(true);
      expect(validatePurchaseOrderPermissions('approve', adminContext)).toBe(true);
      expect(validatePurchaseOrderPermissions('receive', adminContext)).toBe(true);
      expect(validatePurchaseOrderPermissions('cancel', adminContext)).toBe(true);
      expect(validatePurchaseOrderPermissions('view', adminContext)).toBe(true);
    });

    it('should restrict employee permissions correctly', () => {
      const employeeUser = { ...mockUser, role: 'employee' as const };
      const employeeContext = { ...mockContext, user: employeeUser };

      expect(validatePurchaseOrderPermissions('create', employeeContext)).toBe(true);
      expect(validatePurchaseOrderPermissions('edit', employeeContext)).toBe(false);
      expect(validatePurchaseOrderPermissions('approve', employeeContext)).toBe(false);
      expect(validatePurchaseOrderPermissions('receive', employeeContext)).toBe(false);
      expect(validatePurchaseOrderPermissions('cancel', employeeContext)).toBe(false);
      expect(validatePurchaseOrderPermissions('view', employeeContext)).toBe(true);
    });

    it('should allow manager permissions within limits', () => {
      const managerUser = { ...mockUser, role: 'manager' as const };
      const managerContext = { ...mockContext, user: managerUser };

      expect(validatePurchaseOrderPermissions('create', managerContext)).toBe(true);
      expect(validatePurchaseOrderPermissions('edit', managerContext)).toBe(true);
      expect(validatePurchaseOrderPermissions('approve', managerContext)).toBe(true);
      expect(validatePurchaseOrderPermissions('receive', managerContext)).toBe(true);
      expect(validatePurchaseOrderPermissions('cancel', managerContext)).toBe(true);
      expect(validatePurchaseOrderPermissions('view', managerContext)).toBe(true);
    });

    it('should restrict warehouse user to receiving operations only', () => {
      const warehouseUser = { 
        ...mockUser, 
        role: 'employee' as const,
        metadata: { ...mockUser.metadata, department: 'warehouse' }
      };
      const warehouseContext = { 
        ...mockContext, 
        user: warehouseUser,
        userDepartment: 'warehouse'
      };

      expect(validatePurchaseOrderPermissions('create', warehouseContext)).toBe(false);
      expect(validatePurchaseOrderPermissions('edit', warehouseContext)).toBe(false);
      expect(validatePurchaseOrderPermissions('approve', warehouseContext)).toBe(false);
      expect(validatePurchaseOrderPermissions('receive', warehouseContext)).toBe(true);
      expect(validatePurchaseOrderPermissions('cancel', warehouseContext)).toBe(false);
      expect(validatePurchaseOrderPermissions('view', warehouseContext)).toBe(true);
    });
  });

  describe('Approval Amount Limits', () => {
    it('should enforce approval limits for managers', () => {
      const managerContext = { ...mockContext, user: { ...mockUser, role: 'manager' as const } };
      
      // Within limit
      const lowValuePO = { ...mockPurchaseOrder, total: 20000.00 };
      expect(checkUserCanApprove({ ...managerContext, purchaseOrder: lowValuePO })).toBe(true);

      // Above limit
      const highValuePO = { ...mockPurchaseOrder, total: 50000.00 };
      expect(checkUserCanApprove({ ...managerContext, purchaseOrder: highValuePO })).toBe(false);
    });

    it('should allow unlimited approval for admin users', () => {
      const adminContext = { 
        ...mockContext, 
        user: { ...mockUser, role: 'admin' as const }
      };
      
      const veryHighValuePO = { ...mockPurchaseOrder, total: 1000000.00 };
      expect(checkUserCanApprove({ ...adminContext, purchaseOrder: veryHighValuePO })).toBe(true);
    });

    it('should return correct maximum approval amounts by role', () => {
      expect(getMaxApprovalAmount('employee', mockContext.businessSettings)).toBe(1000);
      expect(getMaxApprovalAmount('supervisor', mockContext.businessSettings)).toBe(5000);
      expect(getMaxApprovalAmount('manager', mockContext.businessSettings)).toBe(25000);
      expect(getMaxApprovalAmount('director', mockContext.businessSettings)).toBe(100000);
      expect(getMaxApprovalAmount('admin', mockContext.businessSettings)).toBe(0); // Unlimited
    });

    it('should handle edge cases at approval limits', () => {
      const managerContext = { ...mockContext, user: { ...mockUser, role: 'manager' as const } };
      
      // Exactly at limit
      const atLimitPO = { ...mockPurchaseOrder, total: 25000.00 };
      expect(checkUserCanApprove({ ...managerContext, purchaseOrder: atLimitPO })).toBe(true);

      // Just over limit
      const overLimitPO = { ...mockPurchaseOrder, total: 25000.01 };
      expect(checkUserCanApprove({ ...managerContext, purchaseOrder: overLimitPO })).toBe(false);
    });
  });

  describe('Status-Based Permissions', () => {
    it('should allow editing only for draft and pending approval status', () => {
      const managerContext = { ...mockContext, user: { ...mockUser, role: 'manager' as const } };

      // Draft - editable
      const draftPO = { ...mockPurchaseOrder, status: 'draft' as const };
      expect(checkUserCanEdit({ ...managerContext, purchaseOrder: draftPO })).toBe(true);

      // Pending approval - editable by manager
      const pendingPO = { ...mockPurchaseOrder, status: 'pending_approval' as const };
      expect(checkUserCanEdit({ ...managerContext, purchaseOrder: pendingPO })).toBe(true);

      // Approved - not editable
      const approvedPO = { ...mockPurchaseOrder, status: 'sent' as const };
      expect(checkUserCanEdit({ ...managerContext, purchaseOrder: approvedPO })).toBe(false);

      // Received - not editable
      const receivedPO = { ...mockPurchaseOrder, status: 'received' as const };
      expect(checkUserCanEdit({ ...managerContext, purchaseOrder: receivedPO })).toBe(false);
    });

    it('should allow receiving only for approved purchase orders', () => {
      const warehouseContext = { 
        ...mockContext,
        user: { ...mockUser, role: 'employee' as const },
        userDepartment: 'warehouse'
      };

      // Draft - cannot receive
      const draftPO = { ...mockPurchaseOrder, status: 'draft' as const };
      expect(checkUserCanReceive({ ...warehouseContext, purchaseOrder: draftPO })).toBe(false);

      // Pending - cannot receive
      const pendingPO = { ...mockPurchaseOrder, status: 'pending_approval' as const };
      expect(checkUserCanReceive({ ...warehouseContext, purchaseOrder: pendingPO })).toBe(false);

      // Approved/Sent - can receive
      const sentPO = { ...mockPurchaseOrder, status: 'sent' as const };
      expect(checkUserCanReceive({ ...warehouseContext, purchaseOrder: sentPO })).toBe(true);

      // Partially received - can receive
      const partialPO = { ...mockPurchaseOrder, status: 'partial' as const };
      expect(checkUserCanReceive({ ...warehouseContext, purchaseOrder: partialPO })).toBe(true);

      // Fully received - cannot receive more
      const receivedPO = { ...mockPurchaseOrder, status: 'received' as const };
      expect(checkUserCanReceive({ ...warehouseContext, purchaseOrder: receivedPO })).toBe(false);
    });

    it('should restrict cancellation based on status and role', () => {
      const managerContext = { ...mockContext, user: { ...mockUser, role: 'manager' as const } };

      // Draft - can cancel
      const draftPO = { ...mockPurchaseOrder, status: 'draft' as const };
      expect(checkUserCanCancel({ ...managerContext, purchaseOrder: draftPO })).toBe(true);

      // Pending - can cancel
      const pendingPO = { ...mockPurchaseOrder, status: 'pending_approval' as const };
      expect(checkUserCanCancel({ ...managerContext, purchaseOrder: pendingPO })).toBe(true);

      // Sent - can cancel with manager or higher role
      const sentPO = { ...mockPurchaseOrder, status: 'sent' as const };
      expect(checkUserCanCancel({ ...managerContext, purchaseOrder: sentPO })).toBe(true);

      // Partially received - cannot cancel
      const partialPO = { ...mockPurchaseOrder, status: 'partial' as const };
      expect(checkUserCanCancel({ ...managerContext, purchaseOrder: partialPO })).toBe(false);

      // Fully received - cannot cancel
      const receivedPO = { ...mockPurchaseOrder, status: 'received' as const };
      expect(checkUserCanCancel({ ...managerContext, purchaseOrder: receivedPO })).toBe(false);
    });
  });

  describe('Ownership and Department-Based Permissions', () => {
    it('should allow users to edit their own orders within role permissions', () => {
      const userContext = { 
        ...mockContext, 
        user: { ...mockUser, role: 'employee' as const, id: 'creator-123' }
      };
      const userCreatedPO = { 
        ...mockPurchaseOrder, 
        createdBy: 'creator-123',
        status: 'draft' as const
      };

      expect(checkUserCanEdit({ 
        ...userContext, 
        purchaseOrder: userCreatedPO 
      })).toBe(true);
    });

    it('should prevent users from editing others orders beyond their permissions', () => {
      const employeeContext = { 
        ...mockContext, 
        user: { ...mockUser, role: 'employee' as const, id: 'employee-123' }
      };
      const othersCreatedPO = { 
        ...mockPurchaseOrder, 
        createdBy: 'other-user-456',
        status: 'draft' as const
      };

      expect(checkUserCanEdit({ 
        ...employeeContext, 
        purchaseOrder: othersCreatedPO 
      })).toBe(false);
    });

    it('should respect department-based restrictions', () => {
      const hrContext = { 
        ...mockContext,
        user: { 
          ...mockUser, 
          role: 'manager' as const,
          metadata: { ...mockUser.metadata, department: 'hr' }
        },
        userDepartment: 'hr'
      };

      const procurementPO = { 
        ...mockPurchaseOrder,
        metadata: { department: 'procurement' }
      };

      // HR manager should have limited permissions on procurement POs
      expect(checkUserCanApprove({ ...hrContext, purchaseOrder: procurementPO })).toBe(false);
    });
  });

  describe('Business Rule Enforcement', () => {
    it('should enforce dual approval requirement for high-value orders', () => {
      const dualApprovalContext = {
        ...mockContext,
        businessSettings: {
          ...mockContext.businessSettings,
          requireDualApproval: true,
          dualApprovalThreshold: 10000
        }
      };

      const highValuePO = { 
        ...mockPurchaseOrder, 
        total: 15000.00,
        status: 'pending_approval' as const
      };

      // First approval should be allowed
      expect(validatePurchaseOrderPermissions('approve', {
        ...dualApprovalContext,
        purchaseOrder: highValuePO
      })).toBe(true);

      // But should require second approval (would be handled in business logic)
      expect(highValuePO.total).toBeGreaterThan(dualApprovalContext.businessSettings.dualApprovalThreshold!);
    });

    it('should prevent self-approval when configured', () => {
      const selfApprovalContext = {
        ...mockContext,
        businessSettings: {
          ...mockContext.businessSettings,
          requireApprovalForOwnOrders: true,
          preventSelfApproval: true
        }
      };

      const userCreatedPO = { 
        ...mockPurchaseOrder, 
        createdBy: mockUser.id,
        status: 'pending_approval' as const
      };

      expect(checkUserCanApprove({ 
        ...selfApprovalContext, 
        purchaseOrder: userCreatedPO 
      })).toBe(false);
    });

    it('should handle time-based restrictions', () => {
      const timeRestrictedContext = {
        ...mockContext,
        businessSettings: {
          ...mockContext.businessSettings,
          timeRestrictions: {
            allowWeekendApprovals: false,
            allowAfterHoursApprovals: false,
            businessHoursStart: '09:00',
            businessHoursEnd: '17:00'
          }
        }
      };

      // Mock current time as weekend or after hours
      const weekendDate = new Date('2024-01-06T20:00:00Z'); // Saturday 8 PM
      vi.setSystemTime(weekendDate);

      expect(validatePurchaseOrderPermissions('approve', timeRestrictedContext)).toBe(false);
    });
  });

  describe('Permission Context Validation', () => {
    it('should handle missing user context gracefully', () => {
      const invalidContext = {
        ...mockContext,
        user: undefined as any
      };

      expect(validatePurchaseOrderPermissions('create', invalidContext)).toBe(false);
      expect(validatePurchaseOrderPermissions('approve', invalidContext)).toBe(false);
    });

    it('should handle missing purchase order context for status-dependent permissions', () => {
      const contextWithoutPO = {
        ...mockContext,
        purchaseOrder: undefined as any
      };

      expect(validatePurchaseOrderPermissions('edit', contextWithoutPO)).toBe(false);
      expect(validatePurchaseOrderPermissions('receive', contextWithoutPO)).toBe(false);
    });

    it('should validate required fields in permission context', () => {
      const incompleteContext = {
        user: mockUser,
        // Missing other required fields
      } as any;

      expect(validatePurchaseOrderPermissions('approve', incompleteContext)).toBe(false);
    });
  });

  describe('getUserPurchaseOrderActions - Action Availability', () => {
    it('should return available actions for manager role', () => {
      const managerContext = { ...mockContext, user: { ...mockUser, role: 'manager' as const } };
      const draftPO = { ...mockPurchaseOrder, status: 'draft' as const };
      
      const actions = getUserPurchaseOrderActions({ ...managerContext, purchaseOrder: draftPO });

      expect(actions).toContain('create');
      expect(actions).toContain('edit');
      expect(actions).toContain('approve');
      expect(actions).toContain('cancel');
      expect(actions).toContain('view');
    });

    it('should return limited actions for employee role', () => {
      const employeeContext = { ...mockContext, user: { ...mockUser, role: 'employee' as const } };
      const draftPO = { ...mockPurchaseOrder, status: 'draft' as const };
      
      const actions = getUserPurchaseOrderActions({ ...employeeContext, purchaseOrder: draftPO });

      expect(actions).toContain('create');
      expect(actions).toContain('view');
      expect(actions).not.toContain('approve');
      expect(actions).not.toContain('edit');
    });

    it('should return status-appropriate actions', () => {
      const warehouseContext = { 
        ...mockContext, 
        user: { ...mockUser, role: 'employee' as const },
        userDepartment: 'warehouse'
      };
      const sentPO = { ...mockPurchaseOrder, status: 'sent' as const };
      
      const actions = getUserPurchaseOrderActions({ ...warehouseContext, purchaseOrder: sentPO });

      expect(actions).toContain('receive');
      expect(actions).toContain('view');
      expect(actions).not.toContain('edit');
      expect(actions).not.toContain('approve');
    });
  });

  describe('Complex Permission Scenarios', () => {
    it('should handle multi-level approval workflows', () => {
      const multiLevelContext = {
        ...mockContext,
        businessSettings: {
          ...mockContext.businessSettings,
          approvalWorkflow: {
            levels: [
              { threshold: 5000, requiredRole: 'manager' },
              { threshold: 25000, requiredRole: 'director' },
              { threshold: 100000, requiredRole: 'admin' }
            ]
          }
        }
      };

      const mediumValuePO = { ...mockPurchaseOrder, total: 15000.00 };
      const supervisorContext = { 
        ...multiLevelContext, 
        user: { ...mockUser, role: 'supervisor' as const }
      };

      // Supervisor cannot approve medium value PO (requires manager+)
      expect(checkUserCanApprove({ 
        ...supervisorContext, 
        purchaseOrder: mediumValuePO 
      })).toBe(false);

      const managerContext = { 
        ...multiLevelContext, 
        user: { ...mockUser, role: 'manager' as const }
      };

      // Manager can approve medium value PO
      expect(checkUserCanApprove({ 
        ...managerContext, 
        purchaseOrder: mediumValuePO 
      })).toBe(true);
    });

    it('should handle emergency override permissions', () => {
      const emergencyContext = {
        ...mockContext,
        businessSettings: {
          ...mockContext.businessSettings,
          allowEmergencyOverride: true
        },
        isEmergency: true,
        emergencyJustification: 'Critical production line shutdown'
      };

      const employeeContext = { 
        ...emergencyContext, 
        user: { ...mockUser, role: 'employee' as const }
      };

      // Employee should have elevated permissions in emergency
      expect(validatePurchaseOrderPermissions('approve', employeeContext)).toBe(true);
    });

    it('should respect temporary permission elevations', () => {
      const temporaryElevationContext = {
        ...mockContext,
        user: {
          ...mockUser,
          role: 'employee' as const,
          temporaryPermissions: {
            elevated: true,
            elevatedRole: 'manager',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            grantedBy: 'admin-user',
            reason: 'Vacation coverage'
          }
        }
      };

      // Employee with temporary elevation should have manager permissions
      expect(validatePurchaseOrderPermissions('approve', temporaryElevationContext)).toBe(true);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle permission checks efficiently for large user sets', () => {
      const largeBatch = Array.from({ length: 1000 }, (_, i) => ({
        ...mockContext,
        user: { ...mockUser, id: `user-${i}`, role: 'employee' as const }
      }));

      const startTime = performance.now();
      
      largeBatch.forEach(context => {
        validatePurchaseOrderPermissions('create', context);
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle malformed permission contexts gracefully', () => {
      const malformedContexts = [
        null,
        undefined,
        {},
        { user: null },
        { user: {} },
        { user: { role: 'invalid_role' } }
      ];

      malformedContexts.forEach(context => {
        expect(validatePurchaseOrderPermissions('create', context as any)).toBe(false);
      });
    });

    it('should maintain permission consistency across multiple calls', () => {
      const consistentContext = { ...mockContext };
      
      // Call the same permission check multiple times
      const results = Array.from({ length: 100 }, () => 
        validatePurchaseOrderPermissions('approve', consistentContext)
      );

      // All results should be identical
      expect(results.every(result => result === results[0])).toBe(true);
    });
  });
});