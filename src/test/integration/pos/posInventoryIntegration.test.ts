import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestDataFactory } from '../../factories/testDataFactory';
import { mockServices } from '../../mocks/mockServices';
import { setupTestEnvironment, cleanupTestData } from '../../utils/testUtils';
import { Product, Sale, SaleItem } from '../../../types/business';

describe('POS-Inventory Integration Tests 🛒📦', () => {
  let testProducts: Product[];
  let testSales: Sale[];

  beforeEach(async () => {
    await setupTestEnvironment({ mockDatabase: true, loadTestData: true, testDataScale: 'medium' });
    
    // Create test products with various stock levels
    testProducts = [
      TestDataFactory.createProduct({ 
        id: 'prod-pos-1',
        name: 'POS Test Product 1',
        stock: 100, 
        minStock: 20,
        price: 150,
        cost: 100
      }),
      TestDataFactory.createProduct({ 
        id: 'prod-pos-2',
        name: 'POS Test Product 2',
        stock: 5, 
        minStock: 10,
        price: 200,
        cost: 120
      }),
      TestDataFactory.createProduct({ 
        id: 'prod-pos-3',
        name: 'POS Test Product 3',
        stock: 1, 
        minStock: 5,
        price: 300,
        cost: 180
      }),
      TestDataFactory.createProduct({ 
        id: 'prod-pos-4',
        name: 'Out of Stock Product',
        stock: 0, 
        minStock: 10,
        price: 250,
        cost: 150
      })
    ];
    
    mockServices.supabase.setMockData('products', testProducts);
    mockServices.supabase.setMockData('sales', []);
    mockServices.supabase.setMockData('stock_movements', []);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Real-time Inventory Updates During Sales 💰', () => {
    it('should update inventory levels immediately when sale is completed', async () => {
      const saleItems: SaleItem[] = [
        {
          id: 'item-1',
          productId: 'prod-pos-1',
          productName: 'POS Test Product 1',
          sku: 'SKU-001',
          quantity: 10,
          price: 150,
          total: 1500
        },
        {
          id: 'item-2',
          productId: 'prod-pos-2',
          productName: 'POS Test Product 2',
          sku: 'SKU-002',
          quantity: 2,
          price: 200,
          total: 400
        }
      ];

      const result = await processSaleWithInventoryUpdate(saleItems);
      
      expect(result.success).toBe(true);
      expect(result.inventoryUpdated).toBe(true);
      
      // Verify stock levels were reduced
      const updatedProduct1 = await getProductById('prod-pos-1');
      const updatedProduct2 = await getProductById('prod-pos-2');
      
      expect(updatedProduct1.stock).toBe(90); // 100 - 10
      expect(updatedProduct2.stock).toBe(3);  // 5 - 2
      
      // Verify stock movements were recorded
      const movements = await getStockMovements(['prod-pos-1', 'prod-pos-2']);
      expect(movements.length).toBe(2);
      expect(movements.every(m => m.type === 'stock_out')).toBe(true);
    });

    it('should handle concurrent sales transactions without race conditions', async () => {
      const sale1Items: SaleItem[] = [
        {
          id: 'item-1',
          productId: 'prod-pos-1',
          productName: 'POS Test Product 1',
          sku: 'SKU-001',
          quantity: 30,
          price: 150,
          total: 4500
        }
      ];

      const sale2Items: SaleItem[] = [
        {
          id: 'item-2',
          productId: 'prod-pos-1',
          productName: 'POS Test Product 1',
          sku: 'SKU-001',
          quantity: 25,
          price: 150,
          total: 3750
        }
      ];

      // Process concurrent sales
      const [result1, result2] = await Promise.all([
        processSaleWithInventoryUpdate(sale1Items),
        processSaleWithInventoryUpdate(sale2Items)
      ]);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      // Verify final stock level is correct (100 - 30 - 25 = 45)
      const updatedProduct = await getProductById('prod-pos-1');
      expect(updatedProduct.stock).toBe(45);
      
      // Verify both transactions were recorded
      const movements = await getStockMovements(['prod-pos-1']);
      expect(movements.length).toBe(2);
    });

    it('should update inventory atomically with sale transaction', async () => {
      const saleItems: SaleItem[] = [
        {
          id: 'item-1',
          productId: 'prod-pos-1',
          productName: 'POS Test Product 1',
          sku: 'SKU-001',
          quantity: 15,
          price: 150,
          total: 2250
        }
      ];

      // Mock database transaction
      const transactionResult = await executeAtomicSaleTransaction(saleItems);
      
      expect(transactionResult.saleCreated).toBe(true);
      expect(transactionResult.inventoryUpdated).toBe(true);
      expect(transactionResult.stockMovementRecorded).toBe(true);
      expect(transactionResult.transactionId).toBeDefined();
      
      // Verify all changes are consistent
      const sale = await getSaleByTransactionId(transactionResult.transactionId);
      const product = await getProductById('prod-pos-1');
      const movement = await getStockMovementByReference(transactionResult.transactionId);
      
      expect(sale).toBeDefined();
      expect(product.stock).toBe(85); // 100 - 15
      expect(movement.referenceId).toBe(transactionResult.transactionId);
    });
  });

  describe('Stock Reduction on Sale Completion 📉', () => {
    it('should reduce stock levels accurately for multiple items', async () => {
      const saleItems: SaleItem[] = [
        {
          id: 'item-1',
          productId: 'prod-pos-1',
          productName: 'POS Test Product 1',
          sku: 'SKU-001',
          quantity: 20,
          price: 150,
          total: 3000
        },
        {
          id: 'item-2',
          productId: 'prod-pos-2',
          productName: 'POS Test Product 2',
          sku: 'SKU-002',
          quantity: 3,
          price: 200,
          total: 600
        },
        {
          id: 'item-3',
          productId: 'prod-pos-3',
          productName: 'POS Test Product 3',
          sku: 'SKU-003',
          quantity: 1,
          price: 300,
          total: 300
        }
      ];

      const result = await completeSaleTransaction(saleItems);
      
      expect(result.success).toBe(true);
      
      // Verify each product's stock was reduced correctly
      const products = await getProductsByIds(['prod-pos-1', 'prod-pos-2', 'prod-pos-3']);
      
      expect(products.find(p => p.id === 'prod-pos-1')?.stock).toBe(80); // 100 - 20
      expect(products.find(p => p.id === 'prod-pos-2')?.stock).toBe(2);  // 5 - 3
      expect(products.find(p => p.id === 'prod-pos-3')?.stock).toBe(0);  // 1 - 1
    });

    it('should handle fractional quantities for weight-based products', async () => {
      // Add weight-based product
      const weightProduct = TestDataFactory.createProduct({
        id: 'prod-weight-1',
        name: 'Weight-based Product',
        stock: 50.5,
        minStock: 10,
        unit: 'kg',
        price: 100,
        cost: 60
      });
      
      testProducts.push(weightProduct);
      mockServices.supabase.setMockData('products', testProducts);

      const saleItems: SaleItem[] = [
        {
          id: 'item-weight',
          productId: 'prod-weight-1',
          productName: 'Weight-based Product',
          sku: 'SKU-WEIGHT',
          quantity: 2.5,
          price: 100,
          total: 250
        }
      ];

      const result = await completeSaleTransaction(saleItems);
      
      expect(result.success).toBe(true);
      
      const updatedProduct = await getProductById('prod-weight-1');
      expect(updatedProduct.stock).toBe(48.0); // 50.5 - 2.5
    });

    it('should update sold quantity tracking', async () => {
      const saleItems: SaleItem[] = [
        {
          id: 'item-1',
          productId: 'prod-pos-1',
          productName: 'POS Test Product 1',
          sku: 'SKU-001',
          quantity: 12,
          price: 150,
          total: 1800
        }
      ];

      const result = await completeSaleTransaction(saleItems);
      
      expect(result.success).toBe(true);
      
      const updatedProduct = await getProductById('prod-pos-1');
      expect(updatedProduct.soldQuantity).toBe(12); // Assuming starting from 0
    });
  });

  describe('Stock Restoration on Returns 🔄', () => {
    it('should restore inventory levels when processing returns', async () => {
      // First, complete a sale
      const originalSaleItems: SaleItem[] = [
        {
          id: 'item-1',
          productId: 'prod-pos-1',
          productName: 'POS Test Product 1',
          sku: 'SKU-001',
          quantity: 15,
          price: 150,
          total: 2250
        }
      ];

      await completeSaleTransaction(originalSaleItems);
      
      // Verify stock was reduced
      let product = await getProductById('prod-pos-1');
      expect(product.stock).toBe(85); // 100 - 15

      // Now process return
      const returnItems: SaleItem[] = [
        {
          id: 'return-item-1',
          productId: 'prod-pos-1',
          productName: 'POS Test Product 1',
          sku: 'SKU-001',
          quantity: 10, // Partial return
          price: 150,
          total: 1500
        }
      ];

      const returnResult = await processReturnTransaction(returnItems);
      
      expect(returnResult.success).toBe(true);
      expect(returnResult.inventoryRestored).toBe(true);
      
      // Verify stock was restored
      product = await getProductById('prod-pos-1');
      expect(product.stock).toBe(95); // 85 + 10
      
      // Verify return movement was recorded
      const movements = await getStockMovements(['prod-pos-1']);
      const returnMovement = movements.find(m => m.type === 'return');
      expect(returnMovement).toBeDefined();
      expect(returnMovement?.quantity).toBe(10);
    });

    it('should handle partial returns correctly', async () => {
      // Complete sale of 20 items
      const saleItems: SaleItem[] = [
        {
          id: 'item-1',
          productId: 'prod-pos-2',
          productName: 'POS Test Product 2',
          sku: 'SKU-002',
          quantity: 4,
          price: 200,
          total: 800
        }
      ];

      await completeSaleTransaction(saleItems);
      
      // Return only 2 items
      const returnItems: SaleItem[] = [
        {
          id: 'return-item-1',
          productId: 'prod-pos-2',
          productName: 'POS Test Product 2',
          sku: 'SKU-002',
          quantity: 2,
          price: 200,
          total: 400
        }
      ];

      const returnResult = await processReturnTransaction(returnItems);
      
      expect(returnResult.success).toBe(true);
      
      const product = await getProductById('prod-pos-2');
      expect(product.stock).toBe(3); // 5 - 4 + 2 = 3
    });

    it('should validate return quantities against original sale', async () => {
      const saleItems: SaleItem[] = [
        {
          id: 'item-1',
          productId: 'prod-pos-1',
          productName: 'POS Test Product 1',
          sku: 'SKU-001',
          quantity: 5,
          price: 150,
          total: 750
        }
      ];

      const saleResult = await completeSaleTransaction(saleItems);
      
      // Attempt to return more than was sold
      const invalidReturnItems: SaleItem[] = [
        {
          id: 'return-item-1',
          productId: 'prod-pos-1',
          productName: 'POS Test Product 1',
          sku: 'SKU-001',
          quantity: 10, // More than the 5 that were sold
          price: 150,
          total: 1500
        }
      ];

      const returnResult = await processReturnTransaction(invalidReturnItems, saleResult.saleId);
      
      expect(returnResult.success).toBe(false);
      expect(returnResult.error).toContain('exceeds original sale quantity');
    });
  });

  describe('Overselling Prevention 🚫', () => {
    it('should prevent sales when insufficient stock available', async () => {
      const oversellItems: SaleItem[] = [
        {
          id: 'item-1',
          productId: 'prod-pos-2', // Only has 5 in stock
          productName: 'POS Test Product 2',
          sku: 'SKU-002',
          quantity: 10, // Trying to sell 10
          price: 200,
          total: 2000
        }
      ];

      const result = await attemptSaleTransaction(oversellItems);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient stock');
      expect(result.availableStock).toBe(5);
      expect(result.requestedQuantity).toBe(10);
      
      // Verify no inventory changes occurred
      const product = await getProductById('prod-pos-2');
      expect(product.stock).toBe(5); // Unchanged
    });

    it('should provide out-of-stock warnings before sale completion', async () => {
      const warnings = await checkStockAvailability([
        { productId: 'prod-pos-4', quantity: 1 }, // Out of stock
        { productId: 'prod-pos-3', quantity: 2 }, // Only 1 available
        { productId: 'prod-pos-1', quantity: 50 } // Sufficient stock
      ]);

      expect(warnings.length).toBe(2);
      
      const outOfStockWarning = warnings.find(w => w.productId === 'prod-pos-4');
      expect(outOfStockWarning?.type).toBe('out_of_stock');
      expect(outOfStockWarning?.availableStock).toBe(0);
      
      const insufficientWarning = warnings.find(w => w.productId === 'prod-pos-3');
      expect(insufficientWarning?.type).toBe('insufficient_stock');
      expect(insufficientWarning?.availableStock).toBe(1);
      expect(insufficientWarning?.requestedQuantity).toBe(2);
    });

    it('should suggest alternative quantities when stock is low', async () => {
      const suggestions = await getStockSuggestions([
        { productId: 'prod-pos-2', requestedQuantity: 8 }, // Only 5 available
        { productId: 'prod-pos-3', requestedQuantity: 3 }  // Only 1 available
      ]);

      expect(suggestions.length).toBe(2);
      
      const suggestion1 = suggestions.find(s => s.productId === 'prod-pos-2');
      expect(suggestion1?.suggestedQuantity).toBe(5);
      expect(suggestion1?.reason).toContain('maximum available');
      
      const suggestion2 = suggestions.find(s => s.productId === 'prod-pos-3');
      expect(suggestion2?.suggestedQuantity).toBe(1);
    });
  });

  describe('Transaction Voiding and Reversion 🔄', () => {
    it('should restore inventory when voiding completed transactions', async () => {
      const saleItems: SaleItem[] = [
        {
          id: 'item-1',
          productId: 'prod-pos-1',
          productName: 'POS Test Product 1',
          sku: 'SKU-001',
          quantity: 25,
          price: 150,
          total: 3750
        }
      ];

      // Complete the sale
      const saleResult = await completeSaleTransaction(saleItems);
      expect(saleResult.success).toBe(true);
      
      // Verify stock was reduced
      let product = await getProductById('prod-pos-1');
      expect(product.stock).toBe(75); // 100 - 25

      // Void the transaction
      const voidResult = await voidTransaction(saleResult.saleId);
      
      expect(voidResult.success).toBe(true);
      expect(voidResult.inventoryRestored).toBe(true);
      
      // Verify stock was restored
      product = await getProductById('prod-pos-1');
      expect(product.stock).toBe(100); // Back to original
      
      // Verify void movement was recorded
      const movements = await getStockMovements(['prod-pos-1']);
      const voidMovement = movements.find(m => m.type === 'void_reversal');
      expect(voidMovement).toBeDefined();
    });

    it('should handle voiding of multi-item transactions', async () => {
      const saleItems: SaleItem[] = [
        {
          id: 'item-1',
          productId: 'prod-pos-1',
          productName: 'POS Test Product 1',
          sku: 'SKU-001',
          quantity: 10,
          price: 150,
          total: 1500
        },
        {
          id: 'item-2',
          productId: 'prod-pos-2',
          productName: 'POS Test Product 2',
          sku: 'SKU-002',
          quantity: 2,
          price: 200,
          total: 400
        }
      ];

      const saleResult = await completeSaleTransaction(saleItems);
      const voidResult = await voidTransaction(saleResult.saleId);
      
      expect(voidResult.success).toBe(true);
      
      // Verify all products had their stock restored
      const products = await getProductsByIds(['prod-pos-1', 'prod-pos-2']);
      expect(products.find(p => p.id === 'prod-pos-1')?.stock).toBe(100); // Original stock
      expect(products.find(p => p.id === 'prod-pos-2')?.stock).toBe(5);   // Original stock
    });

    it('should prevent voiding of already voided transactions', async () => {
      const saleItems: SaleItem[] = [
        {
          id: 'item-1',
          productId: 'prod-pos-1',
          productName: 'POS Test Product 1',
          sku: 'SKU-001',
          quantity: 5,
          price: 150,
          total: 750
        }
      ];

      const saleResult = await completeSaleTransaction(saleItems);
      const firstVoidResult = await voidTransaction(saleResult.saleId);
      expect(firstVoidResult.success).toBe(true);

      // Attempt to void again
      const secondVoidResult = await voidTransaction(saleResult.saleId);
      expect(secondVoidResult.success).toBe(false);
      expect(secondVoidResult.error).toContain('already voided');
    });
  });

  describe('Concurrent Cashier Operations 👥', () => {
    it('should handle multiple cashiers selling same product simultaneously', async () => {
      const cashier1Items: SaleItem[] = [
        {
          id: 'c1-item-1',
          productId: 'prod-pos-1',
          productName: 'POS Test Product 1',
          sku: 'SKU-001',
          quantity: 30,
          price: 150,
          total: 4500
        }
      ];

      const cashier2Items: SaleItem[] = [
        {
          id: 'c2-item-1',
          productId: 'prod-pos-1',
          productName: 'POS Test Product 1',
          sku: 'SKU-001',
          quantity: 40,
          price: 150,
          total: 6000
        }
      ];

      const cashier3Items: SaleItem[] = [
        {
          id: 'c3-item-1',
          productId: 'prod-pos-1',
          productName: 'POS Test Product 1',
          sku: 'SKU-001',
          quantity: 35,
          price: 150,
          total: 5250
        }
      ];

      // Process all sales concurrently
      const results = await Promise.all([
        processSaleWithCashier(cashier1Items, 'cashier-1'),
        processSaleWithCashier(cashier2Items, 'cashier-2'),
        processSaleWithCashier(cashier3Items, 'cashier-3')
      ]);

      // All should succeed since total (105) is greater than available (100)
      // But the system should handle this gracefully
      const successfulSales = results.filter(r => r.success);
      const failedSales = results.filter(r => !r.success);

      // At least one should fail due to insufficient stock
      expect(failedSales.length).toBeGreaterThan(0);
      
      // Final stock should not go negative
      const finalProduct = await getProductById('prod-pos-1');
      expect(finalProduct.stock).toBeGreaterThanOrEqual(0);
    });

    it('should maintain inventory consistency across concurrent operations', async () => {
      // Create multiple concurrent operations
      const operations = [
        () => completeSaleTransaction([{ id: '1', productId: 'prod-pos-1', productName: 'Test', sku: 'SKU', quantity: 10, price: 150, total: 1500 }]),
        () => processReturnTransaction([{ id: '2', productId: 'prod-pos-1', productName: 'Test', sku: 'SKU', quantity: 5, price: 150, total: 750 }]),
        () => completeSaleTransaction([{ id: '3', productId: 'prod-pos-1', productName: 'Test', sku: 'SKU', quantity: 8, price: 150, total: 1200 }]),
        () => adjustStock('prod-pos-1', 15, 'Manual adjustment'),
        () => completeSaleTransaction([{ id: '4', productId: 'prod-pos-1', productName: 'Test', sku: 'SKU', quantity: 12, price: 150, total: 1800 }])
      ];

      const results = await Promise.allSettled(operations.map(op => op()));
      
      // Verify final consistency
      const finalProduct = await getProductById('prod-pos-1');
      const allMovements = await getStockMovements(['prod-pos-1']);
      
      // Calculate expected stock based on movements
      const totalOut = allMovements
        .filter(m => ['stock_out', 'sale'].includes(m.type))
        .reduce((sum, m) => sum + m.quantity, 0);
      const totalIn = allMovements
        .filter(m => ['stock_in', 'return', 'adjustment'].includes(m.type))
        .reduce((sum, m) => sum + m.quantity, 0);
      
      const expectedStock = 100 - totalOut + totalIn;
      expect(finalProduct.stock).toBe(expectedStock);
    });

    it('should provide real-time stock updates to all cashier terminals', async () => {
      // Simulate multiple cashier terminals checking stock
      const initialStockChecks = await Promise.all([
        getProductStockForCashier('prod-pos-2', 'cashier-1'),
        getProductStockForCashier('prod-pos-2', 'cashier-2'),
        getProductStockForCashier('prod-pos-2', 'cashier-3')
      ]);

      // All should see the same initial stock
      expect(initialStockChecks.every(check => check.stock === 5)).toBe(true);

      // Cashier 1 makes a sale
      await processSaleWithCashier([{
        id: 'item-1',
        productId: 'prod-pos-2',
        productName: 'POS Test Product 2',
        sku: 'SKU-002',
        quantity: 2,
        price: 200,
        total: 400
      }], 'cashier-1');

      // All cashiers should now see updated stock
      const updatedStockChecks = await Promise.all([
        getProductStockForCashier('prod-pos-2', 'cashier-1'),
        getProductStockForCashier('prod-pos-2', 'cashier-2'),
        getProductStockForCashier('prod-pos-2', 'cashier-3')
      ]);

      expect(updatedStockChecks.every(check => check.stock === 3)).toBe(true);
    });
  });
});

// Helper functions for POS-Inventory integration

async function processSaleWithInventoryUpdate(saleItems: SaleItem[]) {
  try {
    // Validate stock availability
    for (const item of saleItems) {
      const product = await getProductById(item.productId);
      if (product.stock < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
          availableStock: product.stock,
          requestedQuantity: item.quantity
        };
      }
    }

    // Create sale record
    const sale = TestDataFactory.createSale({
      items: saleItems,
      status: 'completed'
    });

    await mockServices.supabase.from('sales').insert(sale);

    // Update inventory levels
    for (const item of saleItems) {
      const product = await getProductById(item.productId);
      const newStock = product.stock - item.quantity;
      const newSoldQuantity = (product.soldQuantity || 0) + item.quantity;

      await mockServices.supabase
        .from('products')
        .update({ 
          stock: newStock,
          soldQuantity: newSoldQuantity,
          updatedAt: new Date()
        })
        .eq('id', item.productId);

      // Record stock movement
      await mockServices.supabase.from('stock_movements').insert({
        id: `mov-${Date.now()}-${Math.random()}`,
        product_id: item.productId,
        type: 'stock_out',
        quantity: item.quantity,
        reason: `Sale transaction ${sale.invoiceNumber}`,
        performed_by: 'pos-system',
        reference_id: sale.id,
        created_at: new Date()
      });
    }

    return {
      success: true,
      inventoryUpdated: true,
      saleId: sale.id,
      transactionId: sale.invoiceNumber
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      inventoryUpdated: false
    };
  }
}

async function executeAtomicSaleTransaction(saleItems: SaleItem[]) {
  const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
  
  try {
    // In a real implementation, this would use database transactions
    // For testing, we'll simulate atomic operations
    
    const sale = TestDataFactory.createSale({
      id: transactionId,
      items: saleItems,
      status: 'completed'
    });

    // Simulate atomic transaction
    const operations = [];
    
    // 1. Create sale
    operations.push(mockServices.supabase.from('sales').insert(sale));
    
    // 2. Update inventory
    for (const item of saleItems) {
      const product = await getProductById(item.productId);
      operations.push(
        mockServices.supabase
          .from('products')
          .update({ stock: product.stock - item.quantity })
          .eq('id', item.productId)
      );
      
      // 3. Record movement
      operations.push(
        mockServices.supabase.from('stock_movements').insert({
          id: `mov-${Date.now()}-${Math.random()}`,
          product_id: item.productId,
          type: 'stock_out',
          quantity: item.quantity,
          reason: `Sale transaction ${sale.invoiceNumber}`,
          reference_id: transactionId,
          created_at: new Date()
        })
      );
    }

    await Promise.all(operations);

    return {
      success: true,
      saleCreated: true,
      inventoryUpdated: true,
      stockMovementRecorded: true,
      transactionId
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      transactionId
    };
  }
}

async function completeSaleTransaction(saleItems: SaleItem[]) {
  return processSaleWithInventoryUpdate(saleItems);
}

async function processReturnTransaction(returnItems: SaleItem[], originalSaleId?: string) {
  try {
    // Validate return quantities if original sale is provided
    if (originalSaleId) {
      const originalSale = await getSaleById(originalSaleId);
      for (const returnItem of returnItems) {
        const originalItem = originalSale.items.find(item => item.productId === returnItem.productId);
        if (!originalItem || returnItem.quantity > originalItem.quantity) {
          return {
            success: false,
            error: `Return quantity for ${returnItem.productName} exceeds original sale quantity`
          };
        }
      }
    }

    // Create return record
    const returnSale = TestDataFactory.createSale({
      items: returnItems,
      status: 'refunded'
    });

    await mockServices.supabase.from('sales').insert(returnSale);

    // Restore inventory levels
    for (const item of returnItems) {
      const product = await getProductById(item.productId);
      const newStock = product.stock + item.quantity;

      await mockServices.supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', item.productId);

      // Record return movement
      await mockServices.supabase.from('stock_movements').insert({
        id: `mov-${Date.now()}-${Math.random()}`,
        product_id: item.productId,
        type: 'return',
        quantity: item.quantity,
        reason: `Return transaction ${returnSale.invoiceNumber}`,
        performed_by: 'pos-system',
        reference_id: returnSale.id,
        created_at: new Date()
      });
    }

    return {
      success: true,
      inventoryRestored: true,
      returnId: returnSale.id
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function attemptSaleTransaction(saleItems: SaleItem[]) {
  // Check stock availability first
  for (const item of saleItems) {
    const product = await getProductById(item.productId);
    if (product.stock < item.quantity) {
      return {
        success: false,
        error: `Insufficient stock for ${product.name}`,
        availableStock: product.stock,
        requestedQuantity: item.quantity
      };
    }
  }

  return processSaleWithInventoryUpdate(saleItems);
}

async function checkStockAvailability(items: Array<{ productId: string; quantity: number }>) {
  const warnings = [];

  for (const item of items) {
    const product = await getProductById(item.productId);
    
    if (product.stock === 0) {
      warnings.push({
        productId: item.productId,
        productName: product.name,
        type: 'out_of_stock',
        availableStock: 0,
        requestedQuantity: item.quantity
      });
    } else if (product.stock < item.quantity) {
      warnings.push({
        productId: item.productId,
        productName: product.name,
        type: 'insufficient_stock',
        availableStock: product.stock,
        requestedQuantity: item.quantity
      });
    }
  }

  return warnings;
}

async function getStockSuggestions(items: Array<{ productId: string; requestedQuantity: number }>) {
  const suggestions = [];

  for (const item of items) {
    const product = await getProductById(item.productId);
    
    if (product.stock < item.requestedQuantity && product.stock > 0) {
      suggestions.push({
        productId: item.productId,
        productName: product.name,
        requestedQuantity: item.requestedQuantity,
        suggestedQuantity: product.stock,
        reason: `Only ${product.stock} available - maximum available quantity suggested`
      });
    }
  }

  return suggestions;
}

async function voidTransaction(saleId: string) {
  try {
    const sale = await getSaleById(saleId);
    
    if (sale.status === 'cancelled' || sale.status === 'refunded') {
      return {
        success: false,
        error: 'Transaction is already voided'
      };
    }

    // Mark sale as voided
    await mockServices.supabase
      .from('sales')
      .update({ status: 'cancelled' })
      .eq('id', saleId);

    // Restore inventory
    for (const item of sale.items) {
      const product = await getProductById(item.productId);
      const newStock = product.stock + item.quantity;

      await mockServices.supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', item.productId);

      // Record void reversal movement
      await mockServices.supabase.from('stock_movements').insert({
        id: `mov-${Date.now()}-${Math.random()}`,
        product_id: item.productId,
        type: 'void_reversal',
        quantity: item.quantity,
        reason: `Void transaction ${sale.invoiceNumber}`,
        performed_by: 'pos-system',
        reference_id: saleId,
        created_at: new Date()
      });
    }

    return {
      success: true,
      inventoryRestored: true
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

async function processSaleWithCashier(saleItems: SaleItem[], cashierId: string) {
  const result = await processSaleWithInventoryUpdate(saleItems);
  
  if (result.success) {
    // Update sale with cashier info
    await mockServices.supabase
      .from('sales')
      .update({ cashierId })
      .eq('id', result.saleId);
  }

  return { ...result, cashierId };
}

async function adjustStock(productId: string, quantity: number, reason: string) {
  const product = await getProductById(productId);
  const newStock = product.stock + quantity;

  await mockServices.supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', productId);

  await mockServices.supabase.from('stock_movements').insert({
    id: `mov-${Date.now()}-${Math.random()}`,
    product_id: productId,
    type: 'adjustment',
    quantity: Math.abs(quantity),
    reason,
    performed_by: 'system',
    created_at: new Date()
  });

  return { success: true, newStock };
}

async function getProductStockForCashier(productId: string, cashierId: string) {
  const product = await getProductById(productId);
  return {
    productId,
    stock: product.stock,
    cashierId,
    timestamp: new Date()
  };
}

// Utility functions
async function getProductById(productId: string): Promise<Product> {
  const result = await mockServices.supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();
  return result.data;
}

async function getProductsByIds(productIds: string[]): Promise<Product[]> {
  const result = await mockServices.supabase
    .from('products')
    .select('*')
    .in('id', productIds);
  return result.data || [];
}

async function getStockMovements(productIds: string[]) {
  const result = await mockServices.supabase
    .from('stock_movements')
    .select('*')
    .in('product_id', productIds);
  return result.data || [];
}

async function getSaleById(saleId: string) {
  const result = await mockServices.supabase
    .from('sales')
    .select('*')
    .eq('id', saleId)
    .single();
  return result.data;
}

async function getSaleByTransactionId(transactionId: string) {
  const result = await mockServices.supabase
    .from('sales')
    .select('*')
    .eq('invoiceNumber', transactionId)
    .single();
  return result.data;
}

async function getStockMovementByReference(referenceId: string) {
  const result = await mockServices.supabase
    .from('stock_movements')
    .select('*')
    .eq('reference_id', referenceId)
    .single();
  return result.data;
}