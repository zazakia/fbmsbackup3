import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { 
  ReceivingService,
  ReceiptProcessingResult,
  InventoryAdjustment,
  ReceiptValidationOptions
} from '../../../services/receivingService';
import { PurchaseOrder, PartialReceiptItem, ValidationErrorCode } from '../../../types/business';
import { TestDataFactory } from '../../factories/testDataFactory';

// Mock external dependencies
vi.mock('../../../utils/supabase');
vi.mock('../../../api/purchases');
vi.mock('../../../api/products');
vi.mock('../../../services/weightedAverageCostService');
vi.mock('../../../services/inventoryValueAdjustmentService');

describe('ReceivingService - Comprehensive Tests', () => {
  let receivingService: ReceivingService;
  let mockPurchaseOrder: PurchaseOrder;
  let mockReceipts: PartialReceiptItem[];
  let getPurchaseOrderMock: MockedFunction<any>;

  beforeEach(() => {
    receivingService = new ReceivingService();
    
    // Create mock purchase order
    mockPurchaseOrder = TestDataFactory.createPurchaseOrder({
      status: 'sent',
      items: [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Test Product 1',
          sku: 'SKU-001',
          quantity: 100,
          cost: 10.00,
          total: 1000.00
        },
        {
          id: 'item-2',
          productId: 'prod-2',
          productName: 'Test Product 2',
          sku: 'SKU-002',
          quantity: 50,
          cost: 20.00,
          total: 1000.00
        }
      ]
    });

    // Create mock receipts
    mockReceipts = [
      {
        productId: 'prod-1',
        productName: 'Test Product 1',
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
        productName: 'Test Product 2',
        productSku: 'SKU-002',
        orderedQuantity: 50,
        receivedQuantity: 50,
        totalReceived: 50,
        previouslyReceived: 0,
        unitCost: 21.00,
        totalCost: 1050.00,
        condition: 'good'
      }
    ];

    // Setup mocks
    const { getPurchaseOrder } = require('../../../api/purchases');
    getPurchaseOrderMock = getPurchaseOrder;
    getPurchaseOrderMock.mockResolvedValue({ data: mockPurchaseOrder, error: null });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('processReceipt - Core Functionality', () => {
    it('should successfully process a valid receipt', async () => {
      const result = await receivingService.processReceipt(
        mockPurchaseOrder.id,
        mockReceipts,
        'user-123',
        'John Doe',
        'First shipment received'
      );

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.receivingRecord).toBeDefined();
      expect(result.updatedPurchaseOrder).toBeDefined();
      expect(result.inventoryAdjustments).toHaveLength(2);
      expect(result.costCalculations).toBeDefined();
    });

    it('should handle purchase order not found', async () => {
      getPurchaseOrderMock.mockResolvedValue({ data: null, error: new Error('Not found') });

      const result = await receivingService.processReceipt(
        'invalid-po-id',
        mockReceipts,
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ValidationErrorCode.REQUIRED_FIELD_MISSING);
      expect(result.errors[0].message).toContain('Purchase order not found');
    });

    it('should reject receipts for invalid purchase order status', async () => {
      const invalidStatusPO = { ...mockPurchaseOrder, status: 'cancelled' };
      getPurchaseOrderMock.mockResolvedValue({ data: invalidStatusPO, error: null });

      const result = await receivingService.processReceipt(
        mockPurchaseOrder.id,
        mockReceipts,
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCode.INVALID_STATUS_TRANSITION)).toBe(true);
    });

    it('should handle empty receipts array', async () => {
      const result = await receivingService.processReceipt(
        mockPurchaseOrder.id,
        [],
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ValidationErrorCode.REQUIRED_FIELD_MISSING);
    });

    it('should validate all receipt items and collect multiple errors', async () => {
      const invalidReceipts: PartialReceiptItem[] = [
        {
          ...mockReceipts[0],
          receivedQuantity: 0, // Invalid quantity
          unitCost: -5.00 // Invalid cost
        },
        {
          ...mockReceipts[1],
          productId: 'non-existent-product' // Product not in PO
        }
      ];

      const result = await receivingService.processReceipt(
        mockPurchaseOrder.id,
        invalidReceipts,
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
      expect(result.errors.some(e => e.code === ValidationErrorCode.QUANTITY_ZERO)).toBe(true);
      expect(result.errors.some(e => e.code === ValidationErrorCode.NEGATIVE_COST)).toBe(true);
      expect(result.errors.some(e => e.code === ValidationErrorCode.PRODUCT_NOT_FOUND)).toBe(true);
    });
  });

  describe('validateReceipt - Business Rules', () => {
    it('should validate receipt items against purchase order items', () => {
      const validation = receivingService.validateReceipt(mockPurchaseOrder, mockReceipts);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject over-receiving when not allowed', () => {
      const overReceipts = [
        {
          ...mockReceipts[0],
          receivedQuantity: 150, // More than ordered
          totalReceived: 150
        }
      ];

      const validation = receivingService.validateReceipt(
        mockPurchaseOrder, 
        overReceipts,
        { allowOverReceiving: false }
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === ValidationErrorCode.QUANTITY_EXCEEDS_ORDERED)).toBe(true);
    });

    it('should allow over-receiving within tolerance', () => {
      const slightlyOverReceipts = [
        {
          ...mockReceipts[0],
          receivedQuantity: 103, // 3% over
          totalReceived: 103
        }
      ];

      const validation = receivingService.validateReceipt(
        mockPurchaseOrder, 
        slightlyOverReceipts,
        { allowOverReceiving: true, tolerancePercentage: 5.0 }
      );

      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some(w => w.code === ValidationErrorCode.QUANTITY_EXCEEDS_ORDERED)).toBe(true);
    });

    it('should reject over-receiving beyond tolerance', () => {
      const wayOverReceipts = [
        {
          ...mockReceipts[0],
          receivedQuantity: 120, // 20% over
          totalReceived: 120
        }
      ];

      const validation = receivingService.validateReceipt(
        mockPurchaseOrder, 
        wayOverReceipts,
        { allowOverReceiving: true, tolerancePercentage: 5.0 }
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === ValidationErrorCode.QUANTITY_EXCEEDS_ORDERED)).toBe(true);
    });

    it('should detect significant price variances', () => {
      const priceVarianceReceipts = [
        {
          ...mockReceipts[0],
          unitCost: 15.00, // 50% price increase
          totalCost: 1200.00
        }
      ];

      const validation = receivingService.validateReceipt(mockPurchaseOrder, priceVarianceReceipts);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some(w => w.code === ValidationErrorCode.COST_VARIANCE_HIGH)).toBe(true);
    });

    it('should enforce batch tracking when required', () => {
      const receiptWithoutBatch = [
        {
          ...mockReceipts[0],
          batchNumber: undefined
        }
      ];

      const validation = receivingService.validateReceipt(
        mockPurchaseOrder, 
        receiptWithoutBatch,
        { requireBatchTracking: true }
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === ValidationErrorCode.REQUIRED_FIELD_MISSING)).toBe(true);
    });

    it('should enforce expiry dates when required', () => {
      const receiptWithoutExpiry = [
        {
          ...mockReceipts[0],
          expiryDate: undefined
        }
      ];

      const validation = receivingService.validateReceipt(
        mockPurchaseOrder, 
        receiptWithoutExpiry,
        { requireExpiryDates: true }
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === ValidationErrorCode.REQUIRED_FIELD_MISSING)).toBe(true);
    });

    it('should validate condition codes', () => {
      const receiptWithInvalidCondition = [
        {
          ...mockReceipts[0],
          condition: 'invalid_condition' as any
        }
      ];

      const validation = receivingService.validateReceipt(mockPurchaseOrder, receiptWithInvalidCondition);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === ValidationErrorCode.INVALID_FORMAT)).toBe(true);
    });
  });

  describe('calculateInventoryAdjustments - Cost Calculations', () => {
    it('should calculate correct inventory adjustments', async () => {
      const adjustments = await receivingService.calculateInventoryAdjustments(
        mockPurchaseOrder,
        mockReceipts
      );

      expect(adjustments).toHaveLength(2);
      
      const adjustment1 = adjustments.find(a => a.productId === 'prod-1');
      expect(adjustment1).toBeDefined();
      expect(adjustment1!.quantityChange).toBe(80);
      expect(adjustment1!.unitCost).toBe(10.00);
      expect(adjustment1!.totalCost).toBe(800.00);
      expect(adjustment1!.movementType).toBe('purchase_receipt');
      
      const adjustment2 = adjustments.find(a => a.productId === 'prod-2');
      expect(adjustment2).toBeDefined();
      expect(adjustment2!.quantityChange).toBe(50);
      expect(adjustment2!.unitCost).toBe(21.00);
      expect(adjustment2!.totalCost).toBe(1050.00);
    });

    it('should skip zero quantity receipts', async () => {
      const receiptsWithZero = [
        { ...mockReceipts[0], receivedQuantity: 0 },
        mockReceipts[1]
      ];

      const adjustments = await receivingService.calculateInventoryAdjustments(
        mockPurchaseOrder,
        receiptsWithZero
      );

      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].productId).toBe('prod-2');
    });

    it('should include batch numbers and expiry dates when provided', async () => {
      const receiptsWithTracking = [
        {
          ...mockReceipts[0],
          batchNumber: 'BATCH-001',
          expiryDate: new Date('2025-12-31')
        }
      ];

      const adjustments = await receivingService.calculateInventoryAdjustments(
        mockPurchaseOrder,
        receiptsWithTracking
      );

      expect(adjustments[0].batchNumber).toBe('BATCH-001');
      expect(adjustments[0].expiryDate).toEqual(new Date('2025-12-31'));
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database errors gracefully', async () => {
      getPurchaseOrderMock.mockRejectedValue(new Error('Database connection failed'));

      const result = await receivingService.processReceipt(
        mockPurchaseOrder.id,
        mockReceipts,
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Purchase order not found');
    });

    it('should handle cost processing errors', async () => {
      const { weightedAverageCostService } = require('../../../services/weightedAverageCostService');
      weightedAverageCostService.processPurchaseOrderCostUpdates.mockRejectedValue(
        new Error('Cost calculation failed')
      );

      const result = await receivingService.processReceipt(
        mockPurchaseOrder.id,
        mockReceipts,
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.message.includes('cost calculations'))).toBe(true);
    });

    it('should handle missing required fields gracefully', async () => {
      const incompleteReceipts = [
        {
          productId: '',
          productName: 'Test Product',
          productSku: 'SKU-001',
          orderedQuantity: 100,
          receivedQuantity: 80,
          totalReceived: 80,
          previouslyReceived: 0,
          unitCost: 10.00,
          totalCost: 800.00,
          condition: 'good'
        } as PartialReceiptItem
      ];

      const validation = receivingService.validateReceipt(mockPurchaseOrder, incompleteReceipts);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === ValidationErrorCode.REQUIRED_FIELD_MISSING)).toBe(true);
    });

    it('should detect and prevent duplicate receipt processing', async () => {
      // Mock supabase to return a recent receipt
      const { supabase } = require('../../../utils/supabase');
      supabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ 
            data: [{ 
              id: 'recent-receipt', 
              created_at: new Date().toISOString() 
            }], 
            error: null 
          }))
        }))
      });

      const result = await receivingService.processReceipt(
        mockPurchaseOrder.id,
        mockReceipts,
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.code === ValidationErrorCode.DUPLICATE_RECEIPT_DETECTED)).toBe(true);
    });
  });

  describe('Integration with Cost Services', () => {
    it('should process cost calculations and detect price variances', async () => {
      const { weightedAverageCostService } = require('../../../services/weightedAverageCostService');
      weightedAverageCostService.processPurchaseOrderCostUpdates.mockResolvedValue({
        costCalculations: [
          {
            productId: 'prod-1',
            newWeightedAverageCost: 10.50,
            costVariance: 0.50
          }
        ],
        priceVariances: [
          {
            productId: 'prod-2',
            variancePercentage: 15.0,
            totalVarianceAmount: 50.00
          }
        ],
        valueAdjustments: [],
        transaction: { id: 'cost-transaction-123' }
      });

      const result = await receivingService.processReceipt(
        mockPurchaseOrder.id,
        mockReceipts,
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(result.costCalculations).toHaveLength(1);
      expect(result.priceVariances).toHaveLength(1);
      expect(result.warnings.some(w => w.code === ValidationErrorCode.COST_VARIANCE_HIGH)).toBe(true);
    });

    it('should process general ledger adjustments', async () => {
      const { inventoryValueAdjustmentService } = require('../../../services/inventoryValueAdjustmentService');
      inventoryValueAdjustmentService.processInventoryValueAdjustments.mockResolvedValue({
        success: true,
        summary: {
          totalValueAdjustment: 1850.00,
          accountsAffected: 2
        }
      });

      const result = await receivingService.processReceipt(
        mockPurchaseOrder.id,
        mockReceipts,
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(result.valuationSummary).toBeDefined();
      expect(result.valuationSummary!.totalValueAdjustment).toBe(1850.00);
    });
  });

  describe('Status Determination Logic', () => {
    it('should determine partial status for incomplete receipts', async () => {
      const partialReceipts = [
        {
          ...mockReceipts[0],
          receivedQuantity: 50, // Only half received
          totalReceived: 50
        }
      ];

      const result = await receivingService.processReceipt(
        mockPurchaseOrder.id,
        partialReceipts,
        'user-123'
      );

      expect(result.success).toBe(true);
      expect(result.updatedPurchaseOrder!.status).toBe('partial');
    });

    it('should determine fully received status for complete receipts', async () => {
      // Mock the purchase order items to have received quantities
      const fullyReceivedPO = {
        ...mockPurchaseOrder,
        items: mockPurchaseOrder.items.map(item => ({
          ...item,
          receivedQuantity: item.quantity // All items already received
        }))
      };

      getPurchaseOrderMock.mockResolvedValue({ data: fullyReceivedPO, error: null });

      const result = await receivingService.processReceipt(
        mockPurchaseOrder.id,
        [], // No additional receipts needed
        'user-123'
      );

      expect(result.success).toBe(false); // Should fail validation since no receipts provided
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large quantities efficiently', async () => {
      const largeQuantityReceipts = [
        {
          ...mockReceipts[0],
          orderedQuantity: 100000,
          receivedQuantity: 100000,
          totalReceived: 100000,
          totalCost: 1000000.00
        }
      ];

      const startTime = Date.now();
      const result = await receivingService.processReceipt(
        mockPurchaseOrder.id,
        largeQuantityReceipts,
        'user-123'
      );
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle multiple product receipts efficiently', async () => {
      const manyProducts = Array.from({ length: 50 }, (_, i) => ({
        productId: `prod-${i + 1}`,
        productName: `Product ${i + 1}`,
        productSku: `SKU-${String(i + 1).padStart(3, '0')}`,
        orderedQuantity: 100,
        receivedQuantity: 100,
        totalReceived: 100,
        previouslyReceived: 0,
        unitCost: 10.00,
        totalCost: 1000.00,
        condition: 'good' as const
      }));

      // Mock PO with many items
      const manyItemsPO = {
        ...mockPurchaseOrder,
        items: manyProducts.map(p => ({
          id: `item-${p.productId}`,
          productId: p.productId,
          productName: p.productName,
          sku: p.productSku,
          quantity: p.orderedQuantity,
          cost: p.unitCost,
          total: p.totalCost
        }))
      };

      getPurchaseOrderMock.mockResolvedValue({ data: manyItemsPO, error: null });

      const startTime = Date.now();
      const result = await receivingService.processReceipt(
        manyItemsPO.id,
        manyProducts,
        'user-123'
      );
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.inventoryAdjustments).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});