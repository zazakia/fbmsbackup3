import { describe, it, expect } from 'vitest';
import {
  EnhancedPurchaseOrderStatus,
  StatusTransitionRules,
  StatusTransition,
  ReceivingRecord,
  PartialReceiptItem,
  EnhancedPurchaseOrderItem,
  EnhancedPurchaseOrder,
  ValidationError,
  ValidationErrorCode,
  PurchaseOrderAuditAction,
  PurchaseOrderAuditLog,
  ApprovalRecord,
  DamageReport,
  ReceiptLineItem
} from '../../../types/business';

describe('Enhanced Purchase Order Types', () => {
  describe('EnhancedPurchaseOrderStatus', () => {
    it('should include all required status values', () => {
      const statuses: EnhancedPurchaseOrderStatus[] = [
        'draft',
        'pending_approval',
        'approved',
        'sent_to_supplier',
        'partially_received',
        'fully_received',
        'cancelled',
        'closed'
      ];

      // Verify each status is a valid EnhancedPurchaseOrderStatus
      statuses.forEach(status => {
        expect(typeof status).toBe('string');
        expect(status).not.toBe('');
      });

      // Verify the count matches expected
      expect(statuses).toHaveLength(8);
    });
  });

  describe('StatusTransition Interface', () => {
    it('should create a valid status transition object', () => {
      const transition: StatusTransition = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        fromStatus: 'draft',
        toStatus: 'pending_approval',
        timestamp: new Date('2023-12-01T10:00:00Z'),
        performedBy: 'user-123',
        reason: 'Order ready for approval',
        metadata: { approvalRequired: true }
      };

      expect(transition.id).toBe('123e4567-e89b-12d3-a456-426614174000');
      expect(transition.fromStatus).toBe('draft');
      expect(transition.toStatus).toBe('pending_approval');
      expect(transition.timestamp).toBeInstanceOf(Date);
      expect(transition.performedBy).toBe('user-123');
      expect(transition.reason).toBe('Order ready for approval');
      expect(transition.metadata).toEqual({ approvalRequired: true });
    });

    it('should allow optional fields to be undefined', () => {
      const transition: StatusTransition = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        fromStatus: 'draft',
        toStatus: 'pending_approval',
        timestamp: new Date(),
        performedBy: 'user-123'
      };

      expect(transition.reason).toBeUndefined();
      expect(transition.metadata).toBeUndefined();
    });
  });

  describe('PartialReceiptItem Interface', () => {
    it('should create a valid partial receipt item', () => {
      const receiptItem: PartialReceiptItem = {
        id: 'receipt-item-001',
        productId: 'product-123',
        productName: 'Test Product',
        productSku: 'SKU-001',
        orderedQuantity: 100,
        receivedQuantity: 50,
        previouslyReceived: 0,
        totalReceived: 50,
        pendingQuantity: 50,
        unitCost: 10.50,
        totalCost: 525.00,
        condition: 'good',
        batchNumber: 'BATCH-2023-001',
        expiryDate: new Date('2024-12-31'),
        serialNumbers: ['SN001', 'SN002'],
        qualityStatus: 'approved',
        notes: 'Items in good condition'
      };

      expect(receiptItem.id).toBe('receipt-item-001');
      expect(receiptItem.productId).toBe('product-123');
      expect(receiptItem.orderedQuantity).toBe(100);
      expect(receiptItem.receivedQuantity).toBe(50);
      expect(receiptItem.totalReceived).toBe(50);
      expect(receiptItem.pendingQuantity).toBe(50);
      expect(receiptItem.condition).toBe('good');
      expect(receiptItem.serialNumbers).toEqual(['SN001', 'SN002']);
    });

    it('should validate condition values', () => {
      const validConditions: PartialReceiptItem['condition'][] = [
        'good', 'damaged', 'expired', 'returned'
      ];

      validConditions.forEach(condition => {
        const receiptItem: Partial<PartialReceiptItem> = { condition };
        expect(receiptItem.condition).toBe(condition);
      });
    });

    it('should calculate quantities correctly', () => {
      const receiptItem: PartialReceiptItem = {
        id: 'receipt-item-002',
        productId: 'product-456',
        productName: 'Another Product',
        productSku: 'SKU-002',
        orderedQuantity: 200,
        receivedQuantity: 75,
        previouslyReceived: 25,
        totalReceived: 100,
        pendingQuantity: 100,
        unitCost: 5.25,
        totalCost: 393.75,
        condition: 'good'
      };

      // Verify calculations
      expect(receiptItem.totalReceived).toBe(receiptItem.previouslyReceived + receiptItem.receivedQuantity);
      expect(receiptItem.pendingQuantity).toBe(receiptItem.orderedQuantity - receiptItem.totalReceived);
      expect(receiptItem.totalCost).toBe(receiptItem.receivedQuantity * receiptItem.unitCost);
    });
  });

  describe('ReceivingRecord Interface', () => {
    it('should create a valid receiving record', () => {
      const partialReceipt: PartialReceiptItem = {
        id: 'receipt-item-001',
        productId: 'product-123',
        productName: 'Test Product',
        productSku: 'SKU-001',
        orderedQuantity: 100,
        receivedQuantity: 50,
        previouslyReceived: 0,
        totalReceived: 50,
        pendingQuantity: 50,
        unitCost: 10.50,
        totalCost: 525.00,
        condition: 'good'
      };

      const receivingRecord: ReceivingRecord = {
        id: 'receiving-001',
        receivedDate: new Date('2023-12-01T14:30:00Z'),
        receivedBy: 'warehouse-user-001',
        receivedByName: 'John Warehouse',
        items: [partialReceipt],
        notes: 'Partial shipment received',
        attachments: ['receipt-photo-001.jpg'],
        totalItems: 1,
        totalQuantity: 50,
        totalValue: 525.00
      };

      expect(receivingRecord.id).toBe('receiving-001');
      expect(receivingRecord.items).toHaveLength(1);
      expect(receivingRecord.totalItems).toBe(1);
      expect(receivingRecord.totalQuantity).toBe(50);
      expect(receivingRecord.totalValue).toBe(525.00);
      expect(receivingRecord.attachments).toEqual(['receipt-photo-001.jpg']);
    });

    it('should calculate totals correctly for multiple items', () => {
      const item1: PartialReceiptItem = {
        id: 'receipt-item-001',
        productId: 'product-123',
        productName: 'Product 1',
        productSku: 'SKU-001',
        orderedQuantity: 100,
        receivedQuantity: 50,
        previouslyReceived: 0,
        totalReceived: 50,
        pendingQuantity: 50,
        unitCost: 10.00,
        totalCost: 500.00,
        condition: 'good'
      };

      const item2: PartialReceiptItem = {
        id: 'receipt-item-002',
        productId: 'product-456',
        productName: 'Product 2',
        productSku: 'SKU-002',
        orderedQuantity: 200,
        receivedQuantity: 100,
        previouslyReceived: 0,
        totalReceived: 100,
        pendingQuantity: 100,
        unitCost: 15.00,
        totalCost: 1500.00,
        condition: 'good'
      };

      const receivingRecord: ReceivingRecord = {
        id: 'receiving-002',
        receivedDate: new Date(),
        receivedBy: 'user-001',
        items: [item1, item2],
        totalItems: 2,
        totalQuantity: 150, // 50 + 100
        totalValue: 2000.00 // 500 + 1500
      };

      expect(receivingRecord.totalItems).toBe(2);
      expect(receivingRecord.totalQuantity).toBe(150);
      expect(receivingRecord.totalValue).toBe(2000.00);
    });
  });

  describe('ValidationError Interface', () => {
    it('should create validation errors with proper structure', () => {
      const validationError: ValidationError = {
        id: 'error-001',
        field: 'receivedQuantity',
        message: 'Received quantity exceeds ordered quantity',
        severity: 'error',
        code: ValidationErrorCode.QUANTITY_EXCEEDS_ORDERED,
        metadata: {
          orderedQuantity: 100,
          receivedQuantity: 150,
          productId: 'product-123'
        }
      };

      expect(validationError.id).toBe('error-001');
      expect(validationError.field).toBe('receivedQuantity');
      expect(validationError.severity).toBe('error');
      expect(validationError.code).toBe(ValidationErrorCode.QUANTITY_EXCEEDS_ORDERED);
      expect(validationError.metadata?.orderedQuantity).toBe(100);
      expect(validationError.metadata?.receivedQuantity).toBe(150);
    });

    it('should support different severity levels', () => {
      const severities: ValidationError['severity'][] = ['error', 'warning', 'info'];
      
      severities.forEach(severity => {
        const error: ValidationError = {
          id: `error-${severity}`,
          field: 'testField',
          message: `Test ${severity} message`,
          severity,
          code: ValidationErrorCode.REQUIRED_FIELD_MISSING
        };
        
        expect(error.severity).toBe(severity);
      });
    });
  });

  describe('ValidationErrorCode Enum', () => {
    it('should contain all expected error codes', () => {
      const expectedCodes = [
        'QUANTITY_EXCEEDS_ORDERED',
        'QUANTITY_NEGATIVE',
        'QUANTITY_ZERO',
        'INVALID_STATUS_TRANSITION',
        'STATUS_ALREADY_SET',
        'INSUFFICIENT_PERMISSIONS',
        'USER_NOT_AUTHORIZED',
        'ALREADY_FULLY_RECEIVED',
        'CANNOT_RECEIVE_CANCELLED_ORDER',
        'DUPLICATE_RECEIPT_DETECTED',
        'PRODUCT_NOT_FOUND',
        'PRODUCT_INACTIVE',
        'SUPPLIER_NOT_FOUND',
        'SUPPLIER_INACTIVE',
        'COST_VARIANCE_HIGH',
        'NEGATIVE_COST',
        'INVALID_DATE_RANGE',
        'PAST_DATE_NOT_ALLOWED',
        'FUTURE_DATE_NOT_ALLOWED',
        'REQUIRED_FIELD_MISSING',
        'INVALID_FORMAT',
        'INVALID_EMAIL_FORMAT',
        'INVALID_PHONE_FORMAT'
      ];

      expectedCodes.forEach(code => {
        expect(ValidationErrorCode[code as keyof typeof ValidationErrorCode]).toBeDefined();
        expect(ValidationErrorCode[code as keyof typeof ValidationErrorCode]).toBe(code);
      });
    });
  });

  describe('EnhancedPurchaseOrderItem Interface', () => {
    it('should extend PurchaseOrderItem with receiving fields', () => {
      const enhancedItem: EnhancedPurchaseOrderItem = {
        // Base PurchaseOrderItem fields
        id: 'item-001',
        productId: 'product-123',
        productName: 'Test Product',
        sku: 'SKU-001',
        quantity: 100,
        cost: 10.50,
        total: 1050.00,
        
        // Enhanced fields
        receivedQuantity: 50,
        pendingQuantity: 50,
        totalReceived: 50,
        receivingHistory: [],
        qualityStatus: 'pending',
        damageReports: [],
        batchNumber: 'BATCH-001',
        expiryDate: new Date('2024-12-31'),
        serialNumbers: ['SN001', 'SN002']
      };

      // Verify base fields
      expect(enhancedItem.id).toBe('item-001');
      expect(enhancedItem.quantity).toBe(100);
      expect(enhancedItem.cost).toBe(10.50);
      
      // Verify enhanced fields
      expect(enhancedItem.receivedQuantity).toBe(50);
      expect(enhancedItem.pendingQuantity).toBe(50);
      expect(enhancedItem.qualityStatus).toBe('pending');
      expect(enhancedItem.serialNumbers).toEqual(['SN001', 'SN002']);
    });
  });

  describe('DamageReport Interface', () => {
    it('should create a complete damage report', () => {
      const damageReport: DamageReport = {
        id: 'damage-001',
        reportDate: new Date('2023-12-01T15:00:00Z'),
        reportedBy: 'inspector-001',
        damageType: 'physical',
        severity: 'major',
        description: 'Boxes were damaged during shipping',
        quantity: 10,
        estimatedLoss: 105.00,
        supplierNotified: true,
        actionTaken: 'Segregated damaged items, contacted supplier',
        photosAttached: ['damage-photo-001.jpg', 'damage-photo-002.jpg'],
        resolutionStatus: 'claim_filed'
      };

      expect(damageReport.damageType).toBe('physical');
      expect(damageReport.severity).toBe('major');
      expect(damageReport.quantity).toBe(10);
      expect(damageReport.supplierNotified).toBe(true);
      expect(damageReport.photosAttached).toHaveLength(2);
      expect(damageReport.resolutionStatus).toBe('claim_filed');
    });

    it('should validate damage types', () => {
      const damageTypes: DamageReport['damageType'][] = [
        'physical', 'expired', 'defective', 'contaminated', 'missing'
      ];

      damageTypes.forEach(damageType => {
        const report: Partial<DamageReport> = { damageType };
        expect(report.damageType).toBe(damageType);
      });
    });

    it('should validate severity levels', () => {
      const severities: DamageReport['severity'][] = ['minor', 'major', 'total_loss'];

      severities.forEach(severity => {
        const report: Partial<DamageReport> = { severity };
        expect(report.severity).toBe(severity);
      });
    });
  });

  describe('ApprovalRecord Interface', () => {
    it('should create a valid approval record', () => {
      const approval: ApprovalRecord = {
        id: 'approval-001',
        approverUserId: 'manager-001',
        approverName: 'Jane Manager',
        approverRole: 'Purchase Manager',
        approvalDate: new Date('2023-12-01T09:00:00Z'),
        approvalStatus: 'approved',
        comments: 'Approved - within budget limits',
        approvalLevel: 1,
        amountApproved: 5000.00
      };

      expect(approval.approverUserId).toBe('manager-001');
      expect(approval.approverName).toBe('Jane Manager');
      expect(approval.approvalStatus).toBe('approved');
      expect(approval.approvalLevel).toBe(1);
      expect(approval.amountApproved).toBe(5000.00);
    });

    it('should validate approval status values', () => {
      const statuses: ApprovalRecord['approvalStatus'][] = ['approved', 'rejected', 'pending'];

      statuses.forEach(status => {
        const approval: Partial<ApprovalRecord> = { approvalStatus: status };
        expect(approval.approvalStatus).toBe(status);
      });
    });
  });

  describe('PurchaseOrderAuditAction Enum', () => {
    it('should contain all expected audit actions', () => {
      const expectedActions = [
        'CREATED',
        'UPDATED',
        'STATUS_CHANGED',
        'APPROVED',
        'REJECTED',
        'SENT_TO_SUPPLIER',
        'RECEIVED',
        'PARTIALLY_RECEIVED',
        'CANCELLED',
        'CLOSED',
        'DELETED'
      ];

      expectedActions.forEach(action => {
        expect(PurchaseOrderAuditAction[action as keyof typeof PurchaseOrderAuditAction]).toBeDefined();
        expect(PurchaseOrderAuditAction[action as keyof typeof PurchaseOrderAuditAction]).toBe(action.toLowerCase());
      });
    });
  });

  describe('PurchaseOrderAuditLog Interface', () => {
    it('should create a complete audit log entry', () => {
      const auditLog: PurchaseOrderAuditLog = {
        id: 'audit-001',
        purchaseOrderId: 'po-001',
        purchaseOrderNumber: 'PO-2023-001',
        action: PurchaseOrderAuditAction.STATUS_CHANGED,
        performedBy: 'user-123',
        performedByName: 'John Doe',
        timestamp: new Date('2023-12-01T10:30:00Z'),
        oldValues: { status: 'draft' },
        newValues: { status: 'pending_approval' },
        reason: 'Order ready for approval',
        metadata: { 
          approverRequired: 'manager-001',
          amount: 5000.00 
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Chrome/91.0'
      };

      expect(auditLog.action).toBe(PurchaseOrderAuditAction.STATUS_CHANGED);
      expect(auditLog.oldValues).toEqual({ status: 'draft' });
      expect(auditLog.newValues).toEqual({ status: 'pending_approval' });
      expect(auditLog.metadata?.amount).toBe(5000.00);
      expect(auditLog.ipAddress).toBe('192.168.1.100');
    });
  });

  describe('Type Relationships and Integration', () => {
    it('should create a complete enhanced purchase order with all related types', () => {
      const statusTransition: StatusTransition = {
        id: 'transition-001',
        fromStatus: 'draft',
        toStatus: 'pending_approval',
        timestamp: new Date(),
        performedBy: 'user-123'
      };

      const partialReceipt: PartialReceiptItem = {
        id: 'receipt-001',
        productId: 'product-123',
        productName: 'Test Product',
        productSku: 'SKU-001',
        orderedQuantity: 100,
        receivedQuantity: 50,
        previouslyReceived: 0,
        totalReceived: 50,
        pendingQuantity: 50,
        unitCost: 10.50,
        totalCost: 525.00,
        condition: 'good'
      };

      const receivingRecord: ReceivingRecord = {
        id: 'receiving-001',
        receivedDate: new Date(),
        receivedBy: 'warehouse-001',
        items: [partialReceipt],
        totalItems: 1,
        totalQuantity: 50,
        totalValue: 525.00
      };

      const validationError: ValidationError = {
        id: 'error-001',
        field: 'quantity',
        message: 'Test validation error',
        severity: 'warning',
        code: ValidationErrorCode.QUANTITY_EXCEEDS_ORDERED
      };

      const approval: ApprovalRecord = {
        id: 'approval-001',
        approverUserId: 'manager-001',
        approverName: 'Jane Manager',
        approverRole: 'Purchase Manager',
        approvalDate: new Date(),
        approvalStatus: 'approved',
        approvalLevel: 1,
        amountApproved: 1050.00
      };

      // Create enhanced purchase order using all the related types
      const enhancedPO: Partial<EnhancedPurchaseOrder> = {
        statusHistory: [statusTransition],
        receivingHistory: [receivingRecord],
        validationErrors: [validationError],
        approvalHistory: [approval],
        totalReceived: 50,
        totalPending: 50,
        isPartiallyReceived: true,
        isFullyReceived: false
      };

      expect(enhancedPO.statusHistory).toHaveLength(1);
      expect(enhancedPO.receivingHistory).toHaveLength(1);
      expect(enhancedPO.validationErrors).toHaveLength(1);
      expect(enhancedPO.approvalHistory).toHaveLength(1);
      expect(enhancedPO.isPartiallyReceived).toBe(true);
      expect(enhancedPO.isFullyReceived).toBe(false);
    });
  });
});