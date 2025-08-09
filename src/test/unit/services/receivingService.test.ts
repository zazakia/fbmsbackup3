/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ReceivingService,
  ReceiptValidationOptions,
  WeightedAverageCostCalculation
} from '../../../services/receivingService';
import {
  PurchaseOrder,
  PartialReceiptItem,
  ValidationErrorCode
} from '../../../types/business';

// Mock external dependencies
vi.mock('../../../utils/supabase');
vi.mock('../../../api/purchases');
vi.mock('../../../api/products');

describe('ReceivingService', () => {
  let receivingService: ReceivingService;
  let mockPurchaseOrder: PurchaseOrder;
  let mockReceiptItems: PartialReceiptItem[];

  beforeEach(() => {
    receivingService = new ReceivingService();
    
    // Reset all mocks
    vi.clearAllMocks();

    // Setup mock purchase order
    mockPurchaseOrder = {
      id: 'po-123',
      poNumber: 'PO-2024-001',
      supplierId: 'supplier-1',
      supplierName: 'Test Supplier',
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Product 1',
          sku: 'SKU-001',
          quantity: 100,
          cost: 10.00,
          total: 1000.00
        },
        {
          id: 'item-2',
          productId: 'prod-2',
          productName: 'Product 2',
          sku: 'SKU-002',
          quantity: 50,
          cost: 20.00,
          total: 1000.00
        }
      ],
      subtotal: 2000.00,
      tax: 240.00,
      total: 2240.00,
      status: 'sent',
      createdBy: 'user-1',
      createdAt: new Date('2024-01-01')
    };

    // Setup mock receipt items
    mockReceiptItems = [
      {
        id: 'receipt-1',
        productId: 'prod-1',
        productName: 'Product 1',
        productSku: 'SKU-001',
        orderedQuantity: 100,
        receivedQuantity: 100,
        previouslyReceived: 0,
        totalReceived: 100,
        pendingQuantity: 0,
        unitCost: 10.00,
        totalCost: 1000.00,
        condition: 'good'
      }
    ];
  });

  describe('validateReceipt', () => {
    it('should pass validation for valid receipt items', () => {
      const result = receivingService.validateReceipt(mockPurchaseOrder, mockReceiptItems);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when no receipt items provided', () => {
      const result = receivingService.validateReceipt(mockPurchaseOrder, []);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ValidationErrorCode.REQUIRED_FIELD_MISSING);
    });

    it('should fail validation when received quantity exceeds ordered quantity', () => {
      const invalidReceiptItems = [{
        ...mockReceiptItems[0],
        receivedQuantity: 150,
        totalReceived: 150
      }];

      const result = receivingService.validateReceipt(mockPurchaseOrder, invalidReceiptItems);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCode.QUANTITY_EXCEEDS_ORDERED)).toBe(true);
    });

    it('should allow over-receiving within tolerance when option is enabled', () => {
      const options: ReceiptValidationOptions = {
        allowOverReceiving: true,
        tolerancePercentage: 5.0
      };

      const overReceiptItems = [{
        ...mockReceiptItems[0],
        receivedQuantity: 104, // 4% over, within 5% tolerance
        totalReceived: 104
      }];

      const result = receivingService.validateReceipt(mockPurchaseOrder, overReceiptItems, options);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should fail validation when over-receiving exceeds tolerance', () => {
      const options: ReceiptValidationOptions = {
        allowOverReceiving: true,
        tolerancePercentage: 5.0
      };

      const overReceiptItems = [{
        ...mockReceiptItems[0],
        receivedQuantity: 110, // 10% over, exceeds 5% tolerance
        totalReceived: 110
      }];

      const result = receivingService.validateReceipt(mockPurchaseOrder, overReceiptItems, options);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCode.QUANTITY_EXCEEDS_ORDERED)).toBe(true);
    });

    it('should validate required fields for receipt items', () => {
      const invalidReceiptItems = [{
        ...mockReceiptItems[0],
        productId: '', // Invalid empty productId
        receivedQuantity: 0 // Invalid zero quantity
      }];

      const result = receivingService.validateReceipt(mockPurchaseOrder, invalidReceiptItems);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate product exists in purchase order', () => {
      const invalidReceiptItems = [{
        ...mockReceiptItems[0],
        productId: 'non-existent-product'
      }];

      const result = receivingService.validateReceipt(mockPurchaseOrder, invalidReceiptItems);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCode.PRODUCT_NOT_FOUND)).toBe(true);
    });

    it('should warn about significant cost variance', () => {
      const receiptItemsWithCostVariance = [{
        ...mockReceiptItems[0],
        unitCost: 15.00 // 50% variance from expected 10.00
      }];

      const result = receivingService.validateReceipt(mockPurchaseOrder, receiptItemsWithCostVariance);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.code === ValidationErrorCode.COST_VARIANCE_HIGH)).toBe(true);
    });

    it('should validate purchase order status allows receiving', () => {
      const draftPO = { ...mockPurchaseOrder, status: 'draft' };
      
      const result = receivingService.validateReceipt(draftPO, mockReceiptItems);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCode.INVALID_STATUS_TRANSITION)).toBe(true);
    });

    it('should require batch number when batch tracking is enabled', () => {
      const options: ReceiptValidationOptions = {
        requireBatchTracking: true
      };

      const receiptItemsWithoutBatch = [{
        ...mockReceiptItems[0],
        batchNumber: undefined
      }];

      const result = receivingService.validateReceipt(mockPurchaseOrder, receiptItemsWithoutBatch, options);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field.includes('batchNumber'))).toBe(true);
    });

    it('should require expiry date when expiry tracking is enabled', () => {
      const options: ReceiptValidationOptions = {
        requireExpiryDates: true
      };

      const receiptItemsWithoutExpiry = [{
        ...mockReceiptItems[0],
        expiryDate: undefined
      }];

      const result = receivingService.validateReceipt(mockPurchaseOrder, receiptItemsWithoutExpiry, options);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field.includes('expiryDate'))).toBe(true);
    });

    it('should validate condition codes', () => {
      const receiptItemsWithInvalidCondition = [{
        ...mockReceiptItems[0],
        condition: 'invalid_condition' as any
      }];

      const result = receivingService.validateReceipt(mockPurchaseOrder, receiptItemsWithInvalidCondition);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field.includes('condition'))).toBe(true);
    });
  });

  describe('calculateInventoryAdjustments', () => {
    it('should calculate correct inventory adjustments', async () => {
      // Mock getCurrentProductStock to return 50
      vi.spyOn(receivingService as any, 'getCurrentProductStock').mockResolvedValue(50);

      const adjustments = await receivingService.calculateInventoryAdjustments(
        mockPurchaseOrder,
        mockReceiptItems
      );

      expect(adjustments).toHaveLength(1);
      expect(adjustments[0]).toEqual({
        productId: 'prod-1',
        productName: 'Product 1',
        productSku: 'SKU-001',
        quantityChange: 100,
        unitCost: 10.00,
        totalCost: 1000.00,
        movementType: 'purchase_receipt',
        referenceId: 'po-123',
        batchNumber: undefined,
        expiryDate: undefined,
        previousStock: 50,
        newStock: 150
      });
    });

    it('should handle multiple receipt items', async () => {
      vi.spyOn(receivingService as any, 'getCurrentProductStock').mockResolvedValue(25);

      const multipleReceiptItems = [
        ...mockReceiptItems,
        {
          id: 'receipt-2',
          productId: 'prod-2',
          productName: 'Product 2',
          productSku: 'SKU-002',
          orderedQuantity: 50,
          receivedQuantity: 25,
          previouslyReceived: 0,
          totalReceived: 25,
          pendingQuantity: 25,
          unitCost: 20.00,
          totalCost: 500.00,
          condition: 'good' as const
        }
      ];

      const adjustments = await receivingService.calculateInventoryAdjustments(
        mockPurchaseOrder,
        multipleReceiptItems
      );

      expect(adjustments).toHaveLength(2);
      expect(adjustments[0].productId).toBe('prod-1');
      expect(adjustments[1].productId).toBe('prod-2');
    });

    it('should skip items with zero received quantity', async () => {
      const receiptItemsWithZero = [{
        ...mockReceiptItems[0],
        receivedQuantity: 0
      }];

      const adjustments = await receivingService.calculateInventoryAdjustments(
        mockPurchaseOrder,
        receiptItemsWithZero
      );

      expect(adjustments).toHaveLength(0);
    });
  });

  describe('calculateWeightedAverageCost', () => {
    it('should calculate weighted average cost correctly', () => {
      const result = receivingService.calculateWeightedAverageCost(
        100, // current stock
        10.00, // current cost
        50, // incoming quantity
        12.00 // incoming cost
      );

      const expected: WeightedAverageCostCalculation = {
        productId: '',
        currentStock: 100,
        currentCost: 10.00,
        currentValue: 1000.00,
        incomingQuantity: 50,
        incomingCost: 12.00,
        incomingValue: 600.00,
        newStock: 150,
        newWeightedAverageCost: 10.67, // (1000 + 600) / 150
        newTotalValue: 1600.00,
        costVariance: 0.67,
        costVariancePercentage: 6.67
      };

      expect(result.currentStock).toBe(expected.currentStock);
      expect(result.newStock).toBe(expected.newStock);
      expect(result.newWeightedAverageCost).toBeCloseTo(expected.newWeightedAverageCost, 2);
      expect(result.costVariancePercentage).toBeCloseTo(expected.costVariancePercentage, 2);
    });

    it('should handle zero current stock', () => {
      const result = receivingService.calculateWeightedAverageCost(
        0, // no current stock
        0, // no current cost
        100, // incoming quantity
        15.00 // incoming cost
      );

      expect(result.newStock).toBe(100);
      expect(result.newWeightedAverageCost).toBe(15.00);
      expect(result.newTotalValue).toBe(1500.00);
    });

    it('should handle zero incoming quantity', () => {
      const result = receivingService.calculateWeightedAverageCost(
        100, // current stock
        10.00, // current cost
        0, // no incoming quantity
        0 // no incoming cost
      );

      expect(result.newStock).toBe(100);
      expect(result.newWeightedAverageCost).toBe(10.00);
      expect(result.costVariance).toBe(0);
    });
  });

  describe('processReceipt', () => {
    beforeEach(() => {
      // Mock the loadPurchaseOrder method
      vi.spyOn(receivingService as any, 'loadPurchaseOrder').mockResolvedValue({
        data: mockPurchaseOrder,
        error: null
      });

      // Mock checkForDuplicateReceipts
      vi.spyOn(receivingService as any, 'checkForDuplicateReceipts').mockResolvedValue({
        hasDuplicates: false,
        errors: []
      });

      // Mock getCurrentProductStock
      vi.spyOn(receivingService as any, 'getCurrentProductStock').mockResolvedValue(50);

      // Mock validateStockMovements
      vi.spyOn(receivingService as any, 'validateStockMovements').mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: []
      });

      // Mock executeReceivingTransaction
      vi.spyOn(receivingService as any, 'executeReceivingTransaction').mockResolvedValue({
        success: true,
        receivingRecord: {
          id: 'rec-123',
          receivedDate: new Date(),
          receivedBy: 'user-1',
          items: mockReceiptItems,
          totalItems: 1,
          totalQuantity: 100,
          totalValue: 1000.00
        },
        updatedPurchaseOrder: {
          ...mockPurchaseOrder,
          status: 'partial'
        },
        errors: [],
        warnings: []
      });
    });

    it('should successfully process a valid receipt', async () => {
      const result = await receivingService.processReceipt(
        'po-123',
        mockReceiptItems,
        'user-1',
        'John Doe'
      );

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.receivingRecord).toBeDefined();
      expect(result.inventoryAdjustments).toBeDefined();
    });

    it('should fail when purchase order cannot be loaded', async () => {
      vi.spyOn(receivingService as any, 'loadPurchaseOrder').mockResolvedValue({
        data: null,
        error: new Error('PO not found')
      });

      const result = await receivingService.processReceipt(
        'invalid-po-id',
        mockReceiptItems,
        'user-1'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ValidationErrorCode.REQUIRED_FIELD_MISSING);
    });

    it('should fail when validation errors occur', async () => {
      const invalidReceiptItems = [{
        ...mockReceiptItems[0],
        receivedQuantity: 0 // Invalid quantity
      }];

      const result = await receivingService.processReceipt(
        'po-123',
        invalidReceiptItems,
        'user-1'
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail when duplicate receipts are detected', async () => {
      vi.spyOn(receivingService as any, 'checkForDuplicateReceipts').mockResolvedValue({
        hasDuplicates: true,
        errors: [{
          id: 'err-1',
          field: 'duplicate',
          message: 'Duplicate receipt detected',
          severity: 'error',
          code: ValidationErrorCode.DUPLICATE_RECEIPT_DETECTED
        }]
      });

      const result = await receivingService.processReceipt(
        'po-123',
        mockReceiptItems,
        'user-1'
      );

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCode.DUPLICATE_RECEIPT_DETECTED)).toBe(true);
    });

    it('should handle transaction failures gracefully', async () => {
      vi.spyOn(receivingService as any, 'executeReceivingTransaction').mockResolvedValue({
        success: false,
        errors: [{
          id: 'err-1',
          field: 'transaction',
          message: 'Database transaction failed',
          severity: 'error',
          code: ValidationErrorCode.INVALID_FORMAT
        }],
        warnings: []
      });

      const result = await receivingService.processReceipt(
        'po-123',
        mockReceiptItems,
        'user-1'
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle unexpected errors', async () => {
      vi.spyOn(receivingService as any, 'loadPurchaseOrder').mockRejectedValue(
        new Error('Unexpected database error')
      );

      const result = await receivingService.processReceipt(
        'po-123',
        mockReceiptItems,
        'user-1'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('system');
    });

    it('should include warnings in successful processing', async () => {
      // Mock validation to return warnings
      const receiptItemsWithWarning = [{
        ...mockReceiptItems[0],
        unitCost: 15.00 // High cost variance
      }];

      const result = await receivingService.processReceipt(
        'po-123',
        receiptItemsWithWarning,
        'user-1'
      );

      expect(result.success).toBe(true);
      expect(result.warnings).toBeDefined();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty product ID gracefully', () => {
      const receiptItemsWithEmptyProductId = [{
        ...mockReceiptItems[0],
        productId: ''
      }];

      const result = receivingService.validateReceipt(mockPurchaseOrder, receiptItemsWithEmptyProductId);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCode.REQUIRED_FIELD_MISSING)).toBe(true);
    });

    it('should handle negative costs', () => {
      const receiptItemsWithNegativeCost = [{
        ...mockReceiptItems[0],
        unitCost: -5.00
      }];

      const result = receivingService.validateReceipt(mockPurchaseOrder, receiptItemsWithNegativeCost);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCode.NEGATIVE_COST)).toBe(true);
    });

    it('should handle very large quantities', () => {
      const receiptItemsWithLargeQuantity = [{
        ...mockReceiptItems[0],
        receivedQuantity: 999999,
        totalReceived: 999999
      }];

      const result = receivingService.validateReceipt(mockPurchaseOrder, receiptItemsWithLargeQuantity);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCode.QUANTITY_EXCEEDS_ORDERED)).toBe(true);
    });

    it('should handle malformed receipt items', () => {
      const malformedReceiptItems = [
        {
          // Missing required fields
          condition: 'good'
        } as any
      ];

      const result = receivingService.validateReceipt(mockPurchaseOrder, malformedReceiptItems);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('performance and scalability', () => {
    it('should handle large number of receipt items efficiently', async () => {
      // Create 1000 receipt items
      const largeReceiptItems = Array.from({ length: 1000 }, (_, index) => ({
        ...mockReceiptItems[0],
        id: `receipt-${index}`,
        productId: `prod-${index % 10}`, // Distribute across 10 products
        receivedQuantity: 1
      }));

      // Add corresponding items to purchase order
      const largePO = {
        ...mockPurchaseOrder,
        items: Array.from({ length: 10 }, (_, index) => ({
          id: `item-${index}`,
          productId: `prod-${index}`,
          productName: `Product ${index}`,
          sku: `SKU-${index}`,
          quantity: 1000,
          cost: 10.00,
          total: 10000.00
        }))
      };

      const startTime = Date.now();
      const result = receivingService.validateReceipt(largePO, largeReceiptItems);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.isValid).toBe(true);
    });
  });
});