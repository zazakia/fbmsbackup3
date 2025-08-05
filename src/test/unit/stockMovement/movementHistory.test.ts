import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestDataFactory, mockServices, setupTestEnvironment, cleanupTestData } from '../../setup';
import { Product, StockMovement, ProductMovementHistory } from '../../../types/business';

describe('Stock Movement History Recording and Audit Trails - MAXIMUM POWER! ⚡', () => {
  let testProducts: Product[];
  let testMovements: StockMovement[];

  beforeEach(async () => {
    await setupTestEnvironment({ mockDatabase: true, loadTestData: true, testDataScale: 'medium' });
    
    testProducts = Array.from({ length: 20 }, () => TestDataFactory.createProduct());
    testMovements = Array.from({ length: 100 }, () => TestDataFactory.createStockMovement());
    
    mockServices.supabase.setMockData('products', testProducts);
    mockServices.supabase.setMockData('stock_movements', testMovements);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Movement Recording 📝', () => {
    it('should record stock movements with COMPLETE details! 🎯', async () => {
      const product = testProducts[0];
      const movementData = {
        productId: product.id,
        type: 'stock_in' as const,
        quantity: 500,
        reason: 'Purchase receipt',
        performedBy: 'warehouse-manager',
        referenceId: 'PO-2024-001',
        batchNumber: 'BATCH-001',
        cost: 25.50,
        notes: 'High quality batch from premium supplier'
      };

      const result = await recordStockMovement(movementData);

      expect(result.success).toBe(true);
      expect(result.movement).toMatchObject({
        productId: product.id,
        type: 'stock_in',
        quantity: 500,
        reason: 'Purchase receipt',
        performedBy: 'warehouse-manager',
        referenceId: 'PO-2024-001',
        batchNumber: 'BATCH-001',
        cost: 25.50,
        notes: 'High quality batch from premium supplier'
      });
      expect(result.movement.id).toBeDefined();
      expect(result.movement.createdAt).toBeInstanceOf(Date);
    });

    it('should auto-generate movement IDs like a MACHINE! 🤖', async () => {
      const movements = [];
      
      for (let i = 0; i < 1000; i++) {
        const result = await recordStockMovement({
          productId: testProducts[i % testProducts.length].id,
          type: 'adjustment',
          quantity: Math.floor(Math.random() * 100) + 1,
          reason: `Bulk test ${i}`,
          performedBy: 'test-system'
        });
        
        movements.push(result.movement.id);
      }

      // All IDs should be unique
      const uniqueIds = new Set(movements);
      expect(uniqueIds.size).toBe(1000);
    });

    it('should capture timestamps with PRECISION! ⏰', async () => {
      const beforeTime = new Date();
      
      const result = await recordStockMovement({
        productId: testProducts[0].id,
        type: 'stock_out',
        quantity: 10,
        reason: 'Sale',
        performedBy: 'cashier'
      });

      const afterTime = new Date();

      expect(result.movement.createdAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(result.movement.createdAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('Movement Types and Categories 🏷️', () => {
    it('should handle ALL movement types like a CHAMPION! 🏆', async () => {
      const movementTypes = [
        'stock_in', 'stock_out', 'adjustment', 'transfer', 'return',
        'damage_out', 'expired_out', 'recount', 'initial_stock'
      ];

      const results = [];
      
      for (const type of movementTypes) {
        const result = await recordStockMovement({
          productId: testProducts[0].id,
          type: type as any,
          quantity: 50,
          reason: `Testing ${type}`,
          performedBy: 'test-user'
        });
        
        results.push(result);
      }

      expect(results.every(r => r.success)).toBe(true);
      expect(results.map(r => r.movement.type)).toEqual(movementTypes);
    });

    it('should categorize movements by business context', async () => {
      const businessMovements = [
        { type: 'stock_in', category: 'receiving', reason: 'Purchase order receipt' },
        { type: 'stock_out', category: 'sales', reason: 'Customer purchase' },
        { type: 'transfer_out', category: 'logistics', reason: 'Inter-location transfer' },
        { type: 'adjustment_in', category: 'inventory', reason: 'Physical count correction' },
        { type: 'return_in', category: 'returns', reason: 'Customer return' },
        { type: 'damage_out', category: 'loss', reason: 'Product damaged during handling' }
      ];

      const results = [];
      
      for (const movement of businessMovements) {
        const result = await recordStockMovement({
          productId: testProducts[0].id,
          type: movement.type as any,
          quantity: 25,
          reason: movement.reason,
          performedBy: 'business-user',
          category: movement.category
        });
        
        results.push(result);
      }

      expect(results.every(r => r.success)).toBe(true);
      results.forEach((result, index) => {
        expect(result.movement.category).toBe(businessMovements[index].category);
      });
    });
  });

  describe('Audit Trail Generation 🔍', () => {
    it('should create COMPREHENSIVE audit trails! 📊', async () => {
      const product = testProducts[0];
      const userId = 'audit-test-user';
      
      // Create a series of movements
      const movements = [
        { type: 'initial_stock', quantity: 1000, reason: 'Initial inventory' },
        { type: 'stock_out', quantity: 150, reason: 'Sale #001' },
        { type: 'stock_out', quantity: 200, reason: 'Sale #002' },
        { type: 'stock_in', quantity: 500, reason: 'Purchase order' },
        { type: 'adjustment_out', quantity: 50, reason: 'Damaged goods' },
        { type: 'stock_out', quantity: 300, reason: 'Bulk sale' }
      ];

      for (const movement of movements) {
        await recordStockMovement({
          productId: product.id,
          type: movement.type as any,
          quantity: movement.quantity,
          reason: movement.reason,
          performedBy: userId
        });
      }

      const auditTrail = await generateAuditTrail(product.id);

      expect(auditTrail.movements).toHaveLength(6);
      expect(auditTrail.totalStockIn).toBe(1500); // 1000 + 500
      expect(auditTrail.totalStockOut).toBe(700); // 150 + 200 + 300 + 50
      expect(auditTrail.netChange).toBe(800); // 1500 - 700
      expect(auditTrail.movementCount).toBe(6);
    });

    it('should track user activity patterns', async () => {
      const users = ['user-a', 'user-b', 'user-c'];
      const product = testProducts[0];

      // Create movements by different users
      for (let i = 0; i < 30; i++) {
        await recordStockMovement({
          productId: product.id,
          type: i % 2 === 0 ? 'stock_in' : 'stock_out',
          quantity: Math.floor(Math.random() * 100) + 1,
          reason: `Activity ${i}`,
          performedBy: users[i % users.length]
        });
      }

      const userActivity = await getUserActivityReport(product.id);

      expect(userActivity).toHaveLength(3);
      userActivity.forEach(activity => {
        expect(users).toContain(activity.userId);
        expect(activity.movementCount).toBeGreaterThan(0);
        expect(activity.totalQuantity).toBeGreaterThan(0);
      });
    });

    it('should detect suspicious patterns like a DETECTIVE! 🕵️', async () => {
      const product = testProducts[0];
      const suspiciousUser = 'suspicious-user';

      // Create suspicious pattern: large adjustments at odd hours
      const suspiciousMovements = Array.from({ length: 10 }, (_, i) => ({
        productId: product.id,
        type: 'adjustment_out' as const,
        quantity: 500 + i * 100, // Increasingly large adjustments
        reason: 'System adjustment',
        performedBy: suspiciousUser,
        timestamp: new Date(Date.now() - (i * 3600000)) // Every hour
      }));

      for (const movement of suspiciousMovements) {
        await recordStockMovement(movement);
      }

      const suspiciousActivity = await detectSuspiciousActivity(product.id);

      expect(suspiciousActivity.flagged).toBe(true);
      expect(suspiciousActivity.reasons).toContain('Large frequent adjustments');
      expect(suspiciousActivity.reasons).toContain('Single user pattern');
      expect(suspiciousActivity.riskScore).toBeGreaterThan(7); // High risk
    });
  });

  describe('Historical Analysis 📈', () => {
    it('should analyze movement trends over time', async () => {
      const product = testProducts[0];
      const daysBack = 30;

      // Create historical data
      for (let day = 0; day < daysBack; day++) {
        const date = new Date(Date.now() - (day * 24 * 60 * 60 * 1000));
        
        // Random movements per day
        const movementsPerDay = Math.floor(Math.random() * 10) + 1;
        
        for (let i = 0; i < movementsPerDay; i++) {
          await recordStockMovement({
            productId: product.id,
            type: Math.random() > 0.5 ? 'stock_in' : 'stock_out',
            quantity: Math.floor(Math.random() * 100) + 1,
            reason: `Daily activity ${day}-${i}`,
            performedBy: 'historical-user',
            timestamp: date
          });
        }
      }

      const trends = await analyzeMovementTrends(product.id, daysBack);

      expect(trends.dailyAverages.stockIn).toBeGreaterThan(0);
      expect(trends.dailyAverages.stockOut).toBeGreaterThan(0);
      expect(trends.peakDays).toBeDefined();
      expect(trends.quietDays).toBeDefined();
      expect(trends.trendDirection).toMatch(/increasing|decreasing|stable/);
    });

    it('should calculate velocity metrics like LIGHTNING! ⚡', async () => {
      const product = testProducts[0];
      const testPeriod = 7; // 7 days

      // Create consistent daily movements
      for (let day = 0; day < testPeriod; day++) {
        const date = new Date(Date.now() - (day * 24 * 60 * 60 * 1000));
        
        // Consistent pattern: 100 in, 80 out per day
        await recordStockMovement({
          productId: product.id,
          type: 'stock_in',
          quantity: 100,
          reason: `Daily receipt ${day}`,
          performedBy: 'velocity-test',
          timestamp: date
        });

        await recordStockMovement({
          productId: product.id,
          type: 'stock_out',
          quantity: 80,
          reason: `Daily sales ${day}`,
          performedBy: 'velocity-test',
          timestamp: date
        });
      }

      const velocity = await calculateStockVelocity(product.id, testPeriod);

      expect(velocity.averageDailyIn).toBeCloseTo(100, 1);
      expect(velocity.averageDailyOut).toBeCloseTo(80, 1);
      expect(velocity.netDailyChange).toBeCloseTo(20, 1);
      expect(velocity.turnoverRate).toBeGreaterThan(0);
    });
  });

  describe('Data Integrity and Validation 🛡️', () => {
    it('should validate movement data integrity', async () => {
      const invalidMovements = [
        { productId: '', type: 'stock_in', quantity: 100, reason: 'Test' },
        { productId: 'valid-id', type: 'invalid-type', quantity: 100, reason: 'Test' },
        { productId: 'valid-id', type: 'stock_in', quantity: -100, reason: 'Test' },
        { productId: 'valid-id', type: 'stock_in', quantity: 100, reason: '' },
        { productId: 'valid-id', type: 'stock_in', quantity: 100.5, reason: 'Test' }
      ];

      const results = [];
      
      for (const movement of invalidMovements) {
        const result = await recordStockMovement(movement as any);
        results.push(result);
      }

      expect(results.every(r => !r.success)).toBe(true);
      expect(results[0].error).toContain('Product ID is required');
      expect(results[1].error).toContain('Invalid movement type');
      expect(results[2].error).toContain('Quantity must be positive');
      expect(results[3].error).toContain('Reason is required');
      expect(results[4].error).toContain('Quantity must be a whole number');
    });

    it('should prevent duplicate movement IDs', async () => {
      const movementId = 'duplicate-test-id';
      
      const movement1 = await recordStockMovement({
        id: movementId,
        productId: testProducts[0].id,
        type: 'stock_in',
        quantity: 100,
        reason: 'First movement',
        performedBy: 'test-user'
      });

      const movement2 = await recordStockMovement({
        id: movementId,
        productId: testProducts[0].id,
        type: 'stock_out',
        quantity: 50,
        reason: 'Second movement',
        performedBy: 'test-user'
      });

      expect(movement1.success).toBe(true);
      expect(movement2.success).toBe(false);
      expect(movement2.error).toBe('Movement ID already exists');
    });

    it('should maintain referential integrity', async () => {
      const nonExistentProductId = 'non-existent-product';
      
      const result = await recordStockMovement({
        productId: nonExistentProductId,
        type: 'stock_in',
        quantity: 100,
        reason: 'Test movement',
        performedBy: 'test-user'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Product not found');
    });
  });

  describe('Performance and Scalability 🚀', () => {
    it('should handle MASSIVE movement volumes! 💪', async () => {
      const movementCount = 50000;
      const batchSize = 1000;
      const batches = Math.ceil(movementCount / batchSize);

      const startTime = performance.now();

      for (let batch = 0; batch < batches; batch++) {
        const batchMovements = [];
        
        for (let i = 0; i < batchSize && (batch * batchSize + i) < movementCount; i++) {
          batchMovements.push({
            productId: testProducts[(batch * batchSize + i) % testProducts.length].id,
            type: i % 2 === 0 ? 'stock_in' : 'stock_out',
            quantity: Math.floor(Math.random() * 100) + 1,
            reason: `Bulk movement ${batch}-${i}`,
            performedBy: 'performance-test'
          });
        }

        await batchRecordMovements(batchMovements);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(30000); // Should complete in under 30 seconds
      
      // Verify all movements were recorded
      const totalMovements = await getMovementCount();
      expect(totalMovements).toBeGreaterThanOrEqual(movementCount);
    });

    it('should optimize query performance for large datasets', async () => {
      const product = testProducts[0];
      
      // Create large movement history
      const movements = Array.from({ length: 10000 }, (_, i) => ({
        productId: product.id,
        type: i % 3 === 0 ? 'stock_in' : i % 3 === 1 ? 'stock_out' : 'adjustment',
        quantity: Math.floor(Math.random() * 100) + 1,
        reason: `Performance test ${i}`,
        performedBy: 'perf-user'
      }));

      await batchRecordMovements(movements);

      // Test query performance
      const startTime = performance.now();
      const history = await getMovementHistory(product.id, { limit: 1000 });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
      expect(history.movements).toHaveLength(1000);
    });
  });
});

// Helper functions for movement history
interface MovementData {
  id?: string;
  productId: string;
  type: string;
  quantity: number;
  reason: string;
  performedBy: string;
  referenceId?: string;
  batchNumber?: string;
  cost?: number;
  notes?: string;
  category?: string;
  timestamp?: Date;
}

interface MovementResult {
  success: boolean;
  movement?: StockMovement;
  error?: string;
}

async function recordStockMovement(data: MovementData): Promise<MovementResult> {
  try {
    // Validation
    if (!data.productId || data.productId.trim() === '') {
      return { success: false, error: 'Product ID is required' };
    }

    const validTypes = ['stock_in', 'stock_out', 'adjustment', 'transfer', 'return', 
                       'damage_out', 'expired_out', 'recount', 'initial_stock',
                       'transfer_out', 'transfer_in', 'adjustment_in', 'adjustment_out', 'return_in'];
    
    if (!validTypes.includes(data.type)) {
      return { success: false, error: 'Invalid movement type' };
    }

    if (data.quantity <= 0) {
      return { success: false, error: 'Quantity must be positive' };
    }

    if (data.quantity % 1 !== 0) {
      return { success: false, error: 'Quantity must be a whole number' };
    }

    if (!data.reason || data.reason.trim() === '') {
      return { success: false, error: 'Reason is required' };
    }

    // Check if product exists
    const productCheck = await mockServices.supabase
      .from('products')
      .select('id')
      .eq('id', data.productId)
      .single();

    if (!productCheck.data) {
      return { success: false, error: 'Product not found' };
    }

    // Check for duplicate ID if provided
    if (data.id) {
      const existingMovement = await mockServices.supabase
        .from('stock_movements')
        .select('id')
        .eq('id', data.id)
        .single();

      if (existingMovement.data) {
        return { success: false, error: 'Movement ID already exists' };
      }
    }

    // Create movement record
    const movement: StockMovement = {
      id: data.id || `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      productId: data.productId,
      type: data.type as any,
      quantity: data.quantity,
      reason: data.reason,
      performedBy: data.performedBy,
      referenceId: data.referenceId,
      batchNumber: data.batchNumber,
      cost: data.cost,
      notes: data.notes,
      createdAt: data.timestamp || new Date()
    };

    // Add category if provided
    (movement as any).category = data.category;

    await mockServices.supabase
      .from('stock_movements')
      .insert(movement);

    return { success: true, movement };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

async function batchRecordMovements(movements: MovementData[]): Promise<void> {
  const batchSize = 100;
  
  for (let i = 0; i < movements.length; i += batchSize) {
    const batch = movements.slice(i, i + batchSize);
    const promises = batch.map(movement => recordStockMovement(movement));
    await Promise.all(promises);
  }
}

interface AuditTrail {
  productId: string;
  movements: StockMovement[];
  totalStockIn: number;
  totalStockOut: number;
  netChange: number;
  movementCount: number;
  dateRange: { start: Date; end: Date };
}

async function generateAuditTrail(productId: string): Promise<AuditTrail> {
  const movements = await mockServices.supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: true });

  const movementData = movements.data || [];
  
  let totalStockIn = 0;
  let totalStockOut = 0;

  movementData.forEach(movement => {
    if (['stock_in', 'adjustment_in', 'return_in', 'initial_stock'].includes(movement.type)) {
      totalStockIn += movement.quantity;
    } else {
      totalStockOut += movement.quantity;
    }
  });

  return {
    productId,
    movements: movementData,
    totalStockIn,
    totalStockOut,
    netChange: totalStockIn - totalStockOut,
    movementCount: movementData.length,
    dateRange: {
      start: movementData.length > 0 ? new Date(movementData[0].created_at) : new Date(),
      end: movementData.length > 0 ? new Date(movementData[movementData.length - 1].created_at) : new Date()
    }
  };
}

interface UserActivity {
  userId: string;
  movementCount: number;
  totalQuantity: number;
  lastActivity: Date;
}

async function getUserActivityReport(productId: string): Promise<UserActivity[]> {
  const movements = await mockServices.supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', productId);

  const userMap = new Map<string, UserActivity>();

  (movements.data || []).forEach(movement => {
    const userId = movement.performed_by;
    const existing = userMap.get(userId) || {
      userId,
      movementCount: 0,
      totalQuantity: 0,
      lastActivity: new Date(movement.created_at)
    };

    existing.movementCount++;
    existing.totalQuantity += movement.quantity;
    
    const movementDate = new Date(movement.created_at);
    if (movementDate > existing.lastActivity) {
      existing.lastActivity = movementDate;
    }

    userMap.set(userId, existing);
  });

  return Array.from(userMap.values());
}

interface SuspiciousActivity {
  flagged: boolean;
  reasons: string[];
  riskScore: number;
  suspiciousMovements: StockMovement[];
}

async function detectSuspiciousActivity(productId: string): Promise<SuspiciousActivity> {
  const movements = await mockServices.supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(50); // Check recent movements

  const movementData = movements.data || [];
  const reasons: string[] = [];
  const suspiciousMovements: StockMovement[] = [];
  let riskScore = 0;

  // Check for large frequent adjustments
  const adjustments = movementData.filter(m => m.type.includes('adjustment'));
  if (adjustments.length > 5) {
    const avgQuantity = adjustments.reduce((sum, m) => sum + m.quantity, 0) / adjustments.length;
    if (avgQuantity > 100) {
      reasons.push('Large frequent adjustments');
      riskScore += 3;
      suspiciousMovements.push(...adjustments.slice(0, 5));
    }
  }

  // Check for single user pattern
  const userCounts = new Map<string, number>();
  movementData.forEach(m => {
    userCounts.set(m.performed_by, (userCounts.get(m.performed_by) || 0) + 1);
  });

  const dominantUser = Array.from(userCounts.entries())
    .sort((a, b) => b[1] - a[1])[0];

  if (dominantUser && dominantUser[1] > movementData.length * 0.8) {
    reasons.push('Single user pattern');
    riskScore += 2;
  }

  // Check for unusual timing patterns
  const hourCounts = new Map<number, number>();
  movementData.forEach(m => {
    const hour = new Date(m.created_at).getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
  });

  const nightMovements = Array.from(hourCounts.entries())
    .filter(([hour]) => hour < 6 || hour > 22)
    .reduce((sum, [, count]) => sum + count, 0);

  if (nightMovements > movementData.length * 0.3) {
    reasons.push('Unusual timing pattern');
    riskScore += 2;
  }

  return {
    flagged: riskScore >= 5,
    reasons,
    riskScore,
    suspiciousMovements
  };
}

interface MovementTrends {
  dailyAverages: {
    stockIn: number;
    stockOut: number;
    netChange: number;
  };
  peakDays: Date[];
  quietDays: Date[];
  trendDirection: 'increasing' | 'decreasing' | 'stable';
}

async function analyzeMovementTrends(productId: string, daysBack: number): Promise<MovementTrends> {
  const cutoffDate = new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000));
  
  const movements = await mockServices.supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', productId)
    .gte('created_at', cutoffDate.toISOString());

  const movementData = movements.data || [];
  const dailyData = new Map<string, { stockIn: number; stockOut: number }>();

  movementData.forEach(movement => {
    const dateKey = new Date(movement.created_at).toDateString();
    const existing = dailyData.get(dateKey) || { stockIn: 0, stockOut: 0 };

    if (['stock_in', 'adjustment_in', 'return_in'].includes(movement.type)) {
      existing.stockIn += movement.quantity;
    } else {
      existing.stockOut += movement.quantity;
    }

    dailyData.set(dateKey, existing);
  });

  const dailyValues = Array.from(dailyData.values());
  const avgStockIn = dailyValues.reduce((sum, d) => sum + d.stockIn, 0) / dailyValues.length || 0;
  const avgStockOut = dailyValues.reduce((sum, d) => sum + d.stockOut, 0) / dailyValues.length || 0;

  // Find peak and quiet days
  const sortedDays = Array.from(dailyData.entries())
    .sort((a, b) => (b[1].stockIn + b[1].stockOut) - (a[1].stockIn + a[1].stockOut));

  const peakDays = sortedDays.slice(0, 3).map(([date]) => new Date(date));
  const quietDays = sortedDays.slice(-3).map(([date]) => new Date(date));

  // Determine trend direction
  const firstHalf = dailyValues.slice(0, Math.floor(dailyValues.length / 2));
  const secondHalf = dailyValues.slice(Math.floor(dailyValues.length / 2));

  const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.stockIn + d.stockOut, 0) / firstHalf.length || 0;
  const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.stockIn + d.stockOut, 0) / secondHalf.length || 0;

  let trendDirection: 'increasing' | 'decreasing' | 'stable';
  const changePercent = Math.abs((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

  if (changePercent < 10) {
    trendDirection = 'stable';
  } else if (secondHalfAvg > firstHalfAvg) {
    trendDirection = 'increasing';
  } else {
    trendDirection = 'decreasing';
  }

  return {
    dailyAverages: {
      stockIn: avgStockIn,
      stockOut: avgStockOut,
      netChange: avgStockIn - avgStockOut
    },
    peakDays,
    quietDays,
    trendDirection
  };
}

interface StockVelocity {
  averageDailyIn: number;
  averageDailyOut: number;
  netDailyChange: number;
  turnoverRate: number;
}

async function calculateStockVelocity(productId: string, days: number): Promise<StockVelocity> {
  const cutoffDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
  
  const movements = await mockServices.supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', productId)
    .gte('created_at', cutoffDate.toISOString());

  const movementData = movements.data || [];
  
  let totalIn = 0;
  let totalOut = 0;

  movementData.forEach(movement => {
    if (['stock_in', 'adjustment_in', 'return_in'].includes(movement.type)) {
      totalIn += movement.quantity;
    } else {
      totalOut += movement.quantity;
    }
  });

  const averageDailyIn = totalIn / days;
  const averageDailyOut = totalOut / days;
  const netDailyChange = averageDailyIn - averageDailyOut;

  // Get current stock for turnover calculation
  const product = await mockServices.supabase
    .from('products')
    .select('stock')
    .eq('id', productId)
    .single();

  const currentStock = product.data?.stock || 0;
  const turnoverRate = currentStock > 0 ? averageDailyOut / currentStock : 0;

  return {
    averageDailyIn,
    averageDailyOut,
    netDailyChange,
    turnoverRate
  };
}

async function getMovementHistory(productId: string, options: { limit?: number } = {}): Promise<{ movements: StockMovement[] }> {
  let query = mockServices.supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const result = await query;
  return { movements: result.data || [] };
}

async function getMovementCount(): Promise<number> {
  const result = await mockServices.supabase
    .from('stock_movements')
    .select('id');

  return (result.data || []).length;
}