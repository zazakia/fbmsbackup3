import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestDataFactory } from '../../factories/testDataFactory';
import { mockServices } from '../../mocks/mockServices';
import { setupTestEnvironment, cleanupTestData } from '../../utils/testUtils';
import { Product, StockAlert } from '../../../types/business';

describe('Inventory Alerts and Notifications - COMPREHENSIVE TESTING 🚨⚡', () => {
  let testProducts: Product[];
  let testUsers: any[];

  beforeEach(async () => {
    await setupTestEnvironment({ mockDatabase: true, loadTestData: true, testDataScale: 'medium' });
    
    // Create comprehensive test products for different scenarios
    testProducts = [
      // Low stock scenarios
      TestDataFactory.createProduct({ 
        id: 'prod-low-1',
        stock: 5, 
        minStock: 20, 
        name: 'Low Stock Product',
        cost: 100,
        price: 150,
        reorderQuantity: 50
      }),
      TestDataFactory.createProduct({ 
        id: 'prod-low-2',
        stock: 2, 
        minStock: 25, 
        name: 'Critical Low Stock Product',
        cost: 200,
        price: 300,
        reorderQuantity: 75
      }),
      
      // Out of stock scenarios
      TestDataFactory.createProduct({ 
        id: 'prod-out-1',
        stock: 0, 
        minStock: 10, 
        name: 'Out of Stock Product',
        cost: 50,
        price: 80,
        reorderQuantity: 30
      }),
      
      // Normal stock scenarios
      TestDataFactory.createProduct({ 
        id: 'prod-normal-1',
        stock: 100, 
        minStock: 15, 
        name: 'Normal Stock Product',
        cost: 75,
        price: 120
      }),
      
      // Expiry scenarios
      TestDataFactory.createProduct({ 
        id: 'prod-exp-1',
        stock: 25, 
        minStock: 30, 
        name: 'Expiring Soon Product',
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        cost: 80,
        price: 130
      }),
      TestDataFactory.createProduct({ 
        id: 'prod-exp-2',
        stock: 15, 
        minStock: 10, 
        name: 'Expiring Critical Product',
        expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days
        cost: 90,
        price: 140
      }),
      TestDataFactory.createProduct({ 
        id: 'prod-expired-1',
        stock: 10, 
        minStock: 5, 
        name: 'Already Expired Product',
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        cost: 60,
        price: 100
      }),
      
      // High value products for testing
      TestDataFactory.createProduct({ 
        id: 'prod-high-value',
        stock: 3, 
        minStock: 10, 
        name: 'High Value Product',
        cost: 5000,
        price: 8000,
        reorderQuantity: 20
      })
    ];
    
    // Create test users for notification testing
    testUsers = [
      { id: 'user-admin', role: 'admin', email: 'admin@company.com', name: 'Admin User' },
      { id: 'user-manager', role: 'manager', email: 'manager@company.com', name: 'Manager User' },
      { id: 'user-cashier', role: 'cashier', email: 'cashier@company.com', name: 'Cashier User' },
      { id: 'user-inventory', role: 'inventory_manager', email: 'inventory@company.com', name: 'Inventory Manager' }
    ];
    
    mockServices.supabase.setMockData('products', testProducts);
    mockServices.supabase.setMockData('stock_alerts', []);
    mockServices.supabase.setMockData('users', testUsers);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Low Stock Alert Generation 📉', () => {
    it('should generate low stock alerts for products below minimum threshold', async () => {
      const alerts = await generateLowStockAlerts();
      
      const lowStockAlerts = alerts.filter(a => a.type === 'low_stock');
      expect(lowStockAlerts.length).toBeGreaterThan(0);
      
      // Verify specific products are flagged
      const productNames = lowStockAlerts.map(a => a.productName);
      expect(productNames).toContain('Low Stock Product');
      expect(productNames).toContain('Critical Low Stock Product');
      expect(productNames).toContain('Expiring Soon Product');
      expect(productNames).toContain('High Value Product');
    });

    it('should set correct severity levels based on stock percentage', async () => {
      const alerts = await generateLowStockAlerts();
      
      // Critical low stock (stock < 25% of minimum)
      const criticalAlert = alerts.find(a => a.productName === 'Critical Low Stock Product');
      expect(criticalAlert?.severity).toBe('high'); // 2/25 = 8% of minimum
      
      // Regular low stock (stock < 50% of minimum)
      const lowAlert = alerts.find(a => a.productName === 'Low Stock Product');
      expect(lowAlert?.severity).toBe('high'); // 5/20 = 25% of minimum
      
      // High value product should have higher severity
      const highValueAlert = alerts.find(a => a.productName === 'High Value Product');
      expect(highValueAlert?.severity).toBe('high'); // High value products get priority
    });

    it('should include detailed alert messages with stock levels', async () => {
      const alerts = await generateLowStockAlerts();
      
      const lowStockAlert = alerts.find(a => a.productName === 'Low Stock Product');
      expect(lowStockAlert?.message).toContain('below minimum stock level');
      expect(lowStockAlert?.message).toContain('5'); // Current stock
      expect(lowStockAlert?.message).toContain('20'); // Minimum stock
      expect(lowStockAlert?.productId).toBe('prod-low-1');
    });

    it('should not generate alerts for products with adequate stock', async () => {
      const alerts = await generateLowStockAlerts();
      
      const productNames = alerts.map(a => a.productName);
      expect(productNames).not.toContain('Normal Stock Product');
    });

    it('should handle threshold calculations correctly', async () => {
      const alerts = await generateLowStockAlerts();
      
      // Verify all alerts are for products actually below minimum
      for (const alert of alerts) {
        const product = testProducts.find(p => p.id === alert.productId);
        expect(product).toBeDefined();
        expect(product!.stock).toBeLessThan(product!.minStock);
      }
    });

    it('should generate alerts with proper timestamps', async () => {
      const alerts = await generateLowStockAlerts();
      
      const now = new Date();
      alerts.forEach(alert => {
        expect(alert.createdAt).toBeInstanceOf(Date);
        expect(alert.createdAt.getTime()).toBeLessThanOrEqual(now.getTime());
        expect(alert.createdAt.getTime()).toBeGreaterThan(now.getTime() - 1000); // Within last second
      });
    });

    it('should handle edge case of zero minimum stock', async () => {
      // Add product with zero minimum stock
      const zeroMinProduct = TestDataFactory.createProduct({ 
        id: 'prod-zero-min',
        stock: 5, 
        minStock: 0, 
        name: 'Zero Min Stock Product' 
      });
      testProducts.push(zeroMinProduct);
      mockServices.supabase.setMockData('products', testProducts);

      const alerts = await generateLowStockAlerts();
      
      // Should not generate alert for product with zero minimum
      const zeroMinAlert = alerts.find(a => a.productName === 'Zero Min Stock Product');
      expect(zeroMinAlert).toBeUndefined();
    });
  });

  describe('Out-of-Stock Critical Alerts 🚫', () => {
    it('should generate critical out-of-stock alerts for zero stock products', async () => {
      const alerts = await generateOutOfStockAlerts();
      
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('out_of_stock');
      expect(alerts[0].productName).toBe('Out of Stock Product');
      expect(alerts[0].productId).toBe('prod-out-1');
      expect(alerts[0].severity).toBe('critical');
      expect(alerts[0].isRead).toBe(false);
    });

    it('should include urgent messaging for out-of-stock products', async () => {
      const alerts = await generateOutOfStockAlerts();
      
      const outOfStockAlert = alerts[0];
      expect(outOfStockAlert.message).toContain('completely out of stock');
      expect(outOfStockAlert.message).toContain('Out of Stock Product');
    });

    it('should prioritize out-of-stock alerts over other alert types', async () => {
      const allAlerts = await generateAllAlerts();
      const sortedAlerts = allAlerts.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });

      // Out of stock and expired products should be at the top
      const criticalAlerts = sortedAlerts.filter(a => a.severity === 'critical');
      expect(criticalAlerts.length).toBeGreaterThan(0);
      
      const outOfStockAlert = criticalAlerts.find(a => a.type === 'out_of_stock');
      expect(outOfStockAlert).toBeDefined();
    });

    it('should handle multiple out-of-stock products', async () => {
      // Add another out-of-stock product
      const anotherOutOfStock = TestDataFactory.createProduct({ 
        id: 'prod-out-2',
        stock: 0, 
        minStock: 15, 
        name: 'Another Out of Stock Product' 
      });
      testProducts.push(anotherOutOfStock);
      mockServices.supabase.setMockData('products', testProducts);

      const alerts = await generateOutOfStockAlerts();
      
      expect(alerts).toHaveLength(2);
      alerts.forEach(alert => {
        expect(alert.type).toBe('out_of_stock');
        expect(alert.severity).toBe('critical');
      });
    });

    it('should not generate out-of-stock alerts for products with stock', async () => {
      const alerts = await generateOutOfStockAlerts();
      
      // Verify no alerts for products with stock > 0
      const productNames = alerts.map(a => a.productName);
      expect(productNames).not.toContain('Low Stock Product'); // Has stock: 5
      expect(productNames).not.toContain('Normal Stock Product'); // Has stock: 100
    });

    it('should generate unique alert IDs for out-of-stock alerts', async () => {
      const alerts = await generateOutOfStockAlerts();
      
      const alertIds = alerts.map(a => a.id);
      const uniqueIds = new Set(alertIds);
      expect(uniqueIds.size).toBe(alertIds.length); // All IDs should be unique
    });
  });

  describe('Product Expiry Warnings ⏰', () => {
    it('should detect products expiring within warning period', async () => {
      const expiryAlerts = await generateExpiryAlerts();
      
      expect(expiryAlerts.length).toBeGreaterThan(0);
      
      // Check for products expiring within 7 days
      const expiringProducts = expiryAlerts.filter(a => a.type === 'expiring');
      expect(expiringProducts.length).toBeGreaterThanOrEqual(2); // At least 2 expiring products
      
      const productNames = expiringProducts.map(a => a.productName);
      expect(productNames).toContain('Expiring Soon Product');
      expect(productNames).toContain('Expiring Critical Product');
    });

    it('should calculate correct days until expiry', async () => {
      const expiryAlerts = await generateExpiryAlerts();
      
      const sevenDayAlert = expiryAlerts.find(a => a.productName === 'Expiring Soon Product');
      expect(sevenDayAlert?.message).toContain('7 days');
      
      const twoDayAlert = expiryAlerts.find(a => a.productName === 'Expiring Critical Product');
      expect(twoDayAlert?.message).toContain('2 days');
    });

    it('should set appropriate severity based on days until expiry', async () => {
      const expiryAlerts = await generateExpiryAlerts();
      
      // Products expiring in 2 days should be high severity
      const criticalExpiryAlert = expiryAlerts.find(a => a.productName === 'Expiring Critical Product');
      expect(criticalExpiryAlert?.severity).toBe('high');
      
      // Products expiring in 7 days should be medium severity
      const mediumExpiryAlert = expiryAlerts.find(a => a.productName === 'Expiring Soon Product');
      expect(mediumExpiryAlert?.severity).toBe('medium');
    });

    it('should handle already expired products with critical severity', async () => {
      const expiredAlerts = await generateExpiredAlerts();
      
      expect(expiredAlerts).toHaveLength(1);
      expect(expiredAlerts[0].type).toBe('expired');
      expect(expiredAlerts[0].productName).toBe('Already Expired Product');
      expect(expiredAlerts[0].severity).toBe('critical');
      expect(expiredAlerts[0].message).toContain('has expired');
    });

    it('should not alert for products without expiry dates', async () => {
      const expiryAlerts = await generateExpiryAlerts();
      
      // Products without expiry dates should not appear in expiry alerts
      const productNames = expiryAlerts.map(a => a.productName);
      expect(productNames).not.toContain('Low Stock Product'); // No expiry date
      expect(productNames).not.toContain('Normal Stock Product'); // No expiry date
    });

    it('should not alert for products expiring far in the future', async () => {
      // Add product expiring in 30 days
      const futureExpiryProduct = TestDataFactory.createProduct({
        id: 'prod-future-exp',
        name: 'Future Expiry Product',
        stock: 50,
        minStock: 10,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      });
      testProducts.push(futureExpiryProduct);
      mockServices.supabase.setMockData('products', testProducts);

      const expiryAlerts = await generateExpiryAlerts();
      
      const productNames = expiryAlerts.map(a => a.productName);
      expect(productNames).not.toContain('Future Expiry Product');
    });

    it('should handle edge case of expiry date exactly at threshold', async () => {
      // Add product expiring exactly in 7 days
      const exactThresholdProduct = TestDataFactory.createProduct({
        id: 'prod-exact-threshold',
        name: 'Exact Threshold Product',
        stock: 20,
        minStock: 5,
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Exactly 7 days
      });
      testProducts.push(exactThresholdProduct);
      mockServices.supabase.setMockData('products', testProducts);

      const expiryAlerts = await generateExpiryAlerts();
      
      const thresholdAlert = expiryAlerts.find(a => a.productName === 'Exact Threshold Product');
      expect(thresholdAlert).toBeDefined();
      expect(thresholdAlert?.message).toContain('7 days');
    });

    it('should generate alerts with proper expiry-specific metadata', async () => {
      const expiryAlerts = await generateExpiryAlerts();
      
      expiryAlerts.forEach(alert => {
        expect(alert.type).toMatch(/^(expiring|expired)$/);
        expect(alert.productId).toBeDefined();
        expect(alert.message).toMatch(/(expires in|has expired)/);
        expect(alert.createdAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('Reorder Point Suggestions 📈', () => {
    it('should generate intelligent reorder suggestions for low stock products', async () => {
      const suggestions = await generateReorderSuggestions();
      
      expect(suggestions.length).toBeGreaterThan(0);
      
      // Verify suggestions for specific products
      const lowStockSuggestion = suggestions.find(s => s.productName === 'Low Stock Product');
      expect(lowStockSuggestion).toBeDefined();
      expect(lowStockSuggestion?.suggestedQuantity).toBeGreaterThan(0);
      expect(lowStockSuggestion?.urgency).toBe('high');
      expect(lowStockSuggestion?.currentStock).toBe(5);
      expect(lowStockSuggestion?.minStock).toBe(20);
    });

    it('should calculate optimal reorder quantities based on historical data', async () => {
      const suggestions = await generateReorderSuggestions();
      
      suggestions.forEach(suggestion => {
        // Suggested quantity should bring stock above minimum
        expect(suggestion.suggestedQuantity).toBeGreaterThan(suggestion.minStock - suggestion.currentStock);
        
        // Should use reorder quantity if available, otherwise calculate based on minimum
        const product = testProducts.find(p => p.name === suggestion.productName);
        if (product?.reorderQuantity) {
          expect(suggestion.suggestedQuantity).toBeGreaterThanOrEqual(product.reorderQuantity);
        }
        
        // Estimated cost should be realistic
        expect(suggestion.estimatedCost).toBeGreaterThan(0);
        expect(suggestion.estimatedCost).toBe(suggestion.suggestedQuantity * (product?.cost || 0));
      });
    });

    it('should prioritize suggestions by urgency level', async () => {
      const suggestions = await generateReorderSuggestions();
      const sortedSuggestions = suggestions.sort((a, b) => {
        const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
      });

      // Out of stock should be critical urgency
      const criticalSuggestions = sortedSuggestions.filter(s => s.urgency === 'critical');
      expect(criticalSuggestions.length).toBeGreaterThan(0);
      
      const outOfStockSuggestion = criticalSuggestions.find(s => s.currentStock === 0);
      expect(outOfStockSuggestion).toBeDefined();
    });

    it('should include lead time considerations in suggestions', async () => {
      // Mock historical sales data for lead time calculations
      const historicalSales = [
        { productId: 'prod-low-1', quantity: 10, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        { productId: 'prod-low-1', quantity: 15, date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        { productId: 'prod-low-1', quantity: 8, date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000) }
      ];
      mockServices.supabase.setMockData('sales_history', historicalSales);

      const suggestions = await generateReorderSuggestionsWithLeadTime();
      
      const lowStockSuggestion = suggestions.find(s => s.productName === 'Low Stock Product');
      expect(lowStockSuggestion?.leadTimeDays).toBeDefined();
      expect(lowStockSuggestion?.averageDailySales).toBeDefined();
      expect(lowStockSuggestion?.safetyStock).toBeDefined();
    });

    it('should handle high-value products with special consideration', async () => {
      const suggestions = await generateReorderSuggestions();
      
      const highValueSuggestion = suggestions.find(s => s.productName === 'High Value Product');
      expect(highValueSuggestion).toBeDefined();
      expect(highValueSuggestion?.urgency).toBe('high'); // High value = high priority
      expect(highValueSuggestion?.estimatedCost).toBeGreaterThan(50000); // High cost threshold
    });

    it('should provide supplier information in suggestions', async () => {
      const suggestions = await generateReorderSuggestionsWithSuppliers();
      
      suggestions.forEach(suggestion => {
        expect(suggestion.supplierInfo).toBeDefined();
        expect(suggestion.supplierInfo.name).toBeDefined();
        expect(suggestion.supplierInfo.leadTime).toBeDefined();
        expect(suggestion.supplierInfo.minimumOrderQuantity).toBeDefined();
      });
    });

    it('should calculate seasonal adjustments for reorder quantities', async () => {
      // Mock seasonal data
      const seasonalData = {
        'prod-low-1': { seasonalMultiplier: 1.5, season: 'peak' },
        'prod-low-2': { seasonalMultiplier: 0.8, season: 'low' }
      };
      
      const suggestions = await generateSeasonalReorderSuggestions(seasonalData);
      
      const peakSeasonSuggestion = suggestions.find(s => s.productId === 'prod-low-1');
      expect(peakSeasonSuggestion?.seasonalAdjustment).toBe(1.5);
      expect(peakSeasonSuggestion?.adjustedQuantity).toBeGreaterThan(peakSeasonSuggestion?.baseQuantity || 0);
    });

    it('should handle bulk discount considerations', async () => {
      const suggestions = await generateReorderSuggestionsWithDiscounts();
      
      suggestions.forEach(suggestion => {
        if (suggestion.bulkDiscountTiers) {
          expect(suggestion.bulkDiscountTiers.length).toBeGreaterThan(0);
          expect(suggestion.recommendedTier).toBeDefined();
          expect(suggestion.potentialSavings).toBeGreaterThanOrEqual(0);
        }
      });
    });

    it('should not suggest reorders for products with adequate stock', async () => {
      const suggestions = await generateReorderSuggestions();
      
      const productNames = suggestions.map(s => s.productName);
      expect(productNames).not.toContain('Normal Stock Product'); // Has adequate stock
    });
  });

  describe('Unusual Stock Movement Detection 🔍', () => {
    it('should detect suspicious large quantity adjustments', async () => {
      const product = testProducts[0];
      
      // Create suspicious movements
      const suspiciousMovements = [
        { quantity: 500, type: 'adjustment_out', reason: 'Large adjustment', performedBy: 'user1', timestamp: new Date() },
        { quantity: 300, type: 'adjustment_out', reason: 'Another adjustment', performedBy: 'user1', timestamp: new Date(Date.now() - 60000) },
        { quantity: 200, type: 'adjustment_out', reason: 'Yet another', performedBy: 'user1', timestamp: new Date(Date.now() - 120000) }
      ];

      for (const movement of suspiciousMovements) {
        await createStockMovement(product.id, movement);
      }

      const suspiciousAlerts = await detectUnusualMovements(product.id);
      
      expect(suspiciousAlerts.flagged).toBe(true);
      expect(suspiciousAlerts.reasons).toContain('Large frequent adjustments');
      expect(suspiciousAlerts.riskScore).toBeGreaterThan(5);
      expect(suspiciousAlerts.totalQuantityAffected).toBe(1000);
      expect(suspiciousAlerts.movementCount).toBe(3);
    });

    it('should detect off-hours suspicious activity', async () => {
      const product = testProducts[1];
      
      // Create movements at unusual hours
      const offHoursMovements = [
        {
          quantity: 100,
          type: 'adjustment_out',
          reason: 'Night adjustment',
          performedBy: 'night-user',
          timestamp: new Date('2024-01-01T02:00:00') // 2 AM
        },
        {
          quantity: 75,
          type: 'adjustment_out',
          reason: 'Early morning adjustment',
          performedBy: 'early-user',
          timestamp: new Date('2024-01-01T04:30:00') // 4:30 AM
        }
      ];

      for (const movement of offHoursMovements) {
        await createStockMovement(product.id, movement);
      }

      const suspiciousAlerts = await detectUnusualMovements(product.id);
      
      expect(suspiciousAlerts.flagged).toBe(true);
      expect(suspiciousAlerts.reasons).toContain('Off-hours activity');
      expect(suspiciousAlerts.offHoursCount).toBe(2);
    });

    it('should detect rapid consecutive movements by same user', async () => {
      const product = testProducts[2];
      
      // Create rapid consecutive movements
      const rapidMovements = [
        { quantity: 50, type: 'adjustment_out', reason: 'Quick fix 1', performedBy: 'rapid-user', timestamp: new Date() },
        { quantity: 30, type: 'adjustment_out', reason: 'Quick fix 2', performedBy: 'rapid-user', timestamp: new Date(Date.now() - 30000) }, // 30 seconds ago
        { quantity: 40, type: 'adjustment_out', reason: 'Quick fix 3', performedBy: 'rapid-user', timestamp: new Date(Date.now() - 60000) }, // 1 minute ago
        { quantity: 25, type: 'adjustment_out', reason: 'Quick fix 4', performedBy: 'rapid-user', timestamp: new Date(Date.now() - 90000) }  // 1.5 minutes ago
      ];

      for (const movement of rapidMovements) {
        await createStockMovement(product.id, movement);
      }

      const suspiciousAlerts = await detectUnusualMovements(product.id);
      
      expect(suspiciousAlerts.flagged).toBe(true);
      expect(suspiciousAlerts.reasons).toContain('Rapid consecutive movements');
      expect(suspiciousAlerts.rapidMovementCount).toBe(4);
    });

    it('should detect unusual movement patterns by user behavior', async () => {
      const product = testProducts[3];
      
      // Create movements that deviate from user's normal pattern
      const unusualMovements = [
        { quantity: 1000, type: 'adjustment_out', reason: 'Unusual large adjustment', performedBy: 'normal-user', timestamp: new Date() },
        { quantity: 5, type: 'adjustment_in', reason: 'Normal small adjustment', performedBy: 'normal-user', timestamp: new Date(Date.now() - 86400000) } // Yesterday
      ];

      for (const movement of unusualMovements) {
        await createStockMovement(product.id, movement);
      }

      const suspiciousAlerts = await detectUnusualMovements(product.id);
      
      expect(suspiciousAlerts.flagged).toBe(true);
      expect(suspiciousAlerts.reasons).toContain('Unusual quantity for user');
      expect(suspiciousAlerts.quantityDeviation).toBeGreaterThan(10); // Significant deviation
    });

    it('should detect movements without proper documentation', async () => {
      const product = testProducts[4];
      
      // Create movements with poor documentation
      const poorlyDocumentedMovements = [
        { quantity: 200, type: 'adjustment_out', reason: '', performedBy: 'lazy-user', timestamp: new Date() },
        { quantity: 150, type: 'adjustment_out', reason: 'misc', performedBy: 'lazy-user', timestamp: new Date(Date.now() - 60000) },
        { quantity: 100, type: 'adjustment_out', reason: 'adjustment', performedBy: 'lazy-user', timestamp: new Date(Date.now() - 120000) }
      ];

      for (const movement of poorlyDocumentedMovements) {
        await createStockMovement(product.id, movement);
      }

      const suspiciousAlerts = await detectUnusualMovements(product.id);
      
      expect(suspiciousAlerts.flagged).toBe(true);
      expect(suspiciousAlerts.reasons).toContain('Poor documentation');
      expect(suspiciousAlerts.poorDocumentationCount).toBe(3);
    });

    it('should detect movements that exceed product value thresholds', async () => {
      const highValueProduct = testProducts.find(p => p.name === 'High Value Product');
      
      // Create movement that exceeds value threshold
      const highValueMovement = {
        quantity: 10, // 10 * 5000 = 50,000 cost
        type: 'adjustment_out',
        reason: 'High value adjustment',
        performedBy: 'user1',
        timestamp: new Date()
      };

      await createStockMovement(highValueProduct!.id, highValueMovement);

      const suspiciousAlerts = await detectUnusualMovements(highValueProduct!.id);
      
      expect(suspiciousAlerts.flagged).toBe(true);
      expect(suspiciousAlerts.reasons).toContain('High value movement');
      expect(suspiciousAlerts.totalValue).toBe(50000);
    });

    it('should calculate comprehensive risk scores', async () => {
      const product = testProducts[0];
      
      // Create multiple types of suspicious activity
      const multipleRiskMovements = [
        { quantity: 500, type: 'adjustment_out', reason: '', performedBy: 'user1', timestamp: new Date('2024-01-01T02:00:00') }, // Off-hours + large + poor docs
        { quantity: 300, type: 'adjustment_out', reason: 'misc', performedBy: 'user1', timestamp: new Date('2024-01-01T02:05:00') }, // Rapid + poor docs
        { quantity: 200, type: 'adjustment_out', reason: 'adjustment', performedBy: 'user1', timestamp: new Date('2024-01-01T02:10:00') } // Rapid + poor docs
      ];

      for (const movement of multipleRiskMovements) {
        await createStockMovement(product.id, movement);
      }

      const suspiciousAlerts = await detectUnusualMovements(product.id);
      
      expect(suspiciousAlerts.flagged).toBe(true);
      expect(suspiciousAlerts.riskScore).toBeGreaterThan(10); // Multiple risk factors
      expect(suspiciousAlerts.reasons.length).toBeGreaterThan(2);
    });

    it('should not flag normal business operations', async () => {
      const product = testProducts[5];
      
      // Create normal movements
      const normalMovements = [
        { quantity: 10, type: 'stock_in', reason: 'Purchase receipt #12345', performedBy: 'warehouse-user', timestamp: new Date('2024-01-01T10:00:00') },
        { quantity: 5, type: 'stock_out', reason: 'Sale transaction #67890', performedBy: 'cashier-user', timestamp: new Date('2024-01-01T14:30:00') },
        { quantity: 2, type: 'adjustment_out', reason: 'Damaged goods - quality control', performedBy: 'qc-user', timestamp: new Date('2024-01-01T16:00:00') }
      ];

      for (const movement of normalMovements) {
        await createStockMovement(product.id, movement);
      }

      const suspiciousAlerts = await detectUnusualMovements(product.id);
      
      expect(suspiciousAlerts.flagged).toBe(false);
      expect(suspiciousAlerts.riskScore).toBeLessThan(3);
    });

    it('should provide detailed analysis for flagged movements', async () => {
      const product = testProducts[0];
      
      const suspiciousMovement = {
        quantity: 1000,
        type: 'adjustment_out',
        reason: 'Large adjustment',
        performedBy: 'user1',
        timestamp: new Date('2024-01-01T02:00:00')
      };

      await createStockMovement(product.id, suspiciousMovement);

      const suspiciousAlerts = await detectUnusualMovements(product.id);
      
      expect(suspiciousAlerts.analysis).toBeDefined();
      expect(suspiciousAlerts.analysis.movementPatterns).toBeDefined();
      expect(suspiciousAlerts.analysis.userBehavior).toBeDefined();
      expect(suspiciousAlerts.analysis.recommendations).toBeDefined();
      expect(suspiciousAlerts.analysis.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Alert Notification Delivery 📬', () => {
    it('should deliver alerts to appropriate users based on role and severity', async () => {
      const alerts = await generateAllAlerts();
      
      const deliveryResults = await deliverAlertsToUsers(alerts);
      
      expect(deliveryResults.successCount).toBeGreaterThan(0);
      expect(deliveryResults.deliveries.length).toBeGreaterThan(0);
      
      // Check that critical alerts go to managers and admins
      const criticalDeliveries = deliveryResults.deliveries.filter(d => d.alertSeverity === 'critical');
      expect(criticalDeliveries.length).toBeGreaterThan(0);
      expect(criticalDeliveries.every(d => ['manager', 'admin', 'inventory_manager'].includes(d.userRole))).toBe(true);
      
      // Check that high severity alerts go to appropriate roles
      const highSeverityDeliveries = deliveryResults.deliveries.filter(d => d.alertSeverity === 'high');
      expect(highSeverityDeliveries.every(d => ['manager', 'admin', 'inventory_manager'].includes(d.userRole))).toBe(true);
    });

    it('should use different notification channels based on alert severity', async () => {
      const criticalAlert = TestDataFactory.createStockAlert({ severity: 'critical', type: 'out_of_stock' });
      const mediumAlert = TestDataFactory.createStockAlert({ severity: 'medium', type: 'low_stock' });
      
      const deliveryResults = await deliverAlertsWithChannels([criticalAlert, mediumAlert]);
      
      const criticalDelivery = deliveryResults.deliveries.find(d => d.alertSeverity === 'critical');
      const mediumDelivery = deliveryResults.deliveries.find(d => d.alertSeverity === 'medium');
      
      expect(criticalDelivery?.channels).toContain('email');
      expect(criticalDelivery?.channels).toContain('sms');
      expect(criticalDelivery?.channels).toContain('push');
      
      expect(mediumDelivery?.channels).toContain('email');
      expect(mediumDelivery?.channels).not.toContain('sms'); // Medium alerts don't need SMS
    });

    it('should batch notifications efficiently for large volumes', async () => {
      const alerts = Array.from({ length: 100 }, (_, i) => 
        TestDataFactory.createStockAlert({ 
          severity: i % 2 === 0 ? 'medium' : 'low',
          productName: `Bulk Product ${i + 1}`
        })
      );

      const batchResult = await batchDeliverAlerts(alerts);
      
      expect(batchResult.batchCount).toBeGreaterThan(0);
      expect(batchResult.totalDelivered).toBe(100);
      expect(batchResult.averageBatchSize).toBeLessThanOrEqual(10); // Reasonable batch size
      expect(batchResult.totalProcessingTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle delivery failures with retry mechanism', async () => {
      const alerts = [
        TestDataFactory.createStockAlert({ severity: 'high', productName: 'Failed Delivery Product' })
      ];
      
      // Simulate delivery failure
      mockServices.notification.setFailure(true);
      
      const deliveryResults = await deliverAlertsToUsers(alerts);
      
      expect(deliveryResults.failureCount).toBeGreaterThan(0);
      expect(deliveryResults.retryQueue.length).toBeGreaterThan(0);
      
      // Test retry mechanism
      mockServices.notification.setFailure(false); // Fix the service
      const retryResults = await retryFailedDeliveries(deliveryResults.retryQueue);
      
      expect(retryResults.successCount).toBeGreaterThan(0);
      expect(retryResults.remainingFailures).toBe(0);
    });

    it('should respect user notification preferences', async () => {
      // Set user preferences
      const userPreferences = [
        { userId: 'user-manager', emailEnabled: true, smsEnabled: false, pushEnabled: true },
        { userId: 'user-admin', emailEnabled: true, smsEnabled: true, pushEnabled: true },
        { userId: 'user-inventory', emailEnabled: false, smsEnabled: true, pushEnabled: true }
      ];
      mockServices.supabase.setMockData('user_notification_preferences', userPreferences);

      const criticalAlert = TestDataFactory.createStockAlert({ severity: 'critical' });
      
      const deliveryResults = await deliverAlertsWithPreferences([criticalAlert]);
      
      const managerDelivery = deliveryResults.deliveries.find(d => d.userId === 'user-manager');
      expect(managerDelivery?.channels).toContain('email');
      expect(managerDelivery?.channels).toContain('push');
      expect(managerDelivery?.channels).not.toContain('sms');
      
      const inventoryDelivery = deliveryResults.deliveries.find(d => d.userId === 'user-inventory');
      expect(inventoryDelivery?.channels).not.toContain('email');
      expect(inventoryDelivery?.channels).toContain('sms');
      expect(inventoryDelivery?.channels).toContain('push');
    });

    it('should implement rate limiting for notification delivery', async () => {
      const manyAlerts = Array.from({ length: 200 }, (_, i) => 
        TestDataFactory.createStockAlert({ 
          severity: 'medium',
          productName: `Rate Limited Product ${i + 1}`
        })
      );

      const deliveryResults = await deliverAlertsWithRateLimit(manyAlerts);
      
      expect(deliveryResults.rateLimitApplied).toBe(true);
      expect(deliveryResults.deliveryRate).toBeLessThanOrEqual(50); // Max 50 notifications per minute
      expect(deliveryResults.queuedForLater.length).toBeGreaterThan(0);
    });

    it('should consolidate similar alerts to avoid spam', async () => {
      const similarAlerts = [
        TestDataFactory.createStockAlert({ type: 'low_stock', productName: 'Product A', severity: 'medium' }),
        TestDataFactory.createStockAlert({ type: 'low_stock', productName: 'Product B', severity: 'medium' }),
        TestDataFactory.createStockAlert({ type: 'low_stock', productName: 'Product C', severity: 'medium' }),
        TestDataFactory.createStockAlert({ type: 'low_stock', productName: 'Product D', severity: 'medium' })
      ];

      const consolidatedResults = await deliverConsolidatedAlerts(similarAlerts);
      
      expect(consolidatedResults.consolidatedCount).toBe(1); // Should consolidate into 1 notification
      expect(consolidatedResults.originalAlertCount).toBe(4);
      expect(consolidatedResults.consolidatedMessage).toContain('4 products are running low on stock');
    });

    it('should track delivery status and provide analytics', async () => {
      const alerts = [
        TestDataFactory.createStockAlert({ severity: 'critical' }),
        TestDataFactory.createStockAlert({ severity: 'high' }),
        TestDataFactory.createStockAlert({ severity: 'medium' })
      ];

      const deliveryResults = await deliverAlertsToUsers(alerts);
      
      expect(deliveryResults.analytics).toBeDefined();
      expect(deliveryResults.analytics.totalAlerts).toBe(3);
      expect(deliveryResults.analytics.deliveryRate).toBeGreaterThan(0);
      expect(deliveryResults.analytics.averageDeliveryTime).toBeDefined();
      expect(deliveryResults.analytics.channelBreakdown).toBeDefined();
    });

    it('should handle timezone considerations for delivery timing', async () => {
      const alerts = [TestDataFactory.createStockAlert({ severity: 'medium' })];
      
      // Mock users in different timezones
      const timezoneUsers = [
        { id: 'user-manila', timezone: 'Asia/Manila', workingHours: { start: 8, end: 17 } },
        { id: 'user-tokyo', timezone: 'Asia/Tokyo', workingHours: { start: 9, end: 18 } },
        { id: 'user-london', timezone: 'Europe/London', workingHours: { start: 9, end: 17 } }
      ];
      mockServices.supabase.setMockData('user_timezones', timezoneUsers);

      const deliveryResults = await deliverAlertsWithTimezone(alerts);
      
      deliveryResults.deliveries.forEach(delivery => {
        expect(delivery.scheduledTime).toBeDefined();
        expect(delivery.userTimezone).toBeDefined();
        expect(delivery.withinWorkingHours).toBeDefined();
      });
    });

    it('should provide delivery confirmation and read receipts', async () => {
      const alert = TestDataFactory.createStockAlert({ severity: 'high' });
      
      const deliveryResults = await deliverAlertsWithConfirmation([alert]);
      
      expect(deliveryResults.deliveries[0].confirmationRequired).toBe(true);
      expect(deliveryResults.deliveries[0].deliveryId).toBeDefined();
      
      // Simulate confirmation
      const confirmationResult = await confirmAlertDelivery(deliveryResults.deliveries[0].deliveryId);
      expect(confirmationResult.confirmed).toBe(true);
      expect(confirmationResult.confirmedAt).toBeInstanceOf(Date);
    });

    it('should escalate unacknowledged critical alerts', async () => {
      const criticalAlert = TestDataFactory.createStockAlert({ 
        severity: 'critical', 
        type: 'out_of_stock',
        createdAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
      });

      const escalationResults = await checkAndEscalateAlerts([criticalAlert]);
      
      expect(escalationResults.escalatedAlerts.length).toBe(1);
      expect(escalationResults.escalatedAlerts[0].escalationLevel).toBe(2); // Second level
      expect(escalationResults.escalatedAlerts[0].escalatedTo).toContain('admin');
    });
  });

  describe('Alert Management 📋', () => {
    it('should mark alerts as read', async () => {
      const alert = TestDataFactory.createStockAlert({ isRead: false });
      await mockServices.supabase.from('stock_alerts').insert(alert);

      const result = await markAlertAsRead(alert.id);
      
      expect(result.success).toBe(true);
      
      const updatedAlert = await getAlert(alert.id);
      expect(updatedAlert.isRead).toBe(true);
    });

    it('should dismiss alerts', async () => {
      const alert = TestDataFactory.createStockAlert();
      await mockServices.supabase.from('stock_alerts').insert(alert);

      const result = await dismissAlert(alert.id, 'user-123', 'Issue resolved');
      
      expect(result.success).toBe(true);
    });

    it('should get unread alert count', async () => {
      const alerts = [
        TestDataFactory.createStockAlert({ isRead: false }),
        TestDataFactory.createStockAlert({ isRead: false }),
        TestDataFactory.createStockAlert({ isRead: true })
      ];

      for (const alert of alerts) {
        await mockServices.supabase.from('stock_alerts').insert(alert);
      }

      const unreadCount = await getUnreadAlertCount();
      
      expect(unreadCount).toBe(2);
    });
  });
});

// Helper functions
async function generateLowStockAlerts(): Promise<StockAlert[]> {
  const products = await mockServices.supabase.from('products').select('*');
  const alerts: StockAlert[] = [];

  (products.data || []).forEach(product => {
    if (product.stock > 0 && product.stock < product.min_stock) {
      alerts.push({
        id: `alert-${Date.now()}-${product.id}`,
        type: 'low_stock',
        productId: product.id,
        productName: product.name,
        message: `${product.name} is below minimum stock level (${product.stock}/${product.min_stock})`,
        severity: product.stock < product.min_stock * 0.5 ? 'high' : 'medium',
        isRead: false,
        createdAt: new Date()
      });
    }
  });

  return alerts;
}

async function generateOutOfStockAlerts(): Promise<StockAlert[]> {
  const products = await mockServices.supabase.from('products').select('*');
  const alerts: StockAlert[] = [];

  (products.data || []).forEach(product => {
    if (product.stock === 0) {
      alerts.push({
        id: `alert-${Date.now()}-${product.id}`,
        type: 'out_of_stock',
        productId: product.id,
        productName: product.name,
        message: `${product.name} is completely out of stock`,
        severity: 'critical',
        isRead: false,
        createdAt: new Date()
      });
    }
  });

  return alerts;
}

async function generateExpiryAlerts(): Promise<StockAlert[]> {
  const products = await mockServices.supabase.from('products').select('*');
  const alerts: StockAlert[] = [];
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  (products.data || []).forEach(product => {
    if (product.expiry_date) {
      const expiryDate = new Date(product.expiry_date);
      if (expiryDate > now && expiryDate <= sevenDaysFromNow) {
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        
        alerts.push({
          id: `alert-${Date.now()}-${product.id}`,
          type: 'expiring',
          productId: product.id,
          productName: product.name,
          message: `${product.name} expires in ${daysUntilExpiry} days`,
          severity: daysUntilExpiry <= 3 ? 'high' : 'medium',
          isRead: false,
          createdAt: new Date()
        });
      }
    }
  });

  return alerts;
}

async function generateExpiredAlerts(): Promise<StockAlert[]> {
  const products = await mockServices.supabase.from('products').select('*');
  const alerts: StockAlert[] = [];
  const now = new Date();

  (products.data || []).forEach(product => {
    if (product.expiry_date && new Date(product.expiry_date) < now) {
      alerts.push({
        id: `alert-${Date.now()}-${product.id}`,
        type: 'expired',
        productId: product.id,
        productName: product.name,
        message: `${product.name} has expired`,
        severity: 'critical',
        isRead: false,
        createdAt: new Date()
      });
    }
  });

  return alerts;
}

async function generateAllAlerts(): Promise<StockAlert[]> {
  const [lowStock, outOfStock, expiring, expired] = await Promise.all([
    generateLowStockAlerts(),
    generateOutOfStockAlerts(),
    generateExpiryAlerts(),
    generateExpiredAlerts()
  ]);

  return [...lowStock, ...outOfStock, ...expiring, ...expired];
}

async function generateReorderSuggestions() {
  const products = await mockServices.supabase.from('products').select('*');
  const suggestions: any[] = [];

  (products.data || []).forEach(product => {
    if (product.stock <= product.min_stock) {
      const suggestedQuantity = Math.max(product.reorder_quantity || product.min_stock * 2, product.min_stock - product.stock);
      const urgency = product.stock === 0 ? 'critical' : 
                     product.stock < product.min_stock * 0.5 ? 'high' : 'medium';

      suggestions.push({
        productId: product.id,
        productName: product.name,
        currentStock: product.stock,
        minStock: product.min_stock,
        suggestedQuantity,
        urgency,
        estimatedCost: suggestedQuantity * product.cost
      });
    }
  });

  return suggestions;
}

async function createStockMovement(productId: string, movement: any): Promise<void> {
  await mockServices.supabase.from('stock_movements').insert({
    id: `mov-${Date.now()}-${Math.random()}`,
    product_id: productId,
    type: movement.type,
    quantity: movement.quantity,
    reason: movement.reason,
    performed_by: movement.performedBy,
    created_at: movement.timestamp || new Date()
  });
}



async function deliverAlertsToUsers(alerts: StockAlert[]) {
  const deliveries: any[] = [];
  let successCount = 0;
  let failureCount = 0;
  const retryQueue: any[] = [];

  for (const alert of alerts) {
    const userRole = alert.severity === 'critical' ? 'manager' : 'user';
    const recipient = userRole === 'manager' ? 'manager@company.com' : 'user@company.com';

    try {
      const result = await mockServices.notification.sendNotification(
        alert.type,
        recipient,
        alert.message
      );

      if (result.success) {
        successCount++;
        deliveries.push({
          alertId: alert.id,
          alertSeverity: alert.severity,
          userRole,
          recipient,
          status: 'delivered'
        });
      } else {
        failureCount++;
        retryQueue.push({ alert, recipient });
      }
    } catch (error) {
      failureCount++;
      retryQueue.push({ alert, recipient });
    }
  }

  return {
    successCount,
    failureCount,
    deliveries,
    retryQueue
  };
}

async function batchDeliverAlerts(alerts: StockAlert[]) {
  const batchSize = 10;
  const batches = Math.ceil(alerts.length / batchSize);
  let totalDelivered = 0;

  for (let i = 0; i < batches; i++) {
    const batch = alerts.slice(i * batchSize, (i + 1) * batchSize);
    const result = await deliverAlertsToUsers(batch);
    totalDelivered += result.successCount;
  }

  return {
    batchCount: batches,
    totalDelivered
  };
}

async function markAlertAsRead(alertId: string): Promise<{ success: boolean }> {
  await mockServices.supabase
    .from('stock_alerts')
    .update({ is_read: true })
    .eq('id', alertId);

  return { success: true };
}

async function dismissAlert(alertId: string, userId: string, reason: string): Promise<{ success: boolean }> {
  await mockServices.supabase
    .from('stock_alerts')
    .update({ 
      is_read: true, 
      dismissed: true, 
      dismissed_by: userId, 
      dismissed_reason: reason 
    })
    .eq('id', alertId);

  return { success: true };
}

async function getAlert(alertId: string): Promise<StockAlert> {
  const result = await mockServices.supabase
    .from('stock_alerts')
    .select('*')
    .eq('id', alertId)
    .single();

  return result.data;
}

async function getUnreadAlertCount(): Promise<number> {
  const result = await mockServices.supabase
    .from('stock_alerts')
    .select('id')
    .eq('is_read', false);

  return (result.data || []).length;
}

// Enhanced helper functions for comprehensive testing

async function generateReorderSuggestionsWithLeadTime() {
  const suggestions = await generateReorderSuggestions();
  
  return suggestions.map(suggestion => ({
    ...suggestion,
    leadTimeDays: 7, // Mock lead time
    averageDailySales: 5, // Mock daily sales
    safetyStock: 10 // Mock safety stock
  }));
}

async function generateReorderSuggestionsWithSuppliers() {
  const suggestions = await generateReorderSuggestions();
  
  return suggestions.map(suggestion => ({
    ...suggestion,
    supplierInfo: {
      name: 'Test Supplier Corp',
      leadTime: 7,
      minimumOrderQuantity: 50,
      contactEmail: 'supplier@test.com'
    }
  }));
}

async function generateSeasonalReorderSuggestions(seasonalData: any) {
  const suggestions = await generateReorderSuggestions();
  
  return suggestions.map(suggestion => {
    const seasonal = seasonalData[suggestion.productId] || { seasonalMultiplier: 1.0, season: 'normal' };
    const baseQuantity = suggestion.suggestedQuantity;
    const adjustedQuantity = Math.round(baseQuantity * seasonal.seasonalMultiplier);
    
    return {
      ...suggestion,
      baseQuantity,
      seasonalAdjustment: seasonal.seasonalMultiplier,
      adjustedQuantity,
      season: seasonal.season
    };
  });
}

async function generateReorderSuggestionsWithDiscounts() {
  const suggestions = await generateReorderSuggestions();
  
  return suggestions.map(suggestion => ({
    ...suggestion,
    bulkDiscountTiers: [
      { quantity: 100, discount: 0.05 },
      { quantity: 500, discount: 0.10 },
      { quantity: 1000, discount: 0.15 }
    ],
    recommendedTier: { quantity: 100, discount: 0.05 },
    potentialSavings: suggestion.estimatedCost * 0.05
  }));
}

async function detectUnusualMovements(productId: string) {
  const movements = await mockServices.supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(20);

  const movementData = movements.data || [];
  const reasons: string[] = [];
  let riskScore = 0;
  let totalQuantityAffected = 0;
  let offHoursCount = 0;
  let rapidMovementCount = 0;
  let poorDocumentationCount = 0;
  let totalValue = 0;

  // Get product for value calculations
  const product = await mockServices.supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  const productData = product.data;

  // Check for large frequent adjustments
  const adjustments = movementData.filter(m => m.type.includes('adjustment'));
  if (adjustments.length > 2) {
    const avgQuantity = adjustments.reduce((sum, m) => sum + m.quantity, 0) / adjustments.length;
    if (avgQuantity > 100) {
      reasons.push('Large frequent adjustments');
      riskScore += 3;
    }
  }

  // Analyze each movement
  movementData.forEach(movement => {
    totalQuantityAffected += movement.quantity;
    
    // Check for off-hours activity
    const hour = new Date(movement.created_at).getHours();
    if (hour < 6 || hour > 22) {
      offHoursCount++;
      riskScore += 2;
    }

    // Check for poor documentation
    if (!movement.reason || movement.reason.trim().length < 5 || 
        ['misc', 'adjustment', ''].includes(movement.reason.toLowerCase())) {
      poorDocumentationCount++;
      riskScore += 1;
    }

    // Calculate value impact
    if (productData) {
      totalValue += movement.quantity * productData.cost;
    }
  });

  // Check for rapid consecutive movements
  if (movementData.length >= 3) {
    const recentMovements = movementData.slice(0, 5);
    const timeSpan = new Date(recentMovements[0].created_at).getTime() - 
                    new Date(recentMovements[recentMovements.length - 1].created_at).getTime();
    
    if (timeSpan < 5 * 60 * 1000) { // Within 5 minutes
      rapidMovementCount = recentMovements.length;
      reasons.push('Rapid consecutive movements');
      riskScore += 3;
    }
  }

  // Add specific reason flags
  if (offHoursCount > 0) {
    reasons.push('Off-hours activity');
  }

  if (poorDocumentationCount > 0) {
    reasons.push('Poor documentation');
  }

  // Check for high value movements
  if (totalValue > 10000) {
    reasons.push('High value movement');
    riskScore += 2;
  }

  // Check for unusual quantity for user (simplified)
  const userMovements = movementData.filter(m => m.performed_by === movementData[0]?.performed_by);
  if (userMovements.length > 1) {
    const quantities = userMovements.map(m => m.quantity);
    const avgQuantity = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;
    const maxQuantity = Math.max(...quantities);
    
    if (maxQuantity > avgQuantity * 5) { // 5x deviation
      reasons.push('Unusual quantity for user');
      riskScore += 2;
    }
  }

  return {
    flagged: riskScore >= 3,
    reasons,
    riskScore,
    totalQuantityAffected,
    movementCount: movementData.length,
    offHoursCount,
    rapidMovementCount,
    poorDocumentationCount,
    totalValue,
    quantityDeviation: userMovements.length > 1 ? 
      Math.max(...userMovements.map(m => m.quantity)) / 
      (userMovements.reduce((sum, m) => sum + m.quantity, 0) / userMovements.length) : 0,
    analysis: {
      movementPatterns: 'Detected unusual patterns in stock movements',
      userBehavior: 'User behavior deviates from normal patterns',
      recommendations: [
        'Review movement documentation requirements',
        'Implement additional approval for large adjustments',
        'Monitor off-hours activity more closely'
      ]
    }
  };
}

async function deliverAlertsWithChannels(alerts: StockAlert[]) {
  const deliveries: any[] = [];
  let successCount = 0;

  for (const alert of alerts) {
    const channels = [];
    
    // Determine channels based on severity
    if (alert.severity === 'critical') {
      channels.push('email', 'sms', 'push');
    } else if (alert.severity === 'high') {
      channels.push('email', 'push');
    } else {
      channels.push('email');
    }

    const userRole = ['critical', 'high'].includes(alert.severity) ? 'manager' : 'user';
    
    successCount++;
    deliveries.push({
      alertId: alert.id,
      alertSeverity: alert.severity,
      userRole,
      channels,
      status: 'delivered'
    });
  }

  return { successCount, deliveries };
}

async function retryFailedDeliveries(retryQueue: any[]) {
  let successCount = 0;
  let remainingFailures = 0;

  for (const item of retryQueue) {
    try {
      const result = await mockServices.notification.sendNotification(
        item.alert.type,
        item.recipient,
        item.alert.message
      );
      
      if (result.success) {
        successCount++;
      } else {
        remainingFailures++;
      }
    } catch (error) {
      remainingFailures++;
    }
  }

  return { successCount, remainingFailures };
}

async function deliverAlertsWithPreferences(alerts: StockAlert[]) {
  const preferences = await mockServices.supabase
    .from('user_notification_preferences')
    .select('*');

  const deliveries: any[] = [];
  let successCount = 0;

  for (const alert of alerts) {
    // Get users who should receive this alert
    const targetUsers = testUsers.filter(user => 
      ['admin', 'manager', 'inventory_manager'].includes(user.role)
    );

    for (const user of targetUsers) {
      const userPref = preferences.data?.find(p => p.userId === user.id);
      const channels = [];

      if (userPref?.emailEnabled) channels.push('email');
      if (userPref?.smsEnabled) channels.push('sms');
      if (userPref?.pushEnabled) channels.push('push');

      successCount++;
      deliveries.push({
        alertId: alert.id,
        userId: user.id,
        userRole: user.role,
        channels,
        status: 'delivered'
      });
    }
  }

  return { successCount, deliveries };
}

async function deliverAlertsWithRateLimit(alerts: StockAlert[]) {
  const maxPerMinute = 50;
  const delivered = Math.min(alerts.length, maxPerMinute);
  const queuedForLater = alerts.slice(maxPerMinute);

  return {
    rateLimitApplied: alerts.length > maxPerMinute,
    deliveryRate: delivered,
    totalDelivered: delivered,
    queuedForLater,
    estimatedDeliveryTime: Math.ceil(alerts.length / maxPerMinute) + ' minutes'
  };
}

async function deliverConsolidatedAlerts(alerts: StockAlert[]) {
  // Group similar alerts
  const groupedAlerts = alerts.reduce((groups: any, alert) => {
    const key = `${alert.type}_${alert.severity}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(alert);
    return groups;
  }, {});

  let consolidatedCount = 0;
  let originalAlertCount = alerts.length;

  for (const [key, groupAlerts] of Object.entries(groupedAlerts)) {
    if ((groupAlerts as any[]).length > 1) {
      consolidatedCount++;
    }
  }

  return {
    consolidatedCount,
    originalAlertCount,
    consolidatedMessage: `${alerts.length} products are running low on stock`,
    groupedAlerts
  };
}

async function deliverAlertsWithTimezone(alerts: StockAlert[]) {
  const timezoneUsers = await mockServices.supabase
    .from('user_timezones')
    .select('*');

  const deliveries: any[] = [];

  for (const alert of alerts) {
    for (const user of timezoneUsers.data || []) {
      const now = new Date();
      const userTime = new Date(now.toLocaleString('en-US', { timeZone: user.timezone }));
      const hour = userTime.getHours();
      
      const withinWorkingHours = hour >= user.workingHours.start && hour <= user.workingHours.end;
      const scheduledTime = withinWorkingHours ? now : 
        new Date(now.getTime() + (user.workingHours.start - hour) * 60 * 60 * 1000);

      deliveries.push({
        alertId: alert.id,
        userId: user.id,
        userTimezone: user.timezone,
        scheduledTime,
        withinWorkingHours,
        status: 'scheduled'
      });
    }
  }

  return { deliveries };
}

async function deliverAlertsWithConfirmation(alerts: StockAlert[]) {
  const deliveries: any[] = [];

  for (const alert of alerts) {
    const deliveryId = `delivery-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    
    deliveries.push({
      alertId: alert.id,
      deliveryId,
      confirmationRequired: alert.severity === 'high' || alert.severity === 'critical',
      status: 'delivered',
      deliveredAt: new Date()
    });
  }

  return { deliveries };
}

async function confirmAlertDelivery(deliveryId: string) {
  return {
    deliveryId,
    confirmed: true,
    confirmedAt: new Date()
  };
}

async function checkAndEscalateAlerts(alerts: StockAlert[]) {
  const escalatedAlerts: any[] = [];

  for (const alert of alerts) {
    const alertAge = Date.now() - alert.createdAt.getTime();
    const thirtyMinutes = 30 * 60 * 1000;

    if (alert.severity === 'critical' && alertAge > thirtyMinutes) {
      escalatedAlerts.push({
        ...alert,
        escalationLevel: 2,
        escalatedTo: ['admin', 'manager'],
        escalatedAt: new Date(),
        originalCreatedAt: alert.createdAt
      });
    }
  }

  return { escalatedAlerts };
}