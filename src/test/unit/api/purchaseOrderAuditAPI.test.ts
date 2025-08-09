/**
 * Unit Tests for Purchase Order Audit API
 * 
 * Tests the enhanced purchase order API functions that integrate with the audit service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createPurchaseOrderWithAudit,
  updatePurchaseOrderWithAudit,
  deletePurchaseOrderWithAudit,
  receivePurchaseOrderWithAudit,
  changePurchaseOrderStatus,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrderWithAuditHistory,
  getPurchaseOrderAuditSummary
} from '../../../api/purchaseOrderAuditAPI';
import { PurchaseOrder, PurchaseOrderItem } from '../../../types/business';

// Mock dependencies
vi.mock('../../../api/purchases', () => ({
  createPurchaseOrder: vi.fn(),
  updatePurchaseOrder: vi.fn(),
  deletePurchaseOrder: vi.fn(),
  receivePurchaseOrder: vi.fn(),
  getPurchaseOrder: vi.fn()
}));

vi.mock('../../../services/auditService', () => ({
  auditService: {
    logPurchaseOrderAudit: vi.fn(),
    logReceivingActivity: vi.fn(),
    logStatusTransition: vi.fn(),
    getPurchaseOrderHistory: vi.fn()
  }
}));

vi.mock('../../../store/supabaseAuthStore', () => ({
  useSupabaseAuthStore: {
    getState: vi.fn(() => ({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' }
      }
    }))
  }
}));

// Import mocked modules
import * as purchaseAPI from '../../../api/purchases';
import { auditService } from '../../../services/auditService';

describe('Purchase Order Audit API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createPurchaseOrderWithAudit', () => {
    it('should create purchase order and log audit trail', async () => {
      const mockPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-2023-001',
        supplierId: 'supplier-456',
        supplierName: 'Test Supplier',
        items: [
          {
            id: 'item-1',
            productId: 'product-123',
            productName: 'Test Product',
            sku: 'SKU-001',
            quantity: 10,
            unitPrice: 15.00,
            totalPrice: 150.00
          }
        ],
        subtotal: 150,
        tax: 15,
        total: 165,
        status: 'draft',
        createdBy: 'test-user-id',
        createdAt: new Date()
      };

      const purchaseOrderData = {
        poNumber: mockPO.poNumber,
        supplierId: mockPO.supplierId,
        supplierName: mockPO.supplierName,
        items: mockPO.items,
        subtotal: mockPO.subtotal,
        tax: mockPO.tax,
        total: mockPO.total,
        status: mockPO.status,
        createdBy: mockPO.createdBy
      };

      // Mock successful creation
      (purchaseAPI.createPurchaseOrder as any).mockResolvedValueOnce({
        data: mockPO,
        error: null
      });

      // Mock audit logging
      (auditService.logPurchaseOrderAudit as any).mockResolvedValueOnce({
        success: true,
        auditId: 'audit-123'
      });

      const result = await createPurchaseOrderWithAudit(
        purchaseOrderData,
        'Creating new purchase order for Q4 supplies'
      );

      expect(result.data).toEqual(mockPO);
      expect(result.error).toBeNull();

      // Verify purchase order creation was called
      expect(purchaseAPI.createPurchaseOrder).toHaveBeenCalledWith(purchaseOrderData);

      // Verify audit logging was called
      expect(auditService.logPurchaseOrderAudit).toHaveBeenCalledWith(
        mockPO.id,
        mockPO.poNumber,
        'created',
        expect.objectContaining({
          performedBy: 'test-user-id',
          performedByName: 'Test User',
          reason: 'Creating new purchase order for Q4 supplies'
        }),
        {},
        expect.objectContaining({
          supplierId: mockPO.supplierId,
          supplierName: mockPO.supplierName,
          itemCount: 1,
          total: 165,
          status: 'draft'
        })
      );
    });

    it('should handle creation errors', async () => {
      const purchaseOrderData = {
        poNumber: 'PO-2023-001',
        supplierId: 'supplier-456',
        supplierName: 'Test Supplier',
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        status: 'draft',
        createdBy: 'test-user-id'
      };

      // Mock creation error
      (purchaseAPI.createPurchaseOrder as any).mockResolvedValueOnce({
        data: null,
        error: new Error('Database connection failed')
      });

      const result = await createPurchaseOrderWithAudit(purchaseOrderData);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();

      // Audit logging should not be called for failed creation
      expect(auditService.logPurchaseOrderAudit).not.toHaveBeenCalled();
    });

    it('should continue despite audit logging failures', async () => {
      const mockPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-2023-001',
        supplierId: 'supplier-456',
        supplierName: 'Test Supplier',
        items: [],
        subtotal: 100,
        tax: 10,
        total: 110,
        status: 'draft',
        createdBy: 'test-user-id',
        createdAt: new Date()
      };

      // Mock successful creation
      (purchaseAPI.createPurchaseOrder as any).mockResolvedValueOnce({
        data: mockPO,
        error: null
      });

      // Mock audit logging failure
      (auditService.logPurchaseOrderAudit as any).mockResolvedValueOnce({
        success: false,
        error: 'Audit service unavailable'
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await createPurchaseOrderWithAudit({
        poNumber: mockPO.poNumber,
        supplierId: mockPO.supplierId,
        supplierName: mockPO.supplierName,
        items: mockPO.items,
        subtotal: mockPO.subtotal,
        tax: mockPO.tax,
        total: mockPO.total,
        status: mockPO.status,
        createdBy: mockPO.createdBy
      });

      expect(result.data).toEqual(mockPO);
      expect(result.error).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to create audit log for PO creation:',
        'Audit service unavailable'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('updatePurchaseOrderWithAudit', () => {
    it('should update purchase order and log changes', async () => {
      const originalPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-2023-001',
        supplierId: 'supplier-456',
        supplierName: 'Test Supplier',
        items: [],
        subtotal: 100,
        tax: 10,
        total: 110,
        status: 'draft',
        createdBy: 'test-user-id',
        createdAt: new Date()
      };

      const updatedPO: PurchaseOrder = {
        ...originalPO,
        status: 'pending',
        total: 220
      };

      const updates = {
        status: 'pending' as const,
        total: 220
      };

      // Mock getting current state
      (purchaseAPI.getPurchaseOrder as any).mockResolvedValueOnce({
        data: originalPO,
        error: null
      });

      // Mock successful update
      (purchaseAPI.updatePurchaseOrder as any).mockResolvedValueOnce({
        data: updatedPO,
        error: null
      });

      // Mock audit logging
      (auditService.logPurchaseOrderAudit as any).mockResolvedValueOnce({
        success: true,
        auditId: 'audit-456'
      });

      const result = await updatePurchaseOrderWithAudit(
        'po-123',
        updates,
        'Updating status to pending'
      );

      expect(result.data).toEqual(updatedPO);
      expect(result.error).toBeNull();

      // Verify update was called
      expect(purchaseAPI.updatePurchaseOrder).toHaveBeenCalledWith('po-123', updates);

      // Verify audit logging captured the changes
      expect(auditService.logPurchaseOrderAudit).toHaveBeenCalledWith(
        'po-123',
        'PO-2023-001',
        'status_changed', // Should detect status change
        expect.objectContaining({
          performedBy: 'test-user-id',
          reason: 'Updating status to pending'
        }),
        expect.objectContaining({
          status: 'draft',
          total: 110
        }),
        expect.objectContaining({
          status: 'pending',
          total: 220
        })
      );
    });
  });

  describe('receivePurchaseOrderWithAudit', () => {
    it('should receive purchase order and log receiving activity', async () => {
      const originalPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-2023-001',
        supplierId: 'supplier-456',
        supplierName: 'Test Supplier',
        items: [
          {
            id: 'item-1',
            productId: 'product-123',
            productName: 'Test Product',
            sku: 'SKU-001',
            quantity: 10,
            unitPrice: 15.00,
            totalPrice: 150.00
          }
        ],
        subtotal: 150,
        tax: 15,
        total: 165,
        status: 'sent',
        createdBy: 'test-user-id',
        createdAt: new Date()
      };

      const receivedPO: PurchaseOrder = {
        ...originalPO,
        status: 'received',
        receivedDate: new Date()
      };

      const receivedItems: PurchaseOrderItem[] = [
        {
          id: 'item-1',
          productId: 'product-123',
          productName: 'Test Product',
          sku: 'SKU-001',
          quantity: 8, // Partially received
          unitPrice: 15.00,
          totalPrice: 120.00
        }
      ];

      // Mock getting current state
      (purchaseAPI.getPurchaseOrder as any).mockResolvedValueOnce({
        data: originalPO,
        error: null
      });

      // Mock successful receiving
      (purchaseAPI.receivePurchaseOrder as any).mockResolvedValueOnce({
        data: receivedPO,
        error: null
      });

      // Mock audit logging
      (auditService.logReceivingActivity as any).mockResolvedValueOnce([
        { success: true, auditId: 'audit-receiving' },
        { success: true, auditId: 'audit-stock-movement' }
      ]);

      const result = await receivePurchaseOrderWithAudit(
        'po-123',
        receivedItems,
        {
          receivedBy: 'test-user-id',
          reason: 'Partial receipt - some items damaged',
          timestamp: new Date(),
          notes: '8 items received in good condition'
        }
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(receivedPO);

      // Verify receiving was called
      expect(purchaseAPI.receivePurchaseOrder).toHaveBeenCalledWith(
        'po-123',
        receivedItems,
        expect.objectContaining({
          receivedBy: 'test-user-id',
          reason: 'Partial receipt - some items damaged'
        })
      );

      // Verify audit logging was called
      expect(auditService.logReceivingActivity).toHaveBeenCalledWith(
        originalPO,
        expect.arrayContaining([
          expect.objectContaining({
            productId: 'product-123',
            orderedQuantity: 10,
            receivedQuantity: 8,
            previouslyReceived: 0,
            totalReceived: 8,
            condition: 'good'
          })
        ]),
        expect.objectContaining({
          performedBy: 'test-user-id',
          reason: 'Partial receipt - some items damaged'
        })
      );
    });

    it('should handle auto-receive mode', async () => {
      const originalPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-2023-001',
        supplierId: 'supplier-456',
        supplierName: 'Test Supplier',
        items: [
          {
            id: 'item-1',
            productId: 'product-123',
            productName: 'Test Product',
            sku: 'SKU-001',
            quantity: 10,
            unitPrice: 15.00,
            totalPrice: 150.00
          }
        ],
        subtotal: 150,
        tax: 15,
        total: 165,
        status: 'sent',
        createdBy: 'test-user-id',
        createdAt: new Date()
      };

      // Mock getting current state
      (purchaseAPI.getPurchaseOrder as any).mockResolvedValueOnce({
        data: originalPO,
        error: null
      });

      // Mock successful receiving
      (purchaseAPI.receivePurchaseOrder as any).mockResolvedValueOnce({
        data: { ...originalPO, status: 'received' },
        error: null
      });

      // Mock audit logging
      (auditService.logReceivingActivity as any).mockResolvedValueOnce([
        { success: true, auditId: 'audit-auto-receive' }
      ]);

      // Call without received items (auto-receive mode)
      const result = await receivePurchaseOrderWithAudit('po-123');

      expect(result.success).toBe(true);

      // Should create partial receipts for all items
      expect(auditService.logReceivingActivity).toHaveBeenCalledWith(
        originalPO,
        expect.arrayContaining([
          expect.objectContaining({
            productId: 'product-123',
            orderedQuantity: 10,
            receivedQuantity: 10, // Full quantity in auto-receive
            totalReceived: 10,
            condition: 'good'
          })
        ]),
        expect.any(Object)
      );
    });
  });

  describe('changePurchaseOrderStatus', () => {
    it('should change status and log status transition', async () => {
      const originalPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-2023-001',
        supplierId: 'supplier-456',
        supplierName: 'Test Supplier',
        items: [],
        subtotal: 100,
        tax: 10,
        total: 110,
        status: 'draft',
        createdBy: 'test-user-id',
        createdAt: new Date()
      };

      const updatedPO: PurchaseOrder = {
        ...originalPO,
        status: 'pending'
      };

      // Mock getting current state
      (purchaseAPI.getPurchaseOrder as any).mockResolvedValueOnce({
        data: originalPO,
        error: null
      });

      // Mock successful update
      (purchaseAPI.updatePurchaseOrder as any).mockResolvedValueOnce({
        data: updatedPO,
        error: null
      });

      // Mock audit logging
      (auditService.logStatusTransition as any).mockResolvedValueOnce({
        success: true,
        auditId: 'audit-status-change'
      });

      const result = await changePurchaseOrderStatus(
        'po-123',
        'pending',
        'Submitting for approval'
      );

      expect(result.data).toEqual(updatedPO);
      expect(result.error).toBeNull();

      // Verify status transition audit was logged
      expect(auditService.logStatusTransition).toHaveBeenCalledWith(
        updatedPO,
        'draft',
        'pending',
        expect.objectContaining({
          performedBy: 'test-user-id',
          reason: 'Submitting for approval'
        })
      );
    });
  });

  describe('approvePurchaseOrder', () => {
    it('should approve purchase order and log approval', async () => {
      const originalPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-2023-001',
        supplierId: 'supplier-456',
        supplierName: 'Test Supplier',
        items: [],
        subtotal: 100,
        tax: 10,
        total: 110,
        status: 'pending',
        createdBy: 'test-user-id',
        createdAt: new Date()
      };

      const approvedPO: PurchaseOrder = {
        ...originalPO,
        status: 'sent'
      };

      // Mock getting current state
      (purchaseAPI.getPurchaseOrder as any).mockResolvedValueOnce({
        data: originalPO,
        error: null
      });

      // Mock successful approval
      (purchaseAPI.updatePurchaseOrder as any).mockResolvedValueOnce({
        data: approvedPO,
        error: null
      });

      // Mock audit logging
      (auditService.logPurchaseOrderAudit as any).mockResolvedValueOnce({
        success: true,
        auditId: 'audit-approval'
      });

      const result = await approvePurchaseOrder(
        'po-123',
        'Approved for Q4 budget allocation'
      );

      expect(result.data).toEqual(approvedPO);
      expect(result.error).toBeNull();

      // Verify approval audit was logged
      expect(auditService.logPurchaseOrderAudit).toHaveBeenCalledWith(
        'po-123',
        'PO-2023-001',
        'approved',
        expect.objectContaining({
          performedBy: 'test-user-id',
          reason: 'Purchase order approved: Approved for Q4 budget allocation',
          metadata: { approvalNotes: 'Approved for Q4 budget allocation' }
        }),
        { status: 'pending' },
        expect.objectContaining({
          status: 'sent',
          approvalTimestamp: expect.any(String)
        })
      );
    });
  });

  describe('cancelPurchaseOrder', () => {
    it('should cancel purchase order and log cancellation', async () => {
      const originalPO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-2023-001',
        supplierId: 'supplier-456',
        supplierName: 'Test Supplier',
        items: [],
        subtotal: 100,
        tax: 10,
        total: 110,
        status: 'pending',
        createdBy: 'test-user-id',
        createdAt: new Date()
      };

      const cancelledPO: PurchaseOrder = {
        ...originalPO,
        status: 'cancelled'
      };

      // Mock getting current state
      (purchaseAPI.getPurchaseOrder as any).mockResolvedValueOnce({
        data: originalPO,
        error: null
      });

      // Mock successful cancellation
      (purchaseAPI.updatePurchaseOrder as any).mockResolvedValueOnce({
        data: cancelledPO,
        error: null
      });

      // Mock audit logging
      (auditService.logPurchaseOrderAudit as any).mockResolvedValueOnce({
        success: true,
        auditId: 'audit-cancellation'
      });

      const result = await cancelPurchaseOrder(
        'po-123',
        'Supplier unable to fulfill order'
      );

      expect(result.data).toEqual(cancelledPO);
      expect(result.error).toBeNull();

      // Verify cancellation audit was logged
      expect(auditService.logPurchaseOrderAudit).toHaveBeenCalledWith(
        'po-123',
        'PO-2023-001',
        'cancelled',
        expect.objectContaining({
          performedBy: 'test-user-id',
          reason: 'Purchase order cancelled: Supplier unable to fulfill order',
          metadata: { cancellationReason: 'Supplier unable to fulfill order' }
        }),
        { status: 'pending' },
        expect.objectContaining({
          status: 'cancelled',
          cancellationTimestamp: expect.any(String),
          cancellationReason: 'Supplier unable to fulfill order'
        })
      );
    });
  });

  describe('getPurchaseOrderWithAuditHistory', () => {
    it('should retrieve purchase order with complete audit history', async () => {
      const basePO: PurchaseOrder = {
        id: 'po-123',
        poNumber: 'PO-2023-001',
        supplierId: 'supplier-456',
        supplierName: 'Test Supplier',
        items: [
          {
            id: 'item-1',
            productId: 'product-123',
            productName: 'Test Product',
            sku: 'SKU-001',
            quantity: 10,
            unitPrice: 15.00,
            totalPrice: 150.00,
            receivedQuantity: 8
          } as any
        ],
        subtotal: 150,
        tax: 15,
        total: 165,
        status: 'received',
        createdBy: 'test-user-id',
        createdAt: new Date()
      };

      const mockAuditHistory = [
        {
          id: 'audit-1',
          purchaseOrderId: 'po-123',
          purchaseOrderNumber: 'PO-2023-001',
          action: 'created',
          performedBy: 'test-user-id',
          performedByName: 'Test User',
          timestamp: new Date(),
          oldValues: {},
          newValues: { status: 'draft' },
          reason: 'Initial creation',
          metadata: {},
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent'
        },
        {
          id: 'audit-2',
          purchaseOrderId: 'po-123',
          purchaseOrderNumber: 'PO-2023-001',
          action: 'status_changed',
          performedBy: 'test-user-id',
          performedByName: 'Test User',
          timestamp: new Date(),
          oldValues: { status: 'draft' },
          newValues: { status: 'received' },
          reason: 'Items received',
          metadata: {},
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent'
        }
      ];

      // Mock getting base purchase order
      (purchaseAPI.getPurchaseOrder as any).mockResolvedValueOnce({
        data: basePO,
        error: null
      });

      // Mock getting audit history
      (auditService.getPurchaseOrderHistory as any).mockResolvedValueOnce({
        success: true,
        data: mockAuditHistory
      });

      const result = await getPurchaseOrderWithAuditHistory('po-123');

      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('po-123');
      expect(result.data?.statusHistory).toHaveLength(1); // Only status_changed events
      expect(result.data?.totalReceived).toBe(8);
      expect(result.data?.percentComplete).toBe(80); // 8/10 * 100
      expect(result.error).toBeNull();
    });

    it('should handle missing purchase order', async () => {
      // Mock purchase order not found
      (purchaseAPI.getPurchaseOrder as any).mockResolvedValueOnce({
        data: null,
        error: new Error('Purchase order not found')
      });

      const result = await getPurchaseOrderWithAuditHistory('po-nonexistent');

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe('getPurchaseOrderAuditSummary', () => {
    it('should retrieve audit summary statistics', async () => {
      const mockAuditHistory = [
        {
          id: 'audit-1',
          action: 'created',
          performedBy: 'user-1',
          timestamp: new Date('2023-01-01')
        },
        {
          id: 'audit-2',
          action: 'status_changed',
          performedBy: 'user-1',
          timestamp: new Date('2023-01-02')
        },
        {
          id: 'audit-3',
          action: 'received',
          performedBy: 'user-2',
          timestamp: new Date('2023-01-03')
        },
        {
          id: 'audit-4',
          action: 'approved',
          performedBy: 'user-3',
          timestamp: new Date('2023-01-01')
        }
      ];

      // Mock getting audit history
      (auditService.getPurchaseOrderHistory as any).mockResolvedValueOnce({
        success: true,
        data: mockAuditHistory
      });

      const result = await getPurchaseOrderAuditSummary('po-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        totalAuditEvents: 4,
        createdAt: new Date('2023-01-01'),
        lastModified: new Date('2023-01-03'),
        statusChanges: 1,
        receivingEvents: 1,
        approvalEvents: 1,
        uniqueUsers: 3,
        recentActivity: expect.arrayContaining([
          expect.objectContaining({ id: 'audit-3' })
        ])
      });
    });

    it('should handle audit retrieval failure', async () => {
      // Mock audit service failure
      (auditService.getPurchaseOrderHistory as any).mockResolvedValueOnce({
        success: false,
        error: 'Audit service unavailable'
      });

      const result = await getPurchaseOrderAuditSummary('po-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Audit service unavailable');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network error
      (purchaseAPI.createPurchaseOrder as any).mockRejectedValueOnce(
        new Error('Network timeout')
      );

      const result = await createPurchaseOrderWithAudit({
        poNumber: 'PO-2023-001',
        supplierId: 'supplier-456',
        supplierName: 'Test Supplier',
        items: [],
        subtotal: 0,
        tax: 0,
        total: 0,
        status: 'draft',
        createdBy: 'test-user-id'
      });

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should handle unexpected errors', async () => {
      // Mock unexpected error
      (purchaseAPI.updatePurchaseOrder as any).mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const result = await updatePurchaseOrderWithAudit(
        'po-123',
        { status: 'pending' }
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unexpected error');
    });
  });
});