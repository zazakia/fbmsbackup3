import { describe, it, expect, vi, beforeEach } from 'vitest';
import { receivingDashboardService, ReceivingQueueUpdateResult } from '../../../services/receivingDashboardService';
import { supabase } from '../../../utils/supabase';
import { EnhancedPurchaseOrder, EnhancedPurchaseOrderStatus } from '../../../types/business';
import { ValidationResult } from '../../../services/receivingIntegrationService';

// Mock dependencies
vi.mock('../../../utils/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        })),
        in: vi.fn(() => ({
          order: vi.fn()
        })),
        order: vi.fn(),
        gte: vi.fn(() => ({
          order: vi.fn()
        })),
        lt: vi.fn(() => ({
          order: vi.fn()
        }))
      }))
    }))
  }
}));

vi.mock('../../../utils/statusMappings', () => ({
  getReceivableStatuses: vi.fn(),
  mapLegacyToEnhanced: vi.fn((status) => status)
}));

describe('Enhanced ReceivingDashboardService', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  const createMockPurchaseOrder = (overrides: Partial<any> = {}): any => ({
    id: 'po-123',
    po_number: 'PO-001',
    supplier_id: 'supplier-456',
    supplier_name: 'Test Supplier',
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        productName: 'Test Product',
        sku: 'TEST-001',
        quantity: 10,
        cost: 100
      }
    ],
    subtotal: 1000,
    tax: 120,
    total: 1120,
    enhanced_status: 'approved',
    expected_date: '2024-01-20',
    created_at: '2024-01-15T10:00:00Z',
    ...overrides
  });

  describe('onReceivingIntegrationEvent', () => {
    beforeEach(() => {
      // Mock getReceivingQueue to return empty array by default
      vi.spyOn(receivingDashboardService, 'getReceivingQueue').mockResolvedValue([]);
    });

    it('should handle approval event for new PO', async () => {
      const purchaseOrderId = 'po-123';
      const mockPO = createMockPurchaseOrder();

      // Mock database query
      const mockSupabaseChain = {
        select: vi.fn(() => mockSupabaseChain),
        eq: vi.fn(() => mockSupabaseChain),
        single: vi.fn(() => Promise.resolve({ data: mockPO, error: null }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain);

      const result: ReceivingQueueUpdateResult = await receivingDashboardService.onReceivingIntegrationEvent(
        'approval',
        purchaseOrderId,
        { approvedBy: 'user-123' }
      );

      expect(result.added).toHaveLength(1);
      expect(result.added[0].id).toBe(purchaseOrderId);
      expect(result.updated).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
      expect(result.totalAffected).toBe(1);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Processing receiving integration event: approval for PO po-123'
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Added approved PO po-123 to receiving queue'
      );
    });

    it('should handle approval event for existing PO', async () => {
      const purchaseOrderId = 'po-123';
      const mockPO = createMockPurchaseOrder();
      const existingPO = { id: purchaseOrderId } as EnhancedPurchaseOrder;

      // Mock getReceivingQueue to return existing PO
      vi.spyOn(receivingDashboardService, 'getReceivingQueue')
        .mockResolvedValue([existingPO]);

      const mockSupabaseChain = {
        select: vi.fn(() => mockSupabaseChain),
        eq: vi.fn(() => mockSupabaseChain),
        single: vi.fn(() => Promise.resolve({ data: mockPO, error: null }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain);

      const result = await receivingDashboardService.onReceivingIntegrationEvent(
        'approval',
        purchaseOrderId,
        { approvedBy: 'user-123' }
      );

      expect(result.added).toHaveLength(0);
      expect(result.updated).toHaveLength(1);
      expect(result.updated[0].id).toBe(purchaseOrderId);
      expect(result.removed).toHaveLength(0);
      expect(result.totalAffected).toBe(1);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Updated approved PO po-123 in receiving queue'
      );
    });

    it('should handle status change event - add to queue', async () => {
      const purchaseOrderId = 'po-123';
      const mockPO = createMockPurchaseOrder({ enhanced_status: 'sent_to_supplier' });

      const mockSupabaseChain = {
        select: vi.fn(() => mockSupabaseChain),
        eq: vi.fn(() => mockSupabaseChain),
        single: vi.fn(() => Promise.resolve({ data: mockPO, error: null }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain);

      const result = await receivingDashboardService.onReceivingIntegrationEvent(
        'status_change',
        purchaseOrderId,
        { previousStatus: 'draft', newStatus: 'sent_to_supplier' }
      );

      expect(result.added).toHaveLength(1);
      expect(result.totalAffected).toBe(1);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Added PO po-123 to receiving queue due to status change'
      );
    });

    it('should handle status change event - remove from queue', async () => {
      const purchaseOrderId = 'po-123';
      const mockPO = createMockPurchaseOrder({ enhanced_status: 'fully_received' });
      const existingPO = { id: purchaseOrderId } as EnhancedPurchaseOrder;

      // Mock getReceivingQueue to return existing PO
      vi.spyOn(receivingDashboardService, 'getReceivingQueue')
        .mockResolvedValue([existingPO]);

      const mockSupabaseChain = {
        select: vi.fn(() => mockSupabaseChain),
        eq: vi.fn(() => mockSupabaseChain),
        single: vi.fn(() => Promise.resolve({ data: mockPO, error: null }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain);

      const result = await receivingDashboardService.onReceivingIntegrationEvent(
        'status_change',
        purchaseOrderId,
        { previousStatus: 'sent_to_supplier', newStatus: 'fully_received' }
      );

      expect(result.added).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
      expect(result.removed).toHaveLength(1);
      expect(result.removed[0]).toBe(purchaseOrderId);
      expect(result.totalAffected).toBe(1);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Removed PO po-123 from receiving queue due to status change'
      );
    });

    it('should handle cancellation event', async () => {
      const purchaseOrderId = 'po-123';
      const existingPO = { id: purchaseOrderId } as EnhancedPurchaseOrder;

      // Mock getReceivingQueue to return existing PO
      vi.spyOn(receivingDashboardService, 'getReceivingQueue')
        .mockResolvedValue([existingPO]);

      const mockSupabaseChain = {
        select: vi.fn(() => mockSupabaseChain),
        eq: vi.fn(() => mockSupabaseChain),
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain);

      const result = await receivingDashboardService.onReceivingIntegrationEvent(
        'cancellation',
        purchaseOrderId,
        { reason: 'Order cancelled' }
      );

      expect(result.removed).toHaveLength(1);
      expect(result.removed[0]).toBe(purchaseOrderId);
      expect(result.totalAffected).toBe(1);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Removed cancelled PO po-123 from receiving queue'
      );
    });

    it('should handle database errors gracefully', async () => {
      const purchaseOrderId = 'po-123';

      const mockSupabaseChain = {
        select: vi.fn(() => mockSupabaseChain),
        eq: vi.fn(() => mockSupabaseChain),
        single: vi.fn(() => Promise.resolve({ 
          data: null, 
          error: { message: 'Database connection failed' } 
        }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain);

      await expect(
        receivingDashboardService.onReceivingIntegrationEvent(
          'approval',
          purchaseOrderId,
          {}
        )
      ).rejects.toThrow();

      expect(console.error).toHaveBeenCalledWith(
        'Error fetching PO for integration event:',
        expect.objectContaining({ message: 'Database connection failed' })
      );
    });

    it('should handle missing purchase order', async () => {
      const purchaseOrderId = 'po-nonexistent';

      const mockSupabaseChain = {
        select: vi.fn(() => mockSupabaseChain),
        eq: vi.fn(() => mockSupabaseChain),
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      };
      vi.mocked(supabase.from).mockReturnValue(mockSupabaseChain);

      const result = await receivingDashboardService.onReceivingIntegrationEvent(
        'approval',
        purchaseOrderId,
        {}
      );

      expect(result.totalAffected).toBe(0);
      expect(console.warn).toHaveBeenCalledWith(
        'Purchase order po-nonexistent not found for integration event'
      );
    });
  });

  describe('validatePurchaseOrderForReceiving', () => {
    const createValidPO = (): EnhancedPurchaseOrder => ({
      id: 'po-123',
      poNumber: 'PO-001',
      supplierId: 'supplier-456',
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
      status: 'approved' as EnhancedPurchaseOrderStatus,
      expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      
      // Enhanced fields
      statusHistory: [],
      receivingHistory: [],
      validationErrors: [],
      approvalHistory: [],
      totalReceived: 0,
      totalPending: 10,
      isPartiallyReceived: false,
      isFullyReceived: false
    });

    it('should validate a complete purchase order successfully', () => {
      const purchaseOrder = createValidPO();

      const result: ValidationResult = receivingDashboardService.validatePurchaseOrderForReceiving(purchaseOrder);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect missing supplier information', () => {
      const purchaseOrder = createValidPO();
      purchaseOrder.supplierId = '';
      purchaseOrder.supplierName = '';

      const result = receivingDashboardService.validatePurchaseOrderForReceiving(purchaseOrder);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Supplier information is missing');
    });

    it('should detect missing items', () => {
      const purchaseOrder = createValidPO();
      purchaseOrder.items = [];

      const result = receivingDashboardService.validatePurchaseOrderForReceiving(purchaseOrder);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Purchase order has no items');
    });

    it('should detect invalid total', () => {
      const purchaseOrder = createValidPO();
      purchaseOrder.total = 0;

      const result = receivingDashboardService.validatePurchaseOrderForReceiving(purchaseOrder);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Purchase order total is invalid');
    });

    it('should detect non-receivable status', () => {
      const purchaseOrder = createValidPO();
      purchaseOrder.status = 'draft' as EnhancedPurchaseOrderStatus;

      const result = receivingDashboardService.validatePurchaseOrderForReceiving(purchaseOrder);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Purchase order status 'draft' is not receivable");
    });

    it('should detect invalid item quantities and costs', () => {
      const purchaseOrder = createValidPO();
      purchaseOrder.items = [
        {
          id: 'item-1',
          productId: 'prod-1',
          productName: 'Test Product',
          sku: 'TEST-001',
          quantity: 0, // Invalid quantity
          cost: -10, // Invalid cost
          total: 0
        },
        {
          id: 'item-2',
          productId: 'prod-2',
          productName: 'Test Product 2',
          sku: 'TEST-002',
          quantity: 5,
          cost: 0, // Invalid cost
          total: 0
        }
      ];

      const result = receivingDashboardService.validatePurchaseOrderForReceiving(purchaseOrder);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Item 1 has invalid quantity');
      expect(result.errors).toContain('Item 1 has invalid cost');
      expect(result.errors).toContain('Item 2 has invalid cost');
    });

    it('should generate appropriate warnings', () => {
      const purchaseOrder = createValidPO();
      purchaseOrder.poNumber = ''; // Missing PO number
      purchaseOrder.expectedDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Past date

      const result = receivingDashboardService.validatePurchaseOrderForReceiving(purchaseOrder);

      expect(result.isValid).toBe(true); // Still valid despite warnings
      expect(result.warnings).toContain('Purchase order number not set');
      expect(result.warnings).toContain('Expected delivery date is in the past');
    });

    it('should handle missing expected date', () => {
      const purchaseOrder = createValidPO();
      delete (purchaseOrder as any).expectedDate;

      const result = receivingDashboardService.validatePurchaseOrderForReceiving(purchaseOrder);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('No expected delivery date set');
    });
  });

  describe('transformToEnhancedPO', () => {
    it('should transform database record correctly', () => {
      const dbRecord = createMockPurchaseOrder({
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Test Product',
            sku: 'TEST-001',
            quantity: 10,
            cost: 100,
            receivedQuantity: 5
          }
        ]
      });

      // Access private method for testing
      const transformMethod = (receivingDashboardService as any).transformToEnhancedPO;
      const result: EnhancedPurchaseOrder = transformMethod.call(receivingDashboardService, dbRecord);

      expect(result.id).toBe('po-123');
      expect(result.poNumber).toBe('PO-001');
      expect(result.supplierName).toBe('Test Supplier');
      expect(result.status).toBe('approved');
      expect(result.totalReceived).toBe(5);
      expect(result.totalPending).toBe(5);
      expect(result.isPartiallyReceived).toBe(true);
      expect(result.isFullyReceived).toBe(false);
    });

    it('should handle missing or malformed data gracefully', () => {
      const dbRecord = {
        id: 'po-123',
        items: null, // Malformed items
        enhanced_status: null, // Missing status
        created_at: '2024-01-15T10:00:00Z'
      };

      const transformMethod = (receivingDashboardService as any).transformToEnhancedPO;
      const result = transformMethod.call(receivingDashboardService, dbRecord);

      expect(result.id).toBe('po-123');
      expect(result.poNumber).toBe('PO-12345678'); // Generated from ID
      expect(result.supplierName).toBe('Unknown Supplier');
      expect(result.items).toEqual([]);
      expect(result.totalReceived).toBe(0);
      expect(result.totalPending).toBe(0);
    });
  });

  describe('isReceivableStatus', () => {
    it('should correctly identify receivable statuses', () => {
      const isReceivableMethod = (receivingDashboardService as any).isReceivableStatus;

      expect(isReceivableMethod.call(receivingDashboardService, 'approved')).toBe(true);
      expect(isReceivableMethod.call(receivingDashboardService, 'sent_to_supplier')).toBe(true);
      expect(isReceivableMethod.call(receivingDashboardService, 'partially_received')).toBe(true);
    });

    it('should correctly identify non-receivable statuses', () => {
      const isReceivableMethod = (receivingDashboardService as any).isReceivableStatus;

      expect(isReceivableMethod.call(receivingDashboardService, 'draft')).toBe(false);
      expect(isReceivableMethod.call(receivingDashboardService, 'pending_approval')).toBe(false);
      expect(isReceivableMethod.call(receivingDashboardService, 'fully_received')).toBe(false);
      expect(isReceivableMethod.call(receivingDashboardService, 'cancelled')).toBe(false);
      expect(isReceivableMethod.call(receivingDashboardService, 'closed')).toBe(false);
    });
  });
});