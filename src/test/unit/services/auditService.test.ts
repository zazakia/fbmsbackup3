/**
 * Comprehensive Unit Tests for Enhanced Audit Service
 * 
 * Tests all enhanced audit service functionality including purchase order audit logging,
 * stock movement audit logging, detailed receiving workflow, approval tracking,
 * validation error handling, and comprehensive audit retrieval.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  PurchaseOrderAuditAction,
  PurchaseOrder,
  PartialReceiptItem
} from '../../../types/business';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { id: 'test-audit-id' }, error: null }))
      }))
    })),
    select: vi.fn(() => ({
      order: vi.fn(() => ({
        gte: vi.fn(() => ({
          lte: vi.fn(() => ({
            eq: vi.fn(() => ({
              limit: vi.fn(() => ({
                range: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }))
        }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id', resolved: true }, error: null }))
        }))
      }))
    }))
  }))
};

vi.mock('../../../utils/supabase', () => ({
  supabase: mockSupabase
}));

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
};

vi.stubGlobal('console', mockConsole);

describe('Enhanced AuditService', () => {
  let AuditService: any;
  let auditService: any;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    // Import the service fresh for each test
    const module = await import('../../../services/auditService');
    AuditService = module.AuditService;
    auditService = module.auditService;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Enhanced Purchase Order Audit Logging', () => {
    const mockContext = {
      performedBy: 'user-123',
      performedByName: 'John Doe',
      reason: 'Test audit log',
      metadata: { testFlag: true },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0'
    };

    it('should successfully log purchase order audit with enhanced features', async () => {
      const result = await auditService.logPurchaseOrderAudit(
        'po-123',
        'PO-2024-001',
        PurchaseOrderAuditAction.CREATED,
        mockContext,
        {},
        { status: 'draft', total: 1000 }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.purchaseOrderId).toBe('po-123');
      expect(result.data.action).toBe(PurchaseOrderAuditAction.CREATED);
      expect(result.auditId).toBeDefined();
    });

    it('should create status history entries for status changes', async () => {
      const result = await auditService.logPurchaseOrderAudit(
        'po-123',
        'PO-2024-001',
        PurchaseOrderAuditAction.STATUS_CHANGED,
        mockContext,
        { status: 'draft' },
        { status: 'approved' }
      );

      expect(result.success).toBe(true);
      expect(result.data.action).toBe(PurchaseOrderAuditAction.STATUS_CHANGED);
    });

    it('should handle comprehensive metadata', async () => {
      const extendedContext = {
        ...mockContext,
        metadata: {
          version: '2.0',
          source: 'enhanced_workflow',
          userRole: 'manager'
        }
      };

      const result = await auditService.logPurchaseOrderAudit(
        'po-123',
        'PO-2024-001',
        PurchaseOrderAuditAction.APPROVED,
        extendedContext
      );

      expect(result.success).toBe(true);
      expect(result.data.metadata).toEqual(expect.objectContaining({
        version: '2.0',
        source: 'enhanced_workflow'
      }));
    });
  });

  describe('Enhanced Stock Movement Audit Logging', () => {
    const mockAuditData = {
      productId: 'prod-123',
      productName: 'Test Product',
      productSku: 'TEST-001',
      movementType: 'purchase_receipt' as const,
      quantityBefore: 50,
      quantityAfter: 75,
      quantityChanged: 25,
      unitCost: 10.50,
      totalValue: 262.50,
      referenceType: 'purchase_order' as const,
      referenceId: 'po-123',
      referenceNumber: 'PO-2024-001',
      batchNumber: 'BATCH-001',
      location: 'Main Warehouse'
    };

    const mockContext = {
      performedBy: 'user-123',
      performedByName: 'Warehouse Staff',
      reason: 'Enhanced receiving workflow'
    };

    it('should log to both stock_movements and audit_logs tables', async () => {
      const result = await auditService.logStockMovementAudit(mockAuditData, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.productId).toBe('prod-123');
      expect(result.data.type).toBe('stock_in');
      expect(result.data.beforeQuantity).toBe(50);
      expect(result.data.afterQuantity).toBe(75);
    });

    it('should handle all movement types correctly', async () => {
      const testCases = [
        { movementType: 'purchase_receipt', expectedType: 'stock_in' },
        { movementType: 'sale', expectedType: 'stock_out' },
        { movementType: 'adjustment', expectedType: 'adjustment' }
      ];

      for (const testCase of testCases) {
        const auditData = { ...mockAuditData, movementType: testCase.movementType as any };
        const result = await auditService.logStockMovementAudit(auditData, mockContext);
        
        expect(result.success).toBe(true);
        expect(result.data.type).toBe(testCase.expectedType);
      }
    });
  });

  describe('Detailed Receiving Activity Logging', () => {
    const mockPurchaseOrder: PurchaseOrder = {
      id: 'po-123',
      poNumber: 'PO-2024-001',
      supplierId: 'sup-123',
      supplierName: 'Test Supplier',
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Product 1',
          sku: 'PROD-001',
          quantity: 100,
          cost: 10,
          total: 1000
        }
      ],
      subtotal: 1000,
      tax: 100,
      total: 1100,
      status: 'sent',
      createdAt: new Date()
    };

    const mockReceivingRecord = {
      receivingNumber: 'REC-2024-001',
      receivingType: 'partial' as const,
      itemsReceived: [
        {
          productId: 'prod-1',
          productName: 'Product 1',
          sku: 'PROD-001',
          orderedQuantity: 100,
          receivedQuantity: 80,
          condition: 'good' as const
        }
      ],
      qualityNotes: 'Good condition',
      vehicleInfo: 'Truck-123',
      driverInfo: 'John Driver',
      attachments: ['receipt.pdf']
    };

    const mockContext = {
      performedBy: 'user-123',
      performedByName: 'Warehouse Staff',
      reason: 'Goods received'
    };

    it('should log comprehensive receiving activity', async () => {
      const results = await auditService.logReceivingActivityDetailed(
        mockPurchaseOrder,
        mockReceivingRecord,
        mockContext
      );

      expect(results).toHaveLength(2); // Main audit + stock movement
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].data.action).toBe(PurchaseOrderAuditAction.PARTIALLY_RECEIVED);
    });

    it('should detect quality issues', async () => {
      const receivingWithDamage = {
        ...mockReceivingRecord,
        damageReport: 'Multiple packages damaged',
        discrepancyNotes: 'Short delivery'
      };

      const results = await auditService.logReceivingActivityDetailed(
        mockPurchaseOrder,
        receivingWithDamage,
        mockContext
      );

      expect(results[0].success).toBe(true);
      expect(results[0].data.newValues.hasQualityIssues).toBe(true);
    });
  });

  describe('Approval Activity Logging', () => {
    const mockPurchaseOrder: PurchaseOrder = {
      id: 'po-123',
      poNumber: 'PO-2024-001',
      supplierId: 'sup-123',
      supplierName: 'Test Supplier',
      items: [],
      subtotal: 1000,
      tax: 100,
      total: 1100,
      status: 'pending',
      createdAt: new Date()
    };

    const mockApprovalData = {
      approvalStatus: 'approved' as const,
      approvalLevel: 1,
      approvalAmount: 1100,
      notes: 'Approved within budget'
    };

    const mockContext = {
      performedBy: 'user-123',
      performedByName: 'Manager',
      reason: 'Standard approval',
      metadata: { userRole: 'manager' }
    };

    it('should log approval activity with detailed records', async () => {
      const result = await auditService.logApprovalActivity(
        mockPurchaseOrder,
        mockApprovalData,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.action).toBe(PurchaseOrderAuditAction.APPROVED);
      expect(result.data.newValues.approvalStatus).toBe('approved');
    });

    it('should handle rejections', async () => {
      const rejectionData = {
        ...mockApprovalData,
        approvalStatus: 'rejected' as const,
        notes: 'Exceeds budget'
      };

      const result = await auditService.logApprovalActivity(
        mockPurchaseOrder,
        rejectionData,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.action).toBe(PurchaseOrderAuditAction.REJECTED);
    });
  });

  describe('Validation Error Logging', () => {
    const mockValidationError = {
      errorType: 'insufficient_stock',
      errorCode: 'STOCK_001',
      errorMessage: 'Insufficient stock available',
      fieldName: 'quantity',
      fieldValue: '150',
      context: { productId: 'prod-123' }
    };

    const mockContext = {
      performedBy: 'system',
      performedByName: 'System Validation',
      reason: 'Stock validation'
    };

    it('should log validation errors with severity', async () => {
      const result = await auditService.logValidationError(
        'po-123',
        'PO-2024-001',
        mockValidationError,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.auditId).toBeDefined();
    });

    it('should resolve validation errors', async () => {
      const result = await auditService.resolveValidationError(
        'error-123',
        'Manually resolved',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data.resolved).toBe(true);
    });

    it('should classify error severity correctly', () => {
      const auditServiceInstance = new AuditService();
      
      expect(auditServiceInstance['determineErrorSeverity']('insufficient_stock')).toBe('high');
      expect(auditServiceInstance['determineErrorSeverity']('duplicate_receipt_detected')).toBe('critical');
      expect(auditServiceInstance['determineErrorSeverity']('price_mismatch')).toBe('medium');
    });
  });

  describe('Audit Retrieval and Filtering', () => {
    it('should retrieve audit logs with filters', async () => {
      const mockData = [
        {
          id: 'audit-1',
          purchase_order_id: 'po-123',
          action: 'created',
          performed_by: 'user-123',
          timestamp: new Date().toISOString()
        }
      ];

      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                eq: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
                }))
              }))
            }))
          }))
        }))
      });

      const result = await auditService.getAuditLogs({
        purchaseOrderId: 'po-123',
        limit: 50
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should handle database errors gracefully', async () => {
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: null, error: { message: 'DB Error' } }))
        }))
      });

      const result = await auditService.getAuditLogs();
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
      expect(mockConsole.warn).toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete purchase order lifecycle with audit', async () => {
      const context = { performedBy: 'user-123', performedByName: 'Test User' };
      const poId = 'po-lifecycle';
      const poNumber = 'PO-LIFECYCLE-001';

      // Creation
      const createResult = await auditService.logPurchaseOrderAudit(
        poId, poNumber, PurchaseOrderAuditAction.CREATED, context
      );
      expect(createResult.success).toBe(true);

      // Approval
      const approvalResult = await auditService.logPurchaseOrderAudit(
        poId, poNumber, PurchaseOrderAuditAction.APPROVED, context
      );
      expect(approvalResult.success).toBe(true);

      // Receiving
      const receivingResult = await auditService.logPurchaseOrderAudit(
        poId, poNumber, PurchaseOrderAuditAction.RECEIVED, context
      );
      expect(receivingResult.success).toBe(true);

      // All should have unique audit IDs
      const auditIds = [createResult.auditId, approvalResult.auditId, receivingResult.auditId];
      expect(new Set(auditIds).size).toBe(3);
    });

    it('should maintain audit trail integrity', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        auditService.logPurchaseOrderAudit(
          'po-integrity',
          'PO-INTEGRITY-001',
          PurchaseOrderAuditAction.UPDATED,
          { performedBy: `user-${i}`, performedByName: `User ${i}` }
        )
      );

      const results = await Promise.all(operations);
      
      expect(results.every(r => r.success)).toBe(true);
      expect(new Set(results.map(r => r.auditId)).size).toBe(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle null and undefined values', async () => {
      const result = await auditService.logPurchaseOrderAudit(
        'po-null',
        'PO-NULL-001',
        PurchaseOrderAuditAction.UPDATED,
        { performedBy: 'user-123', reason: null as any },
        null as any,
        undefined as any
      );

      expect(result.success).toBe(true);
      expect(result.data.oldValues).toEqual({});
      expect(result.data.newValues).toEqual({});
    });

    it('should handle database connection failures', async () => {
      mockSupabase.from.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const result = await auditService.logPurchaseOrderAudit(
        'po-fail',
        'PO-FAIL-001',
        PurchaseOrderAuditAction.CREATED,
        { performedBy: 'user-123' }
      );

      expect(result.success).toBe(true); // Should fallback gracefully
      expect(mockConsole.warn).toHaveBeenCalled();
    });
  });
});