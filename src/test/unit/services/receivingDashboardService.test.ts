import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { receivingDashboardService } from '../../../services/receivingDashboardService';
import { supabase } from '../../../utils/supabase';

// Mock Supabase
vi.mock('../../../utils/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis()
    }))
  }
}));

describe('ReceivingDashboardService', () => {
  const mockSupabaseResponse = (data: any, error: any = null) => {
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue(Promise.resolve({ data, error }))
    };
    
    (supabase.from as any).mockReturnValue(mockChain);
    return mockChain;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getReceivingQueue', () => {
    const mockOrders = [
      {
        id: '1',
        po_number: 'PO-001',
        supplier_id: 'S1',
        supplier_name: 'Test Supplier',
        status: 'approved',
        total: 1000,
        subtotal: 850,
        tax: 150,
        expected_date: '2024-01-15T10:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
        created_by: 'user1',
        items: [
          {
            id: 'item1',
            product_id: 'p1',
            product_name: 'Test Product',
            sku: 'TEST-001',
            quantity: 10,
            cost: 85,
            received_quantity: 0
          }
        ]
      }
    ];

    it('should fetch and transform receiving queue successfully', async () => {
      mockSupabaseResponse(mockOrders);
      
      const result = await receivingDashboardService.getReceivingQueue();
      
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0]).toMatchObject({
        id: '1',
        poNumber: 'PO-001',
        supplierName: 'Test Supplier',
        status: 'approved',
        total: 1000,
        isPartiallyReceived: false,
        isFullyReceived: false,
        totalReceived: 0,
        totalPending: 10
      });
    });

    it('should handle empty results', async () => {
      mockSupabaseResponse([]);
      
      const result = await receivingDashboardService.getReceivingQueue();
      
      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });

    it('should handle null response', async () => {
      mockSupabaseResponse(null);
      
      const result = await receivingDashboardService.getReceivingQueue();
      
      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      const mockError = new Error('Database connection failed');
      mockSupabaseResponse(null, mockError);
      
      const result = await receivingDashboardService.getReceivingQueue();
      
      expect(result).toBeDefined();
      expect(result.length).toBe(0);
      expect(console.error).toHaveBeenCalledWith('Error fetching receiving queue:', mockError);
    });

    it('should correctly calculate partially received orders', async () => {
      const partialOrder = {
        ...mockOrders[0],
        items: [
          {
            id: 'item1',
            product_id: 'p1',
            product_name: 'Test Product',
            sku: 'TEST-001',
            quantity: 10,
            cost: 85,
            received_quantity: 5
          }
        ]
      };
      
      mockSupabaseResponse([partialOrder]);
      
      const result = await receivingDashboardService.getReceivingQueue();
      
      expect(result[0].totalReceived).toBe(5);
      expect(result[0].totalPending).toBe(5);
      expect(result[0].isPartiallyReceived).toBe(true);
      expect(result[0].isFullyReceived).toBe(false);
    });

    it('should correctly calculate fully received orders', async () => {
      const fullyReceivedOrder = {
        ...mockOrders[0],
        items: [
          {
            id: 'item1',
            product_id: 'p1',
            product_name: 'Test Product',
            sku: 'TEST-001',
            quantity: 10,
            cost: 85,
            received_quantity: 10
          }
        ]
      };
      
      mockSupabaseResponse([fullyReceivedOrder]);
      
      const result = await receivingDashboardService.getReceivingQueue();
      
      expect(result[0].totalReceived).toBe(10);
      expect(result[0].totalPending).toBe(0);
      expect(result[0].isPartiallyReceived).toBe(false);
      expect(result[0].isFullyReceived).toBe(true);
    });

    it('should map legacy statuses correctly', async () => {
      const statusTestOrders = [
        { ...mockOrders[0], status: 'draft' },
        { ...mockOrders[0], id: '2', status: 'sent' },
        { ...mockOrders[0], id: '3', status: 'partial' },
        { ...mockOrders[0], id: '4', status: 'received' }
      ];
      
      mockSupabaseResponse(statusTestOrders);
      
      const result = await receivingDashboardService.getReceivingQueue();
      
      expect(result[0].status).toBe('draft');
      expect(result[1].status).toBe('sent_to_supplier');
      expect(result[2].status).toBe('partially_received');
      expect(result[3].status).toBe('fully_received');
    });
  });

  describe('getReceivingMetrics', () => {
    const mockRecentOrders = [
      {
        id: '1',
        status: 'received',
        total: 1000,
        expected_date: '2024-01-10T10:00:00Z',
        received_date: '2024-01-09T10:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
        total_items: 25
      },
      {
        id: '2',
        status: 'partial',
        total: 1500,
        expected_date: '2024-01-12T10:00:00Z',
        received_date: '2024-01-11T10:00:00Z',
        created_at: '2024-01-02T10:00:00Z',
        total_items: 30
      }
    ];

    beforeEach(() => {
      // Mock Date.now for consistent testing
      vi.spyOn(Date, 'now').mockImplementation(() => new Date('2024-01-15T10:00:00Z').getTime());
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should calculate metrics successfully', async () => {
      // Mock the sequential calls for recent and previous periods
      const mockChain1 = mockSupabaseResponse(mockRecentOrders);
      const mockChain2 = mockSupabaseResponse([]);
      
      (supabase.from as any)
        .mockReturnValueOnce(mockChain1)
        .mockReturnValueOnce(mockChain2);
      
      const result = await receivingDashboardService.getReceivingMetrics();
      
      expect(result).toBeDefined();
      expect(result.totalOrdersReceived).toBe(2);
      expect(result.totalValueReceived).toBe(2500);
      expect(result.onTimeDeliveryRate).toBe(100); // Both orders were on time
      expect(result.dailyReceivingTrend).toHaveLength(30);
    });

    it('should handle on-time delivery rate calculation', async () => {
      const mixedOrders = [
        {
          ...mockRecentOrders[0],
          expected_date: '2024-01-10T10:00:00Z',
          received_date: '2024-01-09T10:00:00Z' // On time
        },
        {
          ...mockRecentOrders[1],
          expected_date: '2024-01-10T10:00:00Z',
          received_date: '2024-01-12T10:00:00Z' // Late
        }
      ];
      
      const mockChain1 = mockSupabaseResponse(mixedOrders);
      const mockChain2 = mockSupabaseResponse([]);
      
      (supabase.from as any)
        .mockReturnValueOnce(mockChain1)
        .mockReturnValueOnce(mockChain2);
      
      const result = await receivingDashboardService.getReceivingMetrics();
      
      expect(result.onTimeDeliveryRate).toBe(50); // 1 out of 2 orders on time
    });

    it('should return default metrics on error', async () => {
      const mockError = new Error('Database error');
      const mockChain = mockSupabaseResponse(null, mockError);
      (supabase.from as any).mockReturnValue(mockChain);
      
      const result = await receivingDashboardService.getReceivingMetrics();
      
      expect(result).toBeDefined();
      expect(result.totalOrdersReceived).toBe(0);
      expect(result.totalValueReceived).toBe(0);
      expect(result.onTimeDeliveryRate).toBe(0);
      expect(console.error).toHaveBeenCalledWith('Error in getReceivingMetrics:', mockError);
    });

    it('should generate daily trend data correctly', async () => {
      const mockChain1 = mockSupabaseResponse(mockRecentOrders);
      const mockChain2 = mockSupabaseResponse([]);
      
      (supabase.from as any)
        .mockReturnValueOnce(mockChain1)
        .mockReturnValueOnce(mockChain2);
      
      const result = await receivingDashboardService.getReceivingMetrics();
      
      expect(result.dailyReceivingTrend).toHaveLength(30);
      expect(result.dailyReceivingTrend[0]).toMatchObject({
        date: expect.any(String),
        orders: expect.any(Number),
        items: expect.any(Number),
        value: expect.any(Number)
      });
    });

    it('should include mock supplier and issue data', async () => {
      const mockChain1 = mockSupabaseResponse(mockRecentOrders);
      const mockChain2 = mockSupabaseResponse([]);
      
      (supabase.from as any)
        .mockReturnValueOnce(mockChain1)
        .mockReturnValueOnce(mockChain2);
      
      const result = await receivingDashboardService.getReceivingMetrics();
      
      expect(result.topSuppliers).toHaveLength(3);
      expect(result.topSuppliers[0]).toMatchObject({
        name: 'ABC Trading Corp',
        ordersReceived: 28,
        onTimeRate: 92.8,
        qualityScore: 96.5
      });
      
      expect(result.recentIssues).toHaveLength(2);
    });
  });

  describe('getOverdueAlerts', () => {
    beforeEach(() => {
      // Mock current date for consistent testing
      vi.spyOn(Date, 'now').mockImplementation(() => new Date('2024-01-15T10:00:00Z').getTime());
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    const mockOverdueOrders = [
      {
        id: '1',
        po_number: 'PO-001',
        supplier_name: 'Test Supplier 1',
        status: 'sent',
        total: 1000,
        expected_date: '2024-01-10T10:00:00Z', // 5 days overdue
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z'
      },
      {
        id: '2',
        po_number: 'PO-002',
        supplier_name: 'Test Supplier 2',
        status: 'approved',
        total: 150000, // High value
        expected_date: '2024-01-14T10:00:00Z', // 1 day overdue
        created_at: '2024-01-02T10:00:00Z',
        updated_at: '2024-01-02T10:00:00Z'
      }
    ];

    it('should generate overdue alerts correctly', async () => {
      mockSupabaseResponse(mockOverdueOrders);
      
      const result = await receivingDashboardService.getOverdueAlerts();
      
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      
      expect(result[0]).toMatchObject({
        orderId: '1',
        orderNumber: 'PO-001',
        supplierName: 'Test Supplier 1',
        daysOverdue: 5,
        severity: 'high' // More than 3 days overdue
      });
      
      expect(result[1]).toMatchObject({
        orderId: '2',
        orderNumber: 'PO-002',
        supplierName: 'Test Supplier 2',
        daysOverdue: 1,
        severity: 'critical' // High value order
      });
    });

    it('should calculate severity levels correctly', async () => {
      const testOrders = [
        {
          ...mockOverdueOrders[0],
          id: '1',
          total: 10000,
          expected_date: '2024-01-14T10:00:00Z' // 1 day overdue, medium value
        },
        {
          ...mockOverdueOrders[0],
          id: '2',
          total: 200000,
          expected_date: '2024-01-14T10:00:00Z' // 1 day overdue, high value
        },
        {
          ...mockOverdueOrders[0],
          id: '3',
          total: 30000,
          expected_date: '2024-01-11T10:00:00Z' // 4 days overdue, medium value
        },
        {
          ...mockOverdueOrders[0],
          id: '4',
          total: 50000,
          expected_date: '2024-01-07T10:00:00Z' // 8 days overdue
        }
      ];
      
      mockSupabaseResponse(testOrders);
      
      const result = await receivingDashboardService.getOverdueAlerts();
      
      expect(result[0].severity).toBe('medium'); // 1 day, medium value
      expect(result[1].severity).toBe('critical'); // 1 day, high value
      expect(result[2].severity).toBe('high'); // 4 days overdue
      expect(result[3].severity).toBe('critical'); // 8 days overdue
    });

    it('should sort alerts by severity and days overdue', async () => {
      const testOrders = [
        {
          ...mockOverdueOrders[0],
          id: '1',
          total: 10000,
          expected_date: '2024-01-12T10:00:00Z' // 3 days overdue, medium severity
        },
        {
          ...mockOverdueOrders[0],
          id: '2',
          total: 200000,
          expected_date: '2024-01-13T10:00:00Z' // 2 days overdue, critical severity (high value)
        },
        {
          ...mockOverdueOrders[0],
          id: '3',
          total: 30000,
          expected_date: '2024-01-10T10:00:00Z' // 5 days overdue, high severity
        }
      ];
      
      mockSupabaseResponse(testOrders);
      
      const result = await receivingDashboardService.getOverdueAlerts();
      
      // Should be sorted: critical first, then high, then medium
      // Within same severity, more overdue first
      expect(result[0].severity).toBe('critical');
      expect(result[1].severity).toBe('high');
      expect(result[2].severity).toBe('medium');
    });

    it('should filter out non-overdue orders', async () => {
      const mixedOrders = [
        ...mockOverdueOrders,
        {
          ...mockOverdueOrders[0],
          id: '3',
          expected_date: '2024-01-20T10:00:00Z' // Future date, not overdue
        },
        {
          ...mockOverdueOrders[0],
          id: '4',
          expected_date: null // No expected date
        }
      ];
      
      mockSupabaseResponse(mixedOrders);
      
      const result = await receivingDashboardService.getOverdueAlerts();
      
      expect(result.length).toBe(2); // Only the overdue ones
    });

    it('should handle empty results', async () => {
      mockSupabaseResponse([]);
      
      const result = await receivingDashboardService.getOverdueAlerts();
      
      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      const mockError = new Error('Database error');
      mockSupabaseResponse(null, mockError);
      
      const result = await receivingDashboardService.getOverdueAlerts();
      
      expect(result).toBeDefined();
      expect(result.length).toBe(0);
      expect(console.error).toHaveBeenCalledWith('Error fetching orders for alerts:', mockError);
    });

    it('should generate correct alert properties', async () => {
      mockSupabaseResponse([mockOverdueOrders[0]]);
      
      const result = await receivingDashboardService.getOverdueAlerts();
      
      expect(result[0]).toMatchObject({
        id: 'alert-1',
        type: 'overdue_delivery',
        orderId: '1',
        orderNumber: 'PO-001',
        supplierName: 'Test Supplier 1',
        title: 'Purchase Order PO-001 is overdue',
        description: 'Expected delivery was 5 days ago. Supplier: Test Supplier 1',
        daysOverdue: 5,
        orderValue: 1000,
        actionRequired: 'Contact supplier for updated delivery schedule',
        isAcknowledged: false
      });
    });
  });
});