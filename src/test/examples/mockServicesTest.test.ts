import { describe, it, expect, beforeEach } from 'vitest';
import { TestDataFactory, mockServices } from '../setup';

describe('Mock Services Test', () => {
  beforeEach(() => {
    mockServices.reset();
  });

  describe('Supabase Mock', () => {
    it('should handle basic database operations', async () => {
      const product = TestDataFactory.createProduct();
      
      // Test insert
      const insertResult = await mockServices.supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      
      expect(insertResult.error).toBeNull();
      expect(insertResult.data).toMatchObject(product);
      
      // Test select
      const selectResult = await mockServices.supabase
        .from('products')
        .select()
        .eq('id', product.id)
        .single();
      
      expect(selectResult.error).toBeNull();
      expect(selectResult.data.id).toBe(product.id);
    });

    it('should handle filtering operations', async () => {
      const products = [
        TestDataFactory.createProduct({ category: 'electronics', isActive: true }),
        TestDataFactory.createProduct({ category: 'clothing', isActive: true }),
        TestDataFactory.createProduct({ category: 'electronics', isActive: false })
      ];
      
      mockServices.supabase.setMockData('products', products);
      
      // Test filtering by category
      const electronicsResult = await mockServices.supabase
        .from('products')
        .select()
        .eq('category', 'electronics');
      
      expect(electronicsResult.data).toHaveLength(2);
      expect(electronicsResult.data.every(p => p.category === 'electronics')).toBe(true);
      
      // Test filtering by active status
      const activeResult = await mockServices.supabase
        .from('products')
        .select()
        .eq('isActive', true);
      
      expect(activeResult.data).toHaveLength(2);
      expect(activeResult.data.every(p => p.isActive === true)).toBe(true);
    });

    it('should simulate database errors', async () => {
      mockServices.supabase.setMockError(new Error('Database connection failed'));
      
      const result = await mockServices.supabase
        .from('products')
        .select();
      
      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe('Database connection failed');
      expect(result.data).toBeNull();
    });
  });

  describe('Payment Service Mock', () => {
    it('should process payments successfully', async () => {
      const result = await mockServices.payment.processPayment(1000, 'gcash');
      
      expect(result.success).toBe(true);
      expect(result.transactionId).toMatch(/^txn-\d+-[a-z0-9]{8}$/);
      expect(result.error).toBeUndefined();
    });

    it('should simulate payment failures', async () => {
      mockServices.payment.setFailure(true);
      
      const result = await mockServices.payment.processPayment(1000, 'gcash');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment processing failed');
      expect(result.transactionId).toBeUndefined();
    });

    it('should process refunds', async () => {
      const refundResult = await mockServices.payment.refundPayment('txn-123');
      
      expect(refundResult.success).toBe(true);
      expect(refundResult.refundId).toMatch(/^ref-\d+-[a-z0-9]{8}$/);
    });
  });

  describe('Notification Service Mock', () => {
    it('should send notifications', async () => {
      const result = await mockServices.notification.sendNotification(
        'low_stock',
        'admin@test.com',
        'Product X is low on stock'
      );
      
      expect(result.success).toBe(true);
      
      const notifications = mockServices.notification.getSentNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toMatchObject({
        type: 'low_stock',
        recipient: 'admin@test.com',
        message: 'Product X is low on stock',
        timestamp: expect.any(Date)
      });
    });

    it('should send bulk notifications', async () => {
      const notifications = [
        { type: 'alert', recipient: 'user1@test.com', message: 'Alert 1' },
        { type: 'alert', recipient: 'user2@test.com', message: 'Alert 2' }
      ];
      
      const result = await mockServices.notification.sendBulkNotifications(notifications);
      
      expect(result.success).toBe(true);
      
      const sentNotifications = mockServices.notification.getSentNotifications();
      expect(sentNotifications).toHaveLength(2);
    });
  });

  describe('Reporting Service Mock', () => {
    it('should generate reports', async () => {
      const result = await mockServices.reporting.generateReport('inventory_summary', {});
      
      expect(result.success).toBe(true);
      expect(result.reportId).toMatch(/^report-\d+-[a-z0-9]{8}$/);
      expect(result.data).toBeDefined();
      expect(result.data.totalProducts).toBeDefined();
    });

    it('should generate different report types', async () => {
      const inventoryReport = await mockServices.reporting.generateReport('inventory_summary', {});
      const salesReport = await mockServices.reporting.generateReport('sales_report', {});
      
      expect(inventoryReport.data.totalProducts).toBeDefined();
      expect(salesReport.data.totalSales).toBeDefined();
    });
  });
});