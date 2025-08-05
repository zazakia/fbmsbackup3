import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestDataFactory, mockServices, setupTestEnvironment, cleanupTestData } from '../../setup';
import { Product, StockAlert } from '../../../types/business';

describe('Stock Level Threshold Calculations and Validations - MAXIMUM EFFICIENCY! 🎯', () => {
  let testProducts: Product[];

  beforeEach(async () => {
    await setupTestEnvironment({ mockDatabase: true, loadTestData: true, testDataScale: 'medium' });
    
    testProducts = [
      TestDataFactory.createProduct({ stock: 150, minStock: 50, reorderQuantity: 200 }),
      TestDataFactory.createProduct({ stock: 25, minStock: 100, reorderQuantity: 300 }), // Low stock
      TestDataFactory.createProduct({ stock: 0, minStock: 20, reorderQuantity: 100 }), // Out of stock
      TestDataFactory.createProduct({ stock: 500, minStock: 50, reorderQuantity: 150 }), // High stock
      TestDataFactory.createProduct({ stock: 75, minStock: 75, reorderQuantity: 200 }) // At minimum
    ];
    
    mockServices.supabase.setMockData('products', testProducts);
    mockServices.supabase.setMockData('stock_alerts', []);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Threshold Calculations 📊', () => {
    it('should calculate reorder points with PRECISION! ⚡', async () => {
      const product = testProducts[0];
      const salesData = {
        averageDailySales: 15,
        leadTimeDays: 7,
        safetyStockDays: 3
      };

      const reorderPoint = calculateReorderPoint(salesData);
      
      // Reorder point = (Average daily sales × Lead time) + Safety stock
      const expectedReorderPoint = (15 * 7) + (15 * 3);
      expect(reorderPoint).toBe(expectedReorderPoint); // 150
    });

    it('should calculate economic order quantity (EOQ)', async () => {
      const product = testProducts[0];
      const eoqData = {
        annualDemand: 5000,
        orderingCost: 50,
        holdingCostPerUnit: 2
      };

      const eoq = calculateEOQ(eoqData);
      
      // EOQ = √((2 × Annual demand × Ordering cost) / Holding cost per unit)
      const expectedEOQ = Math.sqrt((2 * 5000 * 50) / 2);
      expect(eoq).toBeCloseTo(expectedEOQ, 0);
    });

    it('should calculate safety stock levels', async () => {
      const product = testProducts[0];
      const safetyData = {
        maxDailySales: 25,
        averageDailySales: 15,
        maxLeadTime: 10,
        averageLeadTime: 7
      };

      const safetyStock = calculateSafetyStock(safetyData);
      
      // Safety stock = (Max daily sales × Max lead time) - (Average daily sales × Average lead time)
      const expectedSafetyStock = (25 * 10) - (15 * 7);
      expect(safetyStock).toBe(expectedSafetyStock); // 145
    });

    it('should calculate ABC classification thresholds', async () => {
      const products = testProducts.map(p => ({
        id: p.id,
        annualValue: p.price * (p.stock * 12) // Simulate annual value
      }));

      const classification = calculateABCClassification(products);

      expect(classification.A.threshold).toBeGreaterThan(classification.B.threshold);
      expect(classification.B.threshold).toBeGreaterThan(classification.C.threshold);
      expect(classification.A.products.length).toBeLessThanOrEqual(classification.B.products.length);
    });
  });

  describe('Stock Level Monitoring 👁️', () => {
    it('should identify low stock products like a HAWK! 🦅', async () => {
      const lowStockProducts = await identifyLowStockProducts();

      expect(lowStockProducts).toHaveLength(2); // Products with stock < minStock
      expect(lowStockProducts.map(p => p.id)).toContain(testProducts[1].id);
      expect(lowStockProducts.map(p => p.id)).toContain(testProducts[2].id);
    });

    it('should identify out-of-stock products', async () => {
      const outOfStockProducts = await identifyOutOfStockProducts();

      expect(outOfStockProducts).toHaveLength(1);
      expect(outOfStockProducts[0].id).toBe(testProducts[2].id);
      expect(outOfStockProducts[0].stock).toBe(0);
    });

    it('should identify products at reorder point', async () => {
      // Set one product exactly at reorder point
      const product = testProducts[0];
      const reorderPoint = 100;
      await updateProductStock(product.id, reorderPoint);

      const reorderProducts = await identifyProductsAtReorderPoint();

      expect(reorderProducts.length).toBeGreaterThan(0);
      const foundProduct = reorderProducts.find(p => p.id === product.id);
      expect(foundProduct).toBeDefined();
    });

    it('should calculate stock coverage days', async () => {
      const product = testProducts[0];
      const averageDailySales = 10;

      const coverageDays = calculateStockCoverageDays(product.stock, averageDailySales);

      expect(coverageDays).toBe(product.stock / averageDailySales);
    });

    it('should predict stockout dates with ACCURACY! 🔮', async () => {
      const product = testProducts[0];
      const salesTrend = {
        averageDailySales: 12,
        trend: 'increasing' as const,
        trendRate: 0.05 // 5% increase per day
      };

      const stockoutDate = predictStockoutDate(product, salesTrend);

      expect(stockoutDate).toBeInstanceOf(Date);
      expect(stockoutDate.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Alert Generation 🚨', () => {
    it('should generate low stock alerts automatically', async () => {
      const alerts = await generateStockAlerts();

      const lowStockAlerts = alerts.filter(a => a.type === 'low_stock');
      expect(lowStockAlerts.length).toBeGreaterThan(0);

      const outOfStockAlerts = alerts.filter(a => a.type === 'out_of_stock');
      expect(outOfStockAlerts.length).toBeGreaterThan(0);
    });

    it('should prioritize alerts by severity', async () => {
      const alerts = await generateStockAlerts();
      const sortedAlerts = alerts.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      });

      expect(sortedAlerts[0].severity).toBe('critical');
      expect(sortedAlerts[sortedAlerts.length - 1].severity).toBe('low');
    });

    it('should generate reorder suggestions', async () => {
      const suggestions = await generateReorderSuggestions();

      expect(suggestions.length).toBeGreaterThan(0);
      suggestions.forEach(suggestion => {
        expect(suggestion.productId).toBeDefined();
        expect(suggestion.suggestedQuantity).toBeGreaterThan(0);
        expect(suggestion.urgency).toMatch(/low|medium|high|critical/);
      });
    });

    it('should calculate optimal reorder quantities', async () => {
      const product = testProducts[1]; // Low stock product
      const historicalData = {
        averageMonthlySales: 300,
        leadTimeDays: 14,
        orderingCost: 75,
        holdingCostPerUnit: 1.5
      };

      const optimalQuantity = calculateOptimalReorderQuantity(product, historicalData);

      expect(optimalQuantity).toBeGreaterThan(0);
      expect(optimalQuantity).toBeGreaterThan(product.reorderQuantity || 0);
    });
  });

  describe('Dynamic Threshold Adjustment 🎛️', () => {
    it('should adjust thresholds based on seasonality', async () => {
      const product = testProducts[0];
      const seasonalData = {
        currentMonth: 11, // November
        seasonalFactors: {
          11: 1.5, // 50% increase in November
          12: 2.0, // 100% increase in December
          1: 0.8   // 20% decrease in January
        }
      };

      const adjustedThresholds = adjustThresholdsForSeasonality(product, seasonalData);

      expect(adjustedThresholds.minStock).toBeGreaterThan(product.minStock);
      expect(adjustedThresholds.reorderQuantity).toBeGreaterThan(product.reorderQuantity || 0);
    });

    it('should adjust thresholds based on demand volatility', async () => {
      const product = testProducts[0];
      const demandData = {
        averageDailySales: 15,
        standardDeviation: 8, // High volatility
        confidenceLevel: 0.95
      };

      const adjustedThresholds = adjustThresholdsForVolatility(product, demandData);

      expect(adjustedThresholds.safetyStock).toBeGreaterThan(0);
      expect(adjustedThresholds.minStock).toBeGreaterThan(product.minStock);
    });

    it('should adjust thresholds based on supplier reliability', async () => {
      const product = testProducts[0];
      const supplierData = {
        averageLeadTime: 7,
        leadTimeVariability: 3, // ±3 days
        onTimeDeliveryRate: 0.85, // 85% on-time delivery
        qualityRate: 0.95 // 95% quality rate
      };

      const adjustedThresholds = adjustThresholdsForSupplierReliability(product, supplierData);

      expect(adjustedThresholds.safetyStock).toBeGreaterThan(0);
      expect(adjustedThresholds.minStock).toBeGreaterThan(product.minStock);
    });
  });

  describe('Multi-Location Threshold Management 🏢', () => {
    it('should calculate location-specific thresholds', async () => {
      const locations = [
        { id: 'LOC-001', name: 'Main Store', salesVelocity: 20 },
        { id: 'LOC-002', name: 'Branch Store', salesVelocity: 8 },
        { id: 'LOC-003', name: 'Warehouse', salesVelocity: 2 }
      ];

      const product = testProducts[0];
      const locationThresholds = await calculateLocationSpecificThresholds(product, locations);

      expect(locationThresholds).toHaveLength(3);
      expect(locationThresholds[0].minStock).toBeGreaterThan(locationThresholds[1].minStock);
      expect(locationThresholds[1].minStock).toBeGreaterThan(locationThresholds[2].minStock);
    });

    it('should optimize stock distribution across locations', async () => {
      const totalStock = 1000;
      const locations = [
        { id: 'LOC-001', demand: 60, currentStock: 200 },
        { id: 'LOC-002', demand: 30, currentStock: 150 },
        { id: 'LOC-003', demand: 10, currentStock: 50 }
      ];

      const distribution = optimizeStockDistribution(totalStock, locations);

      expect(distribution.reduce((sum, d) => sum + d.allocatedStock, 0)).toBe(totalStock);
      expect(distribution[0].allocatedStock).toBeGreaterThan(distribution[1].allocatedStock);
      expect(distribution[1].allocatedStock).toBeGreaterThan(distribution[2].allocatedStock);
    });
  });

  describe('Performance and Scalability 🚀', () => {
    it('should handle large product catalogs efficiently', async () => {
      // Create large dataset
      const largeProductSet = Array.from({ length: 10000 }, () => 
        TestDataFactory.createProduct({
          stock: Math.floor(Math.random() * 1000),
          minStock: Math.floor(Math.random() * 100) + 10
        })
      );

      mockServices.supabase.setMockData('products', largeProductSet);

      const startTime = performance.now();
      const lowStockProducts = await identifyLowStockProducts();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete in under 2 seconds
      expect(lowStockProducts.length).toBeGreaterThan(0);
    });

    it('should batch process threshold calculations', async () => {
      const products = testProducts;
      const batchSize = 2;

      const startTime = performance.now();
      const results = await batchCalculateThresholds(products, batchSize);
      const endTime = performance.now();

      expect(results).toHaveLength(products.length);
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Integration with Business Rules 📋', () => {
    it('should respect category-specific threshold rules', async () => {
      const perishableProduct = TestDataFactory.createProduct({
        category: 'Food & Beverages',
        tags: ['perishable'],
        stock: 100,
        minStock: 20
      });

      const categoryRules = {
        'Food & Beverages': {
          minStockMultiplier: 2.0, // Higher safety stock for perishables
          maxStockDays: 7 // Don't hold more than 7 days worth
        }
      };

      const adjustedThresholds = applyCategoryRules(perishableProduct, categoryRules);

      expect(adjustedThresholds.minStock).toBe(perishableProduct.minStock * 2);
    });

    it('should integrate with procurement lead times', async () => {
      const product = testProducts[0];
      const procurementData = {
        supplierId: 'SUPP-001',
        averageLeadTime: 14,
        minimumOrderQuantity: 500,
        priceBreaks: [
          { quantity: 500, price: 25.00 },
          { quantity: 1000, price: 23.00 },
          { quantity: 2000, price: 21.00 }
        ]
      };

      const optimizedOrder = calculateOptimizedOrder(product, procurementData);

      expect(optimizedOrder.quantity).toBeGreaterThanOrEqual(procurementData.minimumOrderQuantity);
      expect(optimizedOrder.unitPrice).toBeLessThanOrEqual(25.00);
    });
  });
});

// Helper functions for stock level management
function calculateReorderPoint(data: {
  averageDailySales: number;
  leadTimeDays: number;
  safetyStockDays: number;
}): number {
  return (data.averageDailySales * data.leadTimeDays) + (data.averageDailySales * data.safetyStockDays);
}

function calculateEOQ(data: {
  annualDemand: number;
  orderingCost: number;
  holdingCostPerUnit: number;
}): number {
  return Math.sqrt((2 * data.annualDemand * data.orderingCost) / data.holdingCostPerUnit);
}

function calculateSafetyStock(data: {
  maxDailySales: number;
  averageDailySales: number;
  maxLeadTime: number;
  averageLeadTime: number;
}): number {
  return (data.maxDailySales * data.maxLeadTime) - (data.averageDailySales * data.averageLeadTime);
}

function calculateABCClassification(products: Array<{ id: string; annualValue: number }>) {
  const sorted = products.sort((a, b) => b.annualValue - a.annualValue);
  const totalValue = sorted.reduce((sum, p) => sum + p.annualValue, 0);
  
  let cumulativeValue = 0;
  const A: string[] = [];
  const B: string[] = [];
  const C: string[] = [];

  sorted.forEach(product => {
    cumulativeValue += product.annualValue;
    const percentage = cumulativeValue / totalValue;
    
    if (percentage <= 0.8) {
      A.push(product.id);
    } else if (percentage <= 0.95) {
      B.push(product.id);
    } else {
      C.push(product.id);
    }
  });

  return {
    A: { products: A, threshold: 0.8 },
    B: { products: B, threshold: 0.95 },
    C: { products: C, threshold: 1.0 }
  };
}

async function identifyLowStockProducts(): Promise<Product[]> {
  const result = await mockServices.supabase
    .from('products')
    .select('*')
    .lt('stock', 'min_stock');

  return result.data || [];
}

async function identifyOutOfStockProducts(): Promise<Product[]> {
  const result = await mockServices.supabase
    .from('products')
    .select('*')
    .eq('stock', 0);

  return result.data || [];
}

async function identifyProductsAtReorderPoint(): Promise<Product[]> {
  const result = await mockServices.supabase
    .from('products')
    .select('*');

  const products = result.data || [];
  return products.filter(p => p.stock <= (p.reorder_quantity || p.min_stock));
}

function calculateStockCoverageDays(currentStock: number, averageDailySales: number): number {
  return averageDailySales > 0 ? currentStock / averageDailySales : Infinity;
}

function predictStockoutDate(product: Product, salesTrend: {
  averageDailySales: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  trendRate: number;
}): Date {
  let dailySales = salesTrend.averageDailySales;
  let remainingStock = product.stock;
  let days = 0;

  while (remainingStock > 0) {
    remainingStock -= dailySales;
    days++;
    
    if (salesTrend.trend === 'increasing') {
      dailySales *= (1 + salesTrend.trendRate);
    } else if (salesTrend.trend === 'decreasing') {
      dailySales *= (1 - salesTrend.trendRate);
    }
  }

  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function generateStockAlerts(): Promise<StockAlert[]> {
  const alerts: StockAlert[] = [];
  const products = await mockServices.supabase.from('products').select('*');

  (products.data || []).forEach(product => {
    if (product.stock === 0) {
      alerts.push({
        id: `alert-${Date.now()}-${product.id}`,
        type: 'out_of_stock',
        productId: product.id,
        productName: product.name,
        message: `${product.name} is out of stock`,
        severity: 'critical',
        isRead: false,
        createdAt: new Date()
      });
    } else if (product.stock < product.min_stock) {
      alerts.push({
        id: `alert-${Date.now()}-${product.id}`,
        type: 'low_stock',
        productId: product.id,
        productName: product.name,
        message: `${product.name} is below minimum stock level`,
        severity: 'high',
        isRead: false,
        createdAt: new Date()
      });
    }
  });

  return alerts;
}

interface ReorderSuggestion {
  productId: string;
  productName: string;
  currentStock: number;
  suggestedQuantity: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  estimatedCost: number;
}

async function generateReorderSuggestions(): Promise<ReorderSuggestion[]> {
  const suggestions: ReorderSuggestion[] = [];
  const lowStockProducts = await identifyLowStockProducts();

  lowStockProducts.forEach(product => {
    const suggestedQuantity = product.reorderQuantity || (product.minStock * 2);
    const urgency = product.stock === 0 ? 'critical' : 
                   product.stock < product.minStock * 0.5 ? 'high' : 'medium';

    suggestions.push({
      productId: product.id,
      productName: product.name,
      currentStock: product.stock,
      suggestedQuantity,
      urgency,
      estimatedCost: suggestedQuantity * product.cost
    });
  });

  return suggestions;
}

function calculateOptimalReorderQuantity(product: Product, data: {
  averageMonthlySales: number;
  leadTimeDays: number;
  orderingCost: number;
  holdingCostPerUnit: number;
}): number {
  const annualDemand = data.averageMonthlySales * 12;
  const eoq = calculateEOQ({
    annualDemand,
    orderingCost: data.orderingCost,
    holdingCostPerUnit: data.holdingCostPerUnit
  });

  const leadTimeDemand = (data.averageMonthlySales / 30) * data.leadTimeDays;
  const safetyStock = leadTimeDemand * 0.5; // 50% safety buffer

  return Math.max(eoq, leadTimeDemand + safetyStock);
}

function adjustThresholdsForSeasonality(product: Product, data: {
  currentMonth: number;
  seasonalFactors: Record<number, number>;
}) {
  const seasonalFactor = data.seasonalFactors[data.currentMonth] || 1.0;
  
  return {
    minStock: Math.ceil(product.minStock * seasonalFactor),
    reorderQuantity: Math.ceil((product.reorderQuantity || product.minStock) * seasonalFactor)
  };
}

function adjustThresholdsForVolatility(product: Product, data: {
  averageDailySales: number;
  standardDeviation: number;
  confidenceLevel: number;
}) {
  // Z-score for confidence level (95% = 1.96)
  const zScore = data.confidenceLevel === 0.95 ? 1.96 : 1.65;
  const safetyStock = Math.ceil(zScore * data.standardDeviation * Math.sqrt(7)); // 7-day lead time

  return {
    safetyStock,
    minStock: Math.max(product.minStock, safetyStock)
  };
}

function adjustThresholdsForSupplierReliability(product: Product, data: {
  averageLeadTime: number;
  leadTimeVariability: number;
  onTimeDeliveryRate: number;
  qualityRate: number;
}) {
  const reliabilityFactor = data.onTimeDeliveryRate * data.qualityRate;
  const leadTimeBuffer = data.leadTimeVariability * (1 - reliabilityFactor);
  const safetyStock = Math.ceil(product.minStock * 0.2 * leadTimeBuffer);

  return {
    safetyStock,
    minStock: product.minStock + safetyStock
  };
}

async function calculateLocationSpecificThresholds(product: Product, locations: Array<{
  id: string;
  name: string;
  salesVelocity: number;
}>) {
  return locations.map(location => ({
    locationId: location.id,
    locationName: location.name,
    minStock: Math.ceil(product.minStock * (location.salesVelocity / 10)), // Base factor of 10
    reorderQuantity: Math.ceil((product.reorderQuantity || product.minStock) * (location.salesVelocity / 10))
  }));
}

function optimizeStockDistribution(totalStock: number, locations: Array<{
  id: string;
  demand: number;
  currentStock: number;
}>) {
  const totalDemand = locations.reduce((sum, loc) => sum + loc.demand, 0);
  
  return locations.map(location => {
    const demandRatio = location.demand / totalDemand;
    const allocatedStock = Math.floor(totalStock * demandRatio);
    
    return {
      locationId: location.id,
      currentStock: location.currentStock,
      allocatedStock,
      shortfall: Math.max(0, allocatedStock - location.currentStock)
    };
  });
}

async function batchCalculateThresholds(products: Product[], batchSize: number) {
  const results = [];
  
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async product => ({
        productId: product.id,
        reorderPoint: calculateReorderPoint({
          averageDailySales: 10, // Mock data
          leadTimeDays: 7,
          safetyStockDays: 3
        }),
        eoq: calculateEOQ({
          annualDemand: 3650, // Mock data
          orderingCost: 50,
          holdingCostPerUnit: 2
        })
      }))
    );
    
    results.push(...batchResults);
  }
  
  return results;
}

function applyCategoryRules(product: Product, rules: Record<string, any>) {
  const categoryRule = rules[product.category];
  if (!categoryRule) return { minStock: product.minStock };

  return {
    minStock: Math.ceil(product.minStock * (categoryRule.minStockMultiplier || 1))
  };
}

function calculateOptimizedOrder(product: Product, procurement: {
  supplierId: string;
  averageLeadTime: number;
  minimumOrderQuantity: number;
  priceBreaks: Array<{ quantity: number; price: number }>;
}) {
  const sortedBreaks = procurement.priceBreaks.sort((a, b) => a.quantity - b.quantity);
  
  // Find the best price break that meets minimum order quantity
  const optimalBreak = sortedBreaks.find(pb => pb.quantity >= procurement.minimumOrderQuantity) || 
                      sortedBreaks[sortedBreaks.length - 1];

  return {
    quantity: Math.max(optimalBreak.quantity, procurement.minimumOrderQuantity),
    unitPrice: optimalBreak.price,
    totalCost: optimalBreak.quantity * optimalBreak.price,
    supplierId: procurement.supplierId
  };
}

async function updateProductStock(productId: string, newStock: number): Promise<void> {
  await mockServices.supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', productId);
}