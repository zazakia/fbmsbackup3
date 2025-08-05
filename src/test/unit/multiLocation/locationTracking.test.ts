import { describe, it, expect, beforeEach } from 'vitest';
import { TestDataFactory, mockServices, setupTestEnvironment, cleanupTestData } from '../../setup';
import { Product, InventoryLocation } from '../../../types/business';

describe('Multi-Location Inventory Tracking - DOMINATION MODE! 🏢⚡', () => {
  let testProducts: Product[];
  let testLocations: InventoryLocation[];

  beforeEach(async () => {
    await setupTestEnvironment({ mockDatabase: true, loadTestData: true, testDataScale: 'medium' });
    
    testLocations = [
      TestDataFactory.createInventoryLocation({ id: 'LOC-001', name: 'Main Warehouse', type: 'warehouse' }),
      TestDataFactory.createInventoryLocation({ id: 'LOC-002', name: 'Store Front', type: 'store' }),
      TestDataFactory.createInventoryLocation({ id: 'LOC-003', name: 'Branch Store', type: 'store' }),
      TestDataFactory.createInventoryLocation({ id: 'LOC-004', name: 'Cold Storage', type: 'storage' }),
      TestDataFactory.createInventoryLocation({ id: 'LOC-005', name: 'Display Area', type: 'display' })
    ];
    
    testProducts = Array.from({ length: 20 }, () => TestDataFactory.createProduct());
    
    mockServices.supabase.setMockData('inventory_locations', testLocations);
    mockServices.supabase.setMockData('products', testProducts);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Location-Specific Stock Tracking 📍', () => {
    it('should track stock levels per location like a MASTER! 🎯', async () => {
      const product = testProducts[0];
      const locationStocks = [
        { locationId: 'LOC-001', stock: 500 },
        { locationId: 'LOC-002', stock: 150 },
        { locationId: 'LOC-003', stock: 75 },
        { locationId: 'LOC-004', stock: 200 }
      ];

      for (const locationStock of locationStocks) {
        await setLocationStock(product.id, locationStock.locationId, locationStock.stock);
      }

      const stockByLocation = await getStockByLocation(product.id);
      
      expect(stockByLocation).toHaveLength(4);
      expect(stockByLocation.find(s => s.locationId === 'LOC-001')?.stock).toBe(500);
      expect(stockByLocation.find(s => s.locationId === 'LOC-002')?.stock).toBe(150);
    });

    it('should calculate total stock across all locations', async () => {
      const product = testProducts[1];
      const locationStocks = [
        { locationId: 'LOC-001', stock: 300 },
        { locationId: 'LOC-002', stock: 100 },
        { locationId: 'LOC-003', stock: 50 }
      ];

      for (const locationStock of locationStocks) {
        await setLocationStock(product.id, locationStock.locationId, locationStock.stock);
      }

      const totalStock = await getTotalStockAcrossLocations(product.id);
      
      expect(totalStock).toBe(450); // 300 + 100 + 50
    });

    it('should handle zero stock locations gracefully', async () => {
      const product = testProducts[2];
      
      await setLocationStock(product.id, 'LOC-001', 0);
      await setLocationStock(product.id, 'LOC-002', 100);

      const stockByLocation = await getStockByLocation(product.id);
      const zeroStockLocation = stockByLocation.find(s => s.locationId === 'LOC-001');
      
      expect(zeroStockLocation?.stock).toBe(0);
      expect(stockByLocation.some(s => s.stock > 0)).toBe(true);
    });
  });

  describe('Inter-Location Transfers 🔄', () => {
    it('should process transfers between locations with PRECISION! ⚡', async () => {
      const product = testProducts[0];
      const fromLocation = 'LOC-001';
      const toLocation = 'LOC-002';
      const transferQuantity = 100;

      // Set initial stocks
      await setLocationStock(product.id, fromLocation, 500);
      await setLocationStock(product.id, toLocation, 200);

      const transferResult = await processLocationTransfer({
        productId: product.id,
        fromLocationId: fromLocation,
        toLocationId: toLocation,
        quantity: transferQuantity,
        reason: 'Stock rebalancing',
        performedBy: 'warehouse-manager'
      });

      expect(transferResult.success).toBe(true);
      
      const fromStock = await getLocationStock(product.id, fromLocation);
      const toStock = await getLocationStock(product.id, toLocation);
      
      expect(fromStock).toBe(400); // 500 - 100
      expect(toStock).toBe(300); // 200 + 100
    });

    it('should prevent transfers with insufficient stock', async () => {
      const product = testProducts[1];
      const fromLocation = 'LOC-001';
      const toLocation = 'LOC-002';

      await setLocationStock(product.id, fromLocation, 50);

      const transferResult = await processLocationTransfer({
        productId: product.id,
        fromLocationId: fromLocation,
        toLocationId: toLocation,
        quantity: 100, // More than available
        reason: 'Test transfer',
        performedBy: 'user'
      });

      expect(transferResult.success).toBe(false);
      expect(transferResult.error).toBe('Insufficient stock at source location');
    });

    it('should handle bulk transfers like a MACHINE! 🤖', async () => {
      const transfers = testProducts.slice(0, 5).map(product => ({
        productId: product.id,
        fromLocationId: 'LOC-001',
        toLocationId: 'LOC-002',
        quantity: 50,
        reason: 'Bulk transfer',
        performedBy: 'bulk-user'
      }));

      // Set initial stocks
      for (const transfer of transfers) {
        await setLocationStock(transfer.productId, transfer.fromLocationId, 200);
        await setLocationStock(transfer.productId, transfer.toLocationId, 100);
      }

      const results = await processBulkLocationTransfers(transfers);

      expect(results.successCount).toBe(5);
      expect(results.failureCount).toBe(0);
    });
  });

  describe('Location-Based Reorder Management 📊', () => {
    it('should calculate reorder points per location', async () => {
      const product = testProducts[0];
      const locationData = [
        { locationId: 'LOC-001', averageDailySales: 20, leadTimeDays: 7 },
        { locationId: 'LOC-002', averageDailySales: 8, leadTimeDays: 5 },
        { locationId: 'LOC-003', averageDailySales: 5, leadTimeDays: 3 }
      ];

      const reorderPoints = await calculateLocationReorderPoints(product.id, locationData);

      expect(reorderPoints).toHaveLength(3);
      expect(reorderPoints[0].reorderPoint).toBe(140); // 20 * 7
      expect(reorderPoints[1].reorderPoint).toBe(40); // 8 * 5
      expect(reorderPoints[2].reorderPoint).toBe(15); // 5 * 3
    });

    it('should identify locations needing reorders', async () => {
      const product = testProducts[1];
      
      // Set stocks below reorder points
      await setLocationStock(product.id, 'LOC-001', 10); // Below threshold
      await setLocationStock(product.id, 'LOC-002', 100); // Above threshold
      await setLocationStock(product.id, 'LOC-003', 5); // Below threshold

      const reorderNeeded = await getLocationsNeedingReorder(product.id, {
        'LOC-001': 50,
        'LOC-002': 30,
        'LOC-003': 20
      });

      expect(reorderNeeded).toHaveLength(2);
      expect(reorderNeeded.map(l => l.locationId)).toContain('LOC-001');
      expect(reorderNeeded.map(l => l.locationId)).toContain('LOC-003');
    });
  });
});

// Helper functions
async function setLocationStock(productId: string, locationId: string, stock: number): Promise<void> {
  await mockServices.supabase
    .from('location_stock')
    .upsert({ product_id: productId, location_id: locationId, stock });
}

async function getLocationStock(productId: string, locationId: string): Promise<number> {
  const result = await mockServices.supabase
    .from('location_stock')
    .select('stock')
    .eq('product_id', productId)
    .eq('location_id', locationId)
    .single();
  
  return result.data?.stock || 0;
}

async function getStockByLocation(productId: string) {
  const result = await mockServices.supabase
    .from('location_stock')
    .select('*')
    .eq('product_id', productId);
  
  return result.data || [];
}

async function getTotalStockAcrossLocations(productId: string): Promise<number> {
  const stockByLocation = await getStockByLocation(productId);
  return stockByLocation.reduce((total, location) => total + location.stock, 0);
}

async function processLocationTransfer(data: {
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  reason: string;
  performedBy: string;
}): Promise<{ success: boolean; error?: string }> {
  const fromStock = await getLocationStock(data.productId, data.fromLocationId);
  
  if (fromStock < data.quantity) {
    return { success: false, error: 'Insufficient stock at source location' };
  }
  
  const toStock = await getLocationStock(data.productId, data.toLocationId);
  
  await setLocationStock(data.productId, data.fromLocationId, fromStock - data.quantity);
  await setLocationStock(data.productId, data.toLocationId, toStock + data.quantity);
  
  return { success: true };
}

async function processBulkLocationTransfers(transfers: any[]): Promise<{ successCount: number; failureCount: number }> {
  let successCount = 0;
  let failureCount = 0;
  
  for (const transfer of transfers) {
    const result = await processLocationTransfer(transfer);
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
  }
  
  return { successCount, failureCount };
}

async function calculateLocationReorderPoints(productId: string, locationData: any[]) {
  return locationData.map(data => ({
    locationId: data.locationId,
    reorderPoint: data.averageDailySales * data.leadTimeDays
  }));
}

async function getLocationsNeedingReorder(productId: string, reorderPoints: Record<string, number>) {
  const stockByLocation = await getStockByLocation(productId);
  
  return stockByLocation.filter(location => 
    location.stock < (reorderPoints[location.location_id] || 0)
  );
}