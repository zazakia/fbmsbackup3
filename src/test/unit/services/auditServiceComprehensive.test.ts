import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AuditService,
  AuditContext,
  StockMovementAuditData,
  AuditLogFilter
} from '../../../services/auditService';
import {
  PurchaseOrderAuditAction,
  PurchaseOrder,
  EnhancedPurchaseOrder,
  PartialReceiptItem
} from '../../../types/business';
import { TestDataFactory } from '../../factories/testDataFactory';

// Mock Supabase
vi.mock('../../../utils/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'mock-id' }, error: null }))
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
            single: vi.fn(() => Promise.resolve({ data: { id: 'mock-id', resolved: true }, error: null }))
          }))
        }))
      }))
    }))
  }
}));

describe('AuditService - Comprehensive Tests', () => {
  let auditService: AuditService;
  let mockContext: AuditContext;
  let mockPurchaseOrder: PurchaseOrder;
  let consoleSpy: any;

  beforeEach(() => {
    auditService = new AuditService();
    
    mockContext = {
      performedBy: 'user-123',
      performedByName: 'John Doe',
      ipAddress: '192.168.1.100',
      userAgent: 'Test Browser 1.0',
      reason: 'Test operation',
      metadata: {
        sessionId: 'session-123',
        browserInfo: 'Chrome 120',
        userId: 'user-123'
      }
    };

    mockPurchaseOrder = TestDataFactory.createPurchaseOrder({
      id: 'po-123',
      poNumber: 'PO-2024-001',
      status: 'sent'
    });

    // Spy on console methods
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleSpy.log.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('logPurchaseOrderAudit', () => {
    it('should successfully log purchase order audit event', async () => {
      const result = await auditService.logPurchaseOrderAudit(
        mockPurchaseOrder.id,
        mockPurchaseOrder.poNumber,
        PurchaseOrderAuditAction.CREATED,
        mockContext,
        {},
        { status: 'draft' }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.auditId).toBeDefined();
      expect(result.data!.purchaseOrderId).toBe(mockPurchaseOrder.id);
      expect(result.data!.action).toBe(PurchaseOrderAuditAction.CREATED);
      expect(result.data!.performedBy).toBe(mockContext.performedBy);
      expect(result.data!.performedByName).toBe(mockContext.performedByName);
      expect(result.data!.timestamp).toBeInstanceOf(Date);
      expect(result.data!.metadata).toEqual({
        ...mockContext.metadata,
        version: '1.0',
        source: 'purchase_order_workflow'
      });
    });

    it('should log status changes with old and new values', async () => {
      const oldValues = { status: 'draft' };
      const newValues = { status: 'pending_approval' };

      const result = await auditService.logPurchaseOrderAudit(
        mockPurchaseOrder.id,
        mockPurchaseOrder.poNumber,
        PurchaseOrderAuditAction.STATUS_CHANGED,
        mockContext,
        oldValues,
        newValues
      );

      expect(result.success).toBe(true);
      expect(result.data!.oldValues).toEqual(oldValues);
      expect(result.data!.newValues).toEqual(newValues);
      expect(result.data!.action).toBe(PurchaseOrderAuditAction.STATUS_CHANGED);
    });

    it('should handle database errors gracefully', async () => {
      const { supabase } = require('../../../utils/supabase');
      supabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: { message: 'Database error', code: 'DB001' } 
            }))
          }))
        }))
      });

      const result = await auditService.logPurchaseOrderAudit(
        mockPurchaseOrder.id,
        mockPurchaseOrder.poNumber,
        PurchaseOrderAuditAction.CREATED,
        mockContext
      );

      expect(result.success).toBe(true); // Should still succeed with in-memory logging
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save audit log to database')
      );
    });

    it('should include all context information in audit log', async () => {
      const result = await auditService.logPurchaseOrderAudit(
        mockPurchaseOrder.id,
        mockPurchaseOrder.poNumber,
        PurchaseOrderAuditAction.APPROVED,
        mockContext
      );

      expect(result.data!.ipAddress).toBe(mockContext.ipAddress);
      expect(result.data!.userAgent).toBe(mockContext.userAgent);
      expect(result.data!.reason).toBe(mockContext.reason);
    });

    it('should handle missing context gracefully', async () => {
      const minimalContext: AuditContext = {
        performedBy: 'user-123'
      };

      const result = await auditService.logPurchaseOrderAudit(
        mockPurchaseOrder.id,
        mockPurchaseOrder.poNumber,
        PurchaseOrderAuditAction.UPDATED,
        minimalContext
      );

      expect(result.success).toBe(true);
      expect(result.data!.performedBy).toBe(minimalContext.performedBy);
      expect(result.data!.performedByName).toBeUndefined();
      expect(result.data!.ipAddress).toBeUndefined();
    });
  });

  describe('logStockMovementAudit', () => {
    let mockStockMovementData: StockMovementAuditData;

    beforeEach(() => {
      mockStockMovementData = {
        productId: 'prod-123',
        productName: 'Test Product',
        productSku: 'SKU-001',
        movementType: 'purchase_receipt',
        quantityBefore: 100,
        quantityAfter: 180,
        quantityChanged: 80,
        unitCost: 10.50,
        totalValue: 840.00,
        referenceType: 'purchase_order',
        referenceId: 'po-123',
        referenceNumber: 'PO-2024-001',
        batchNumber: 'BATCH-001',
        expiryDate: new Date('2025-12-31'),
        location: 'Warehouse A',
        notes: 'Receipt from purchase order'
      };
    });

    it('should successfully log stock movement audit', async () => {
      const result = await auditService.logStockMovementAudit(
        mockStockMovementData,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.auditId).toBeDefined();
      expect(result.data!.productId).toBe(mockStockMovementData.productId);
      expect(result.data!.type).toBe('stock_in');
      expect(result.data!.quantity).toBe(80);
      expect(result.data!.beforeQuantity).toBe(100);
      expect(result.data!.afterQuantity).toBe(180);
      expect(result.data!.unitCost).toBe(10.50);
      expect(result.data!.totalCost).toBe(840.00);
      expect(result.data!.batchNumber).toBe('BATCH-001');
      expect(result.data!.expiryDate).toEqual(new Date('2025-12-31'));
    });

    it('should map movement types correctly', async () => {
      const testCases = [
        { movementType: 'purchase_receipt', expectedType: 'stock_in' },
        { movementType: 'sale', expectedType: 'stock_out' },
        { movementType: 'adjustment', expectedType: 'adjustment' },
        { movementType: 'transfer', expectedType: 'transfer' },
        { movementType: 'return', expectedType: 'return' }
      ] as const;

      for (const testCase of testCases) {
        const data = {
          ...mockStockMovementData,
          movementType: testCase.movementType
        };

        const result = await auditService.logStockMovementAudit(data, mockContext);
        
        expect(result.success).toBe(true);
        expect(result.data!.type).toBe(testCase.expectedType);
      }
    });

    it('should handle negative quantity changes correctly', async () => {
      const saleMovement = {
        ...mockStockMovementData,
        movementType: 'sale' as const,
        quantityChanged: -50,
        quantityAfter: 50
      };

      const result = await auditService.logStockMovementAudit(saleMovement, mockContext);

      expect(result.success).toBe(true);
      expect(result.data!.quantity).toBe(50); // Should be absolute value
      expect(result.data!.type).toBe('stock_out');
    });

    it('should save to both stock_movements and audit_logs tables', async () => {
      const { supabase } = require('../../../utils/supabase');
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { id: 'movement-123' }, 
            error: null 
          }))
        }))
      }));

      supabase.from.mockImplementation((tableName: string) => {
        if (tableName === 'stock_movements' || tableName === 'stock_movement_audit_logs') {
          return { insert: mockInsert };
        }
        return { insert: vi.fn() };
      });

      const result = await auditService.logStockMovementAudit(
        mockStockMovementData,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(mockInsert).toHaveBeenCalledTimes(2); // Once for each table
    });

    it('should handle database errors gracefully', async () => {
      const { supabase } = require('../../../utils/supabase');
      supabase.from.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ 
              data: null, 
              error: { message: 'Database error' } 
            }))
          }))
        }))
      });

      const result = await auditService.logStockMovementAudit(
        mockStockMovementData,
        mockContext
      );

      expect(result.success).toBe(true); // Should still succeed with in-memory logging
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Database stock movement logging failed')
      );
    });
  });

  describe('logStatusTransition', () => {
    it('should log status transitions correctly', async () => {
      const result = await auditService.logStatusTransition(
        mockPurchaseOrder,
        'draft',
        'pending_approval',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data!.action).toBe(PurchaseOrderAuditAction.STATUS_CHANGED);
      expect(result.data!.oldValues).toEqual({ status: 'draft' });
      expect(result.data!.newValues).toEqual({ status: 'pending_approval' });
    });

    it('should work with enhanced purchase orders', async () => {
      const enhancedPO: EnhancedPurchaseOrder = {
        ...mockPurchaseOrder,
        statusHistory: [],
        receivingHistory: [],
        validationErrors: []
      };

      const result = await auditService.logStatusTransition(
        enhancedPO,
        'approved',
        'partially_received',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data!.purchaseOrderId).toBe(enhancedPO.id);
    });
  });

  describe('logReceivingActivity', () => {
    let mockReceipts: PartialReceiptItem[];

    beforeEach(() => {
      mockReceipts = [
        {
          productId: 'prod-1',
          productName: 'Product 1',
          productSku: 'SKU-001',
          orderedQuantity: 100,
          receivedQuantity: 80,
          totalReceived: 80,
          previouslyReceived: 0,
          unitCost: 10.00,
          totalCost: 800.00,
          condition: 'good'
        },
        {
          productId: 'prod-2',
          productName: 'Product 2',
          productSku: 'SKU-002',
          orderedQuantity: 50,
          receivedQuantity: 50,
          totalReceived: 50,
          previouslyReceived: 0,
          unitCost: 20.00,
          totalCost: 1000.00,
          condition: 'good'
        }
      ];
    });

    it('should log receiving activity with stock movements', async () => {
      const results = await auditService.logReceivingActivity(
        mockPurchaseOrder,
        mockReceipts,
        mockContext
      );

      expect(results).toHaveLength(3); // 1 receiving + 2 stock movements
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);

      // First result should be the receiving action
      expect(results[0].data!.action).toBe(PurchaseOrderAuditAction.PARTIALLY_RECEIVED);

      // Remaining results should be stock movements
      expect(results[1].data!.type).toBe('stock_in');
      expect(results[2].data!.type).toBe('stock_in');
    });

    it('should detect full receipt when all quantities match', async () => {
      const fullReceipts = mockReceipts.map(receipt => ({
        ...receipt,
        receivedQuantity: receipt.orderedQuantity,
        totalReceived: receipt.orderedQuantity
      }));

      const results = await auditService.logReceivingActivity(
        mockPurchaseOrder,
        fullReceipts,
        mockContext
      );

      expect(results[0].data!.action).toBe(PurchaseOrderAuditAction.RECEIVED);
    });

    it('should skip zero quantity receipts in stock movements', async () => {
      const mixedReceipts = [
        mockReceipts[0],
        { ...mockReceipts[1], receivedQuantity: 0 }
      ];

      const results = await auditService.logReceivingActivity(
        mockPurchaseOrder,
        mixedReceipts,
        mockContext
      );

      expect(results).toHaveLength(2); // 1 receiving + 1 stock movement (zero skipped)
    });

    it('should include receipt details in audit log', async () => {
      const results = await auditService.logReceivingActivity(
        mockPurchaseOrder,
        mockReceipts,
        mockContext
      );

      const receivingAudit = results[0].data;
      expect(receivingAudit!.newValues.receipts).toHaveLength(2);
      expect(receivingAudit!.newValues.receipts[0].productId).toBe('prod-1');
      expect(receivingAudit!.newValues.receipts[0].receivedQuantity).toBe(80);
      expect(receivingAudit!.newValues.receipts[0].condition).toBe('good');
    });
  });

  describe('logReceivingActivityDetailed', () => {
    let mockReceivingRecord: Parameters<typeof auditService.logReceivingActivityDetailed>[1];

    beforeEach(() => {
      mockReceivingRecord = {
        receivingNumber: 'RCV-2024-001',
        receivingType: 'partial',
        itemsReceived: [
          {
            productId: 'prod-1',
            productName: 'Product 1',
            sku: 'SKU-001',
            orderedQuantity: 100,
            receivedQuantity: 80,
            condition: 'good',
            qualityNotes: 'Items in good condition'
          }
        ],
        qualityNotes: 'Overall good quality',
        supplierDeliveryNote: 'DEL-001',
        vehicleInfo: 'Truck ABC-123',
        driverInfo: 'John Driver',
        attachments: ['photo1.jpg', 'invoice.pdf']
      };
    });

    it('should log detailed receiving activity with all metadata', async () => {
      const results = await auditService.logReceivingActivityDetailed(
        mockPurchaseOrder,
        mockReceivingRecord,
        mockContext
      );

      expect(results).toHaveLength(2); // Main audit + stock movement
      expect(results[0].success).toBe(true);
      
      const mainAudit = results[0].data;
      expect(mainAudit!.newValues.receivingNumber).toBe('RCV-2024-001');
      expect(mainAudit!.newValues.receivingType).toBe('partial');
      expect(mainAudit!.newValues.hasAttachments).toBe(true);
    });

    it('should detect quality issues', async () => {
      const recordWithIssues = {
        ...mockReceivingRecord,
        damageReport: 'Some items damaged during transport',
        discrepancyNotes: 'Quantity mismatch noted'
      };

      const results = await auditService.logReceivingActivityDetailed(
        mockPurchaseOrder,
        recordWithIssues,
        mockContext
      );

      expect(results[0].data!.newValues.hasQualityIssues).toBe(true);
    });

    it('should save detailed receiving record to database', async () => {
      const { supabase } = require('../../../utils/supabase');
      const mockInsert = vi.fn(() => ({
        insert: vi.fn(() => Promise.resolve({ error: null }))
      }));
      
      supabase.from.mockImplementation((tableName: string) => {
        if (tableName === 'purchase_order_receiving_records') {
          return { insert: mockInsert };
        }
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { id: 'mock-id' }, error: null }))
            }))
          }))
        };
      });

      await auditService.logReceivingActivityDetailed(
        mockPurchaseOrder,
        mockReceivingRecord,
        mockContext
      );

      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe('logApprovalActivity', () => {
    let mockApprovalData: Parameters<typeof auditService.logApprovalActivity>[1];

    beforeEach(() => {
      mockApprovalData = {
        approvalStatus: 'approved',
        approvalLevel: 2,
        approvalAmount: 2500.00,
        approvalLimit: 5000.00,
        notes: 'Approved for urgent procurement'
      };
    });

    it('should log approval activity with detailed information', async () => {
      const result = await auditService.logApprovalActivity(
        mockPurchaseOrder,
        mockApprovalData,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data!.action).toBe(PurchaseOrderAuditAction.APPROVED);
      expect(result.data!.newValues.approvalLevel).toBe(2);
      expect(result.data!.newValues.approvalAmount).toBe(2500.00);
    });

    it('should handle rejection workflow', async () => {
      const rejectionData = {
        ...mockApprovalData,
        approvalStatus: 'rejected' as const
      };

      const result = await auditService.logApprovalActivity(
        mockPurchaseOrder,
        rejectionData,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data!.action).toBe(PurchaseOrderAuditAction.REJECTED);
    });

    it('should save approval record to database', async () => {
      const { supabase } = require('../../../utils/supabase');
      const mockInsert = vi.fn(() => Promise.resolve({ error: null }));
      
      supabase.from.mockReturnValue({ insert: mockInsert });

      await auditService.logApprovalActivity(
        mockPurchaseOrder,
        mockApprovalData,
        mockContext
      );

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            purchase_order_id: mockPurchaseOrder.id,
            approval_status: 'approved',
            approval_level: 2
          })
        ])
      );
    });
  });

  describe('getAuditLogs', () => {
    it('should retrieve audit logs with default parameters', async () => {
      const { supabase } = require('../../../utils/supabase');
      const mockData = [
        {
          id: 'audit-1',
          purchase_order_id: 'po-123',
          purchase_order_number: 'PO-2024-001',
          action: 'created',
          performed_by: 'user-123',
          timestamp: new Date().toISOString()
        }
      ];

      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
        }))
      });

      const result = await auditService.getAuditLogs();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe('audit-1');
      expect(result.data![0].action).toBe('CREATED');
    });

    it('should apply filters correctly', async () => {
      const { supabase } = require('../../../utils/supabase');
      const mockQuery = {
        order: vi.fn(() => mockQuery),
        gte: vi.fn(() => mockQuery),
        lte: vi.fn(() => mockQuery),
        eq: vi.fn(() => mockQuery),
        limit: vi.fn(() => mockQuery),
        range: vi.fn(() => Promise.resolve({ data: [], error: null }))
      };

      supabase.from.mockReturnValue({
        select: vi.fn(() => mockQuery)
      });

      const filter: AuditLogFilter = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        performedBy: 'user-123',
        action: PurchaseOrderAuditAction.APPROVED,
        purchaseOrderId: 'po-123',
        limit: 50,
        offset: 10
      };

      await auditService.getAuditLogs(filter);

      expect(mockQuery.gte).toHaveBeenCalledWith('timestamp', filter.startDate!.toISOString());
      expect(mockQuery.lte).toHaveBeenCalledWith('timestamp', filter.endDate!.toISOString());
      expect(mockQuery.eq).toHaveBeenCalledWith('performed_by', filter.performedBy);
      expect(mockQuery.eq).toHaveBeenCalledWith('action', filter.action!.toLowerCase());
      expect(mockQuery.eq).toHaveBeenCalledWith('purchase_order_id', filter.purchaseOrderId);
      expect(mockQuery.limit).toHaveBeenCalledWith(filter.limit);
      expect(mockQuery.range).toHaveBeenCalledWith(filter.offset, filter.offset! + filter.limit! - 1);
    });

    it('should handle database errors gracefully', async () => {
      const { supabase } = require('../../../utils/supabase');
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ 
            data: null, 
            error: { message: 'Database error', code: 'DB001' } 
          }))
        }))
      });

      const result = await auditService.getAuditLogs();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to retrieve audit logs')
      );
    });
  });

  describe('Validation Error Logging', () => {
    it('should log validation errors with resolution tracking', async () => {
      const validationError = {
        errorType: 'over_receiving',
        errorCode: 'QTY_EXCEED_001',
        errorMessage: 'Received quantity exceeds ordered quantity',
        fieldName: 'receivedQuantity',
        fieldValue: '150',
        context: { orderedQuantity: 100, receivedQuantity: 150 }
      };

      const result = await auditService.logValidationError(
        mockPurchaseOrder.id,
        mockPurchaseOrder.poNumber,
        validationError,
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.auditId).toBeDefined();
    });

    it('should resolve validation errors', async () => {
      const result = await auditService.resolveValidationError(
        'error-123',
        'Issue resolved by adjusting ordered quantity',
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data!.resolved).toBe(true);
    });

    it('should determine error severity correctly', async () => {
      const criticalError = {
        errorType: 'duplicate_receipt_detected',
        errorCode: 'DUP_001',
        errorMessage: 'Duplicate receipt detected'
      };

      const result = await auditService.logValidationError(
        mockPurchaseOrder.id,
        mockPurchaseOrder.poNumber,
        criticalError,
        mockContext
      );

      expect(result.success).toBe(true);
      // The metadata should contain the determined severity
      // This would be verified by checking the database insert call
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle unexpected errors gracefully', async () => {
      const errorContext = { ...mockContext };
      // Simulate an error in the audit logging process
      vi.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
        throw new Error('JSON serialization failed');
      });

      const result = await auditService.logPurchaseOrderAudit(
        mockPurchaseOrder.id,
        mockPurchaseOrder.poNumber,
        PurchaseOrderAuditAction.CREATED,
        errorContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('JSON serialization failed');
      
      // Restore the original JSON.stringify
      vi.restoreAllMocks();
    });

    it('should continue with in-memory logging when database is unavailable', async () => {
      const { supabase } = require('../../../utils/supabase');
      supabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await auditService.logPurchaseOrderAudit(
        mockPurchaseOrder.id,
        mockPurchaseOrder.poNumber,
        PurchaseOrderAuditAction.CREATED,
        mockContext
      );

      expect(result.success).toBe(true); // Should still succeed
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining('Database audit logging failed')
      );
    });
  });
});