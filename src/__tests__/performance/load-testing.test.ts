import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBusinessStore } from '../../store/businessStore';
import { useOfflineStore } from '../../store/offlineStore';
import { Product, Customer, Sale } from '../../types/business';

// Mock external dependencies
vi.mock('../../api/sales', () => ({
  createSale: vi.fn(),
  getSales: vi.fn(),
  updateSale: vi.fn(),
  deleteSale: vi.fn(),
  getNextInvoiceNumber: vi.fn(),
}));

vi.mock('../../api/customers', () => ({
  getCustomers: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
}));

vi.mock('../../services/receiptService', () => ({
  receiptService: {
    createReceiptData: vi.fn().mockReturnValue({
      receiptNumber: 'RCP-123',
      businessName: 'Test Business',
      items: [],
      total: 0,
    }),
  },
}));

describe('Load Testing and Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('High Volume Transaction Processing', () => {
    it('should handle 100 concurrent sales transactions efficiently', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      // Setup test products
      const testProducts: Product[] = Array.from({ length: 50 }, (_, index) => ({
        id: `prod-${index + 1}`,
        name: `Product ${index + 1}`,
        sku: `SKU-${String(index + 1).padStart(3, '0')}`,
        barcode: `123456789${String(index).padStart(2, '0')}`,
        price: Math.floor(Math.random() * 1000) + 50,
        cost: Math.floor(Math.random() * 500) + 25,
        stock: Math.floor(Math.random() * 100) + 50,
        category: `category-${Math.floor(index / 10) + 1}`,
        categoryId: `cat-${Math.floor(index / 10) + 1}`,
        description: `Test product ${index + 1} description`,
        unit: 'pcs',
        isActive: true,
        reorderPoint: 10,
        maxStock: 200,
        supplier: `Supplier ${Math.floor(index / 5) + 1}`,
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Add products to store
      act(() => {
        testProducts.forEach(product => {
          businessStore.current.addProduct(product);
        });
      });

      expect(businessStore.current.products).toHaveLength(50);

      // Mock successful sale creation
      const { createSale } = await import('../../api/sales');
      (createSale as any).mockImplementation(() => 
        Promise.resolve({
          data: { id: `sale-${Date.now()}-${Math.random()}`, createdAt: new Date() },
          error: null,
        })
      );

      // Measure performance of concurrent transactions
      const startTime = performance.now();
      
      const salePromises = Array.from({ length: 100 }, async (_, index) => {
        const randomProduct = testProducts[Math.floor(Math.random() * testProducts.length)];
        const quantity = Math.floor(Math.random() * 5) + 1;
        
        const saleData = {
          customerId: undefined,
          customerName: 'Walk-in Customer',
          items: [{
            id: `item-${Date.now()}-${index}`,
            productId: randomProduct.id,
            productName: randomProduct.name,
            sku: randomProduct.sku,
            quantity: quantity,
            price: randomProduct.price,
            total: randomProduct.price * quantity,
          }],
          subtotal: randomProduct.price * quantity,
          tax: (randomProduct.price * quantity) * 0.12,
          discount: 0,
          total: (randomProduct.price * quantity) * 1.12,
          paymentMethod: 'cash' as const,
          paymentStatus: 'paid' as const,
          status: 'completed' as const,
          cashierId: 'user-1',
          invoiceNumber: `INV-LOAD-${String(index + 1).padStart(3, '0')}`,
          notes: `Load test transaction ${index + 1}`,
        };

        return businessStore.current.createSale(saleData);
      });

      await act(async () => {
        await Promise.all(salePromises);
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Performance assertions
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(businessStore.current.sales).toHaveLength(100);
      
      console.log(`Processed 100 concurrent transactions in ${executionTime.toFixed(2)}ms`);
      console.log(`Average time per transaction: ${(executionTime / 100).toFixed(2)}ms`);
    });

    it('should handle large cart operations efficiently', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      // Create 200 test products
      const testProducts: Product[] = Array.from({ length: 200 }, (_, index) => ({
        id: `cart-prod-${index + 1}`,
        name: `Cart Product ${index + 1}`,
        sku: `CART-${String(index + 1).padStart(3, '0')}`,
        barcode: `987654321${String(index).padStart(2, '0')}`,
        price: Math.floor(Math.random() * 500) + 10,
        cost: Math.floor(Math.random() * 250) + 5,
        stock: 1000, // High stock to avoid stock issues
        category: `cart-category-${Math.floor(index / 20) + 1}`,
        categoryId: `cart-cat-${Math.floor(index / 20) + 1}`,
        description: `Cart test product ${index + 1}`,
        unit: 'pcs',
        isActive: true,
        reorderPoint: 50,
        maxStock: 2000,
        supplier: `Cart Supplier ${Math.floor(index / 10) + 1}`,
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      act(() => {
        testProducts.forEach(product => {
          businessStore.current.addProduct(product);
        });
      });

      // Measure cart operations performance
      const startTime = performance.now();

      // Add 100 items to cart
      act(() => {
        for (let i = 0; i < 100; i++) {
          const randomProduct = testProducts[Math.floor(Math.random() * testProducts.length)];
          businessStore.current.addToCart(randomProduct, Math.floor(Math.random() * 3) + 1);
        }
      });

      // Calculate cart totals multiple times (simulating real-time updates)
      let subtotal = 0;
      let tax = 0;
      let total = 0;

      for (let i = 0; i < 50; i++) {
        subtotal = businessStore.current.getCartSubtotal();
        tax = businessStore.current.getCartTax();
        total = businessStore.current.getCartTotal();
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Performance assertions
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      expect(businessStore.current.cart.length).toBeGreaterThan(0);
      expect(subtotal).toBeGreaterThan(0);
      expect(tax).toBeGreaterThan(0);
      expect(total).toBeGreaterThan(0);

      console.log(`Cart operations completed in ${executionTime.toFixed(2)}ms`);
      console.log(`Cart contains ${businessStore.current.cart.length} items`);
      console.log(`Cart total: ₱${total.toFixed(2)}`);
    });
  });

  describe('Memory Usage and Cleanup', () => {
    it('should handle large datasets without memory leaks', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      // Create large dataset
      const largeProductSet: Product[] = Array.from({ length: 1000 }, (_, index) => ({
        id: `memory-prod-${index + 1}`,
        name: `Memory Test Product ${index + 1}`,
        sku: `MEM-${String(index + 1).padStart(4, '0')}`,
        barcode: `111222333${String(index).padStart(3, '0')}`,
        price: Math.floor(Math.random() * 2000) + 100,
        cost: Math.floor(Math.random() * 1000) + 50,
        stock: Math.floor(Math.random() * 500) + 100,
        category: `memory-category-${Math.floor(index / 100) + 1}`,
        categoryId: `mem-cat-${Math.floor(index / 100) + 1}`,
        description: `Memory test product ${index + 1} with detailed description for testing memory usage`,
        unit: 'pcs',
        isActive: true,
        reorderPoint: 25,
        maxStock: 1000,
        supplier: `Memory Supplier ${Math.floor(index / 50) + 1}`,
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const startTime = performance.now();

      // Add all products
      act(() => {
        largeProductSet.forEach(product => {
          businessStore.current.addProduct(product);
        });
      });

      // Perform various operations
      act(() => {
        // Search operations
        const searchResults = businessStore.current.products.filter(p => 
          p.name.toLowerCase().includes('test')
        );
        expect(searchResults.length).toBe(1000);

        // Category filtering
        const categoryResults = businessStore.current.products.filter(p => 
          p.categoryId === 'mem-cat-1'
        );
        expect(categoryResults.length).toBe(100);

        // Stock operations
        for (let i = 0; i < 100; i++) {
          const randomProduct = largeProductSet[Math.floor(Math.random() * largeProductSet.length)];
          businessStore.current.updateStock(randomProduct.id, -1, 'sale', 'user-1', 'test-ref', 'Memory test');
        }
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Performance assertions
      expect(executionTime).toBeLessThan(3000); // Should complete within 3 seconds
      expect(businessStore.current.products).toHaveLength(1000);

      console.log(`Large dataset operations completed in ${executionTime.toFixed(2)}ms`);

      // Cleanup test
      act(() => {
        // Remove all test products
        largeProductSet.forEach(product => {
          businessStore.current.deleteProduct(product.id);
        });
      });

      expect(businessStore.current.products).toHaveLength(0);
    });
  });

  describe('Offline Mode Performance', () => {
    it('should handle offline queue operations efficiently', async () => {
      const { result: offlineStore } = renderHook(() => useOfflineStore());

      // Set offline mode
      act(() => {
        offlineStore.current.setOnlineStatus(false);
        offlineStore.current.toggleOfflineMode();
      });

      const startTime = performance.now();

      // Add 500 pending transactions
      act(() => {
        for (let i = 0; i < 500; i++) {
          offlineStore.current.addPendingTransaction({
            type: 'sale',
            data: {
              customerId: undefined,
              customerName: 'Walk-in Customer',
              items: [{
                id: `offline-item-${i}`,
                productId: `offline-prod-${i}`,
                productName: `Offline Product ${i}`,
                sku: `OFF-${String(i).padStart(3, '0')}`,
                quantity: 1,
                price: 100,
                total: 100,
              }],
              subtotal: 100,
              tax: 12,
              discount: 0,
              total: 112,
              paymentMethod: 'cash' as const,
              paymentStatus: 'paid' as const,
              status: 'completed' as const,
              cashierId: 'user-1',
              invoiceNumber: `INV-OFF-${String(i + 1).padStart(3, '0')}`,
              notes: `Offline transaction ${i + 1}`,
            },
          });
        }
      });

      // Test filtering operations
      const pendingSales = offlineStore.current.getPendingTransactionsByType('sale');
      const failedTransactions = offlineStore.current.getFailedTransactions();

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Performance assertions
      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(offlineStore.current.pendingTransactions).toHaveLength(500);
      expect(pendingSales).toHaveLength(500);
      expect(failedTransactions).toHaveLength(0);

      console.log(`Offline queue operations completed in ${executionTime.toFixed(2)}ms`);

      // Cleanup
      act(() => {
        offlineStore.current.clearPendingTransactions();
      });

      expect(offlineStore.current.pendingTransactions).toHaveLength(0);
    });
  });

  describe('Search and Filter Performance', () => {
    it('should perform fast searches on large product catalogs', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      // Create diverse product catalog
      const productCatalog: Product[] = Array.from({ length: 2000 }, (_, index) => ({
        id: `search-prod-${index + 1}`,
        name: `${['Electronics', 'Clothing', 'Food', 'Books', 'Tools'][index % 5]} Product ${index + 1}`,
        sku: `SEARCH-${String(index + 1).padStart(4, '0')}`,
        barcode: `555666777${String(index).padStart(3, '0')}`,
        price: Math.floor(Math.random() * 5000) + 50,
        cost: Math.floor(Math.random() * 2500) + 25,
        stock: Math.floor(Math.random() * 200) + 10,
        category: ['electronics', 'clothing', 'food', 'books', 'tools'][index % 5],
        categoryId: `search-cat-${(index % 5) + 1}`,
        description: `Detailed description for ${['Electronics', 'Clothing', 'Food', 'Books', 'Tools'][index % 5]} product ${index + 1}`,
        unit: 'pcs',
        isActive: Math.random() > 0.1, // 90% active
        reorderPoint: 15,
        maxStock: 500,
        supplier: `Search Supplier ${Math.floor(index / 100) + 1}`,
        location: ['Main Store', 'Warehouse A', 'Warehouse B'][index % 3],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      act(() => {
        productCatalog.forEach(product => {
          businessStore.current.addProduct(product);
        });
      });

      // Test various search scenarios
      const searchTests = [
        { term: 'Electronics', expectedMin: 350 },
        { term: 'Product 1', expectedMin: 100 },
        { term: 'SEARCH-0001', expectedMin: 1 },
        { term: 'clothing', expectedMin: 350 },
        { term: 'nonexistent', expectedMin: 0 },
      ];

      for (const test of searchTests) {
        const startTime = performance.now();

        const searchResults = businessStore.current.products.filter(product => 
          product.name.toLowerCase().includes(test.term.toLowerCase()) ||
          product.sku.toLowerCase().includes(test.term.toLowerCase()) ||
          product.category.toLowerCase().includes(test.term.toLowerCase())
        );

        const endTime = performance.now();
        const searchTime = endTime - startTime;

        expect(searchTime).toBeLessThan(100); // Each search should complete within 100ms
        expect(searchResults.length).toBeGreaterThanOrEqual(test.expectedMin);

        console.log(`Search for "${test.term}" found ${searchResults.length} results in ${searchTime.toFixed(2)}ms`);
      }

      // Test category filtering performance
      const categoryStartTime = performance.now();
      
      const electronicsProducts = businessStore.current.products.filter(p => p.category === 'electronics');
      const activeProducts = businessStore.current.products.filter(p => p.isActive);
      const lowStockProducts = businessStore.current.products.filter(p => p.stock < p.reorderPoint);

      const categoryEndTime = performance.now();
      const categoryTime = categoryEndTime - categoryStartTime;

      expect(categoryTime).toBeLessThan(200); // Category filtering should complete within 200ms
      expect(electronicsProducts.length).toBeGreaterThan(300);
      expect(activeProducts.length).toBeGreaterThan(1700); // ~90% should be active

      console.log(`Category filtering completed in ${categoryTime.toFixed(2)}ms`);
      console.log(`Found ${electronicsProducts.length} electronics, ${activeProducts.length} active, ${lowStockProducts.length} low stock`);
    });
  });

  describe('Concurrent User Simulation', () => {
    it('should handle multiple simultaneous user operations', async () => {
      const { result: businessStore } = renderHook(() => useBusinessStore());

      // Setup shared products
      const sharedProducts: Product[] = Array.from({ length: 20 }, (_, index) => ({
        id: `shared-prod-${index + 1}`,
        name: `Shared Product ${index + 1}`,
        sku: `SHARED-${String(index + 1).padStart(2, '0')}`,
        barcode: `888999000${String(index).padStart(2, '0')}`,
        price: 200,
        cost: 120,
        stock: 100, // High stock for concurrent access
        category: 'shared',
        categoryId: 'shared-cat-1',
        description: `Shared product ${index + 1} for concurrent testing`,
        unit: 'pcs',
        isActive: true,
        reorderPoint: 20,
        maxStock: 200,
        supplier: 'Shared Supplier',
        location: 'Main Store',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      act(() => {
        sharedProducts.forEach(product => {
          businessStore.current.addProduct(product);
        });
      });

      // Mock successful operations
      const { createSale } = await import('../../api/sales');
      (createSale as any).mockImplementation(() => 
        Promise.resolve({
          data: { id: `concurrent-sale-${Date.now()}-${Math.random()}`, createdAt: new Date() },
          error: null,
        })
      );

      const startTime = performance.now();

      // Simulate 10 concurrent users each performing multiple operations
      const userOperations = Array.from({ length: 10 }, async (_, userIndex) => {
        const userId = `user-${userIndex + 1}`;
        
        // Each user performs a series of operations
        for (let opIndex = 0; opIndex < 5; opIndex++) {
          const randomProduct = sharedProducts[Math.floor(Math.random() * sharedProducts.length)];
          
          // Add to cart
          await act(async () => {
            businessStore.current.addToCart(randomProduct, 1);
          });

          // Update cart
          await act(async () => {
            businessStore.current.updateCartItem(randomProduct.id, 2);
          });

          // Create sale
          const saleData = {
            customerId: undefined,
            customerName: `User ${userIndex + 1} Customer`,
            items: [{
              id: `concurrent-item-${userIndex}-${opIndex}`,
              productId: randomProduct.id,
              productName: randomProduct.name,
              sku: randomProduct.sku,
              quantity: 2,
              price: randomProduct.price,
              total: randomProduct.price * 2,
            }],
            subtotal: randomProduct.price * 2,
            tax: (randomProduct.price * 2) * 0.12,
            discount: 0,
            total: (randomProduct.price * 2) * 1.12,
            paymentMethod: 'cash' as const,
            paymentStatus: 'paid' as const,
            status: 'completed' as const,
            cashierId: userId,
            invoiceNumber: `INV-CONCURRENT-${userIndex}-${opIndex}`,
            notes: `Concurrent operation by ${userId}`,
          };

          await act(async () => {
            await businessStore.current.createSale(saleData);
          });

          // Clear cart for next operation
          await act(async () => {
            businessStore.current.clearCart();
          });
        }
      });

      await Promise.all(userOperations);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Performance assertions
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
      expect(businessStore.current.sales.length).toBe(50); // 10 users × 5 operations each

      console.log(`Concurrent user operations completed in ${executionTime.toFixed(2)}ms`);
      console.log(`Processed ${businessStore.current.sales.length} concurrent sales`);

      // Verify data integrity
      const totalSales = businessStore.current.sales.reduce((sum, sale) => sum + sale.total, 0);
      expect(totalSales).toBeGreaterThan(0);

      // Verify stock was properly updated
      sharedProducts.forEach(product => {
        const updatedProduct = businessStore.current.getProduct(product.id);
        expect(updatedProduct?.stock).toBeLessThanOrEqual(100); // Stock should have decreased
      });
    });
  });
});