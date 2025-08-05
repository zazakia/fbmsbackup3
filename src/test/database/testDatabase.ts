import { vi } from 'vitest';
import { TestDataFactory, InventoryTestData } from '../factories/testDataFactory';
import { mockServices } from '../mocks/mockServices';
import { TestConfig } from '../config/testConfig';
import { Product, Category, Customer, Sale, PurchaseOrder, StockMovement } from '../../types/business';

export interface DatabaseTestState {
  isInitialized: boolean;
  hasData: boolean;
  transactionActive: boolean;
  currentTransaction?: string;
  backupData?: Map<string, any[]>;
}

export interface DatabaseTransaction {
  id: string;
  startTime: Date;
  operations: DatabaseOperation[];
  status: 'active' | 'committed' | 'rolled_back';
}

export interface DatabaseOperation {
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: Date;
}

export class TestDatabaseManager {
  private static instance: TestDatabaseManager;
  private state: DatabaseTestState = {
    isInitialized: false,
    hasData: false,
    transactionActive: false
  };
  private transactions: Map<string, DatabaseTransaction> = new Map();
  private schemas: Map<string, any> = new Map();

  static getInstance(): TestDatabaseManager {
    if (!TestDatabaseManager.instance) {
      TestDatabaseManager.instance = new TestDatabaseManager();
    }
    return TestDatabaseManager.instance;
  }

  async setupTestDatabase(config: TestConfig): Promise<void> {
    console.log(`Setting up test database for ${config.environment} environment`);

    // Reset state
    this.state = {
      isInitialized: false,
      hasData: false,
      transactionActive: false
    };

    // Initialize mock services
    mockServices.reset();

    // Setup database schemas
    await this.setupSchemas();

    // Configure database based on test config
    if (config.database.mockDatabase) {
      await this.setupMockDatabase(config);
    }

    // Seed test data if requested
    if (config.database.seedData) {
      await this.seedTestData(config.database.dataScale);
    }

    // Setup transaction support if enabled
    if (config.database.enableTransactions) {
      this.setupTransactionSupport();
    }

    // Setup Row Level Security if enabled
    if (config.database.enableRLS) {
      this.setupRowLevelSecurity();
    }

    this.state.isInitialized = true;
    console.log('Test database setup completed');
  }

  private async setupSchemas(): Promise<void> {
    // Define table schemas for validation
    this.schemas.set('products', {
      id: 'string',
      name: 'string',
      sku: 'string',
      price: 'number',
      cost: 'number',
      stock: 'number',
      category: 'string',
      isActive: 'boolean',
      created_at: 'date',
      updated_at: 'date'
    });

    this.schemas.set('categories', {
      id: 'string',
      name: 'string',
      description: 'string',
      isActive: 'boolean',
      created_at: 'date'
    });

    this.schemas.set('customers', {
      id: 'string',
      firstName: 'string',
      lastName: 'string',
      email: 'string',
      phone: 'string',
      isActive: 'boolean',
      created_at: 'date',
      updated_at: 'date'
    });

    this.schemas.set('sales', {
      id: 'string',
      invoiceNumber: 'string',
      customerId: 'string',
      total: 'number',
      status: 'string',
      created_at: 'date'
    });

    this.schemas.set('stock_movements', {
      id: 'string',
      productId: 'string',
      type: 'string',
      quantity: 'number',
      reason: 'string',
      performedBy: 'string',
      created_at: 'date'
    });

    console.log('Database schemas initialized');
  }

  private async setupMockDatabase(config: TestConfig): Promise<void> {
    // Configure mock database timeouts
    if (config.database.connectionTimeout) {
      // Mock connection timeout behavior
      vi.spyOn(mockServices.supabase, 'from').mockImplementation((table: string) => {
        const originalFrom = mockServices.supabase.from.bind(mockServices.supabase);
        return originalFrom(table);
      });
    }

    // Setup query timeout simulation
    if (config.database.queryTimeout) {
      mockServices.supabase.setMockDelay(config.database.queryTimeout);
    }

    console.log('Mock database configured');
  }

  private async seedTestData(scale: 'small' | 'medium' | 'large'): Promise<void> {
    console.log(`Seeding test data at ${scale} scale`);

    const testData = TestDataFactory.createLargeDataset(scale);

    // Load data into mock database
    mockServices.supabase.setMockData('products', testData.products);
    mockServices.supabase.setMockData('categories', testData.categories);
    mockServices.supabase.setMockData('customers', testData.customers);
    mockServices.supabase.setMockData('sales', testData.sales);
    mockServices.supabase.setMockData('purchase_orders', testData.purchaseOrders);
    mockServices.supabase.setMockData('stock_movements', testData.stockMovements);
    mockServices.supabase.setMockData('inventory_locations', testData.locations);
    mockServices.supabase.setMockData('stock_transfers', testData.transfers);
    mockServices.supabase.setMockData('stock_alerts', testData.alerts);

    this.state.hasData = true;
    console.log(`Test data seeded: ${testData.products.length} products, ${testData.sales.length} sales, ${testData.stockMovements.length} movements`);
  }

  private setupTransactionSupport(): void {
    // Mock transaction support
    const originalFrom = mockServices.supabase.from.bind(mockServices.supabase);
    
    mockServices.supabase.from = vi.fn().mockImplementation((table: string) => {
      const tableOperations = originalFrom(table);
      
      // Wrap operations with transaction tracking
      return {
        ...tableOperations,
        insert: (data: any) => {
          this.recordOperation('insert', table, data);
          return tableOperations.insert(data);
        },
        update: (data: any) => ({
          eq: (column: string, value: any) => {
            this.recordOperation('update', table, { data, where: { column, value } });
            return tableOperations.update(data).eq(column, value);
          }
        }),
        delete: () => ({
          eq: (column: string, value: any) => {
            this.recordOperation('delete', table, { where: { column, value } });
            return tableOperations.delete().eq(column, value);
          }
        })
      };
    });

    console.log('Transaction support enabled');
  }

  private setupRowLevelSecurity(): void {
    // Mock RLS policies
    const policies = new Map<string, (row: any, user: any) => boolean>();

    // Example RLS policy for products
    policies.set('products', (row: any, user: any) => {
      // Allow all operations for admin users
      if (user?.role === 'admin') return true;
      
      // Allow read for all authenticated users
      if (user?.id) return true;
      
      // Deny for unauthenticated users
      return false;
    });

    // Example RLS policy for sales
    policies.set('sales', (row: any, user: any) => {
      // Allow all operations for admin and managers
      if (['admin', 'manager'].includes(user?.role)) return true;
      
      // Allow cashiers to see their own sales
      if (user?.role === 'cashier' && row.cashierId === user.id) return true;
      
      return false;
    });

    console.log('Row Level Security policies configured');
  }

  async beginTransaction(): Promise<string> {
    const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
    
    // Create backup of current data
    const backup = new Map<string, any[]>();
    ['products', 'categories', 'customers', 'sales', 'stock_movements'].forEach(table => {
      backup.set(table, [...mockServices.supabase.getMockData(table)]);
    });

    const transaction: DatabaseTransaction = {
      id: transactionId,
      startTime: new Date(),
      operations: [],
      status: 'active'
    };

    this.transactions.set(transactionId, transaction);
    this.state.transactionActive = true;
    this.state.currentTransaction = transactionId;
    this.state.backupData = backup;

    console.log(`Transaction ${transactionId} started`);
    return transactionId;
  }

  async commitTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (transaction.status !== 'active') {
      throw new Error(`Transaction ${transactionId} is not active`);
    }

    transaction.status = 'committed';
    this.state.transactionActive = false;
    this.state.currentTransaction = undefined;
    this.state.backupData = undefined;

    console.log(`Transaction ${transactionId} committed with ${transaction.operations.length} operations`);
  }

  async rollbackTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (transaction.status !== 'active') {
      throw new Error(`Transaction ${transactionId} is not active`);
    }

    // Restore data from backup
    if (this.state.backupData) {
      this.state.backupData.forEach((data, table) => {
        mockServices.supabase.setMockData(table, data);
      });
    }

    transaction.status = 'rolled_back';
    this.state.transactionActive = false;
    this.state.currentTransaction = undefined;
    this.state.backupData = undefined;

    console.log(`Transaction ${transactionId} rolled back, ${transaction.operations.length} operations reverted`);
  }

  private recordOperation(type: 'insert' | 'update' | 'delete', table: string, data: any): void {
    if (!this.state.transactionActive || !this.state.currentTransaction) {
      return;
    }

    const transaction = this.transactions.get(this.state.currentTransaction);
    if (transaction) {
      transaction.operations.push({
        type,
        table,
        data,
        timestamp: new Date()
      });
    }
  }

  async validateDataIntegrity(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate foreign key relationships
    const products = mockServices.supabase.getMockData('products');
    const categories = mockServices.supabase.getMockData('categories');
    const sales = mockServices.supabase.getMockData('sales');
    const stockMovements = mockServices.supabase.getMockData('stock_movements');

    // Check product-category relationships
    const categoryIds = new Set(categories.map((c: any) => c.id));
    products.forEach((product: any) => {
      if (product.categoryId && !categoryIds.has(product.categoryId)) {
        errors.push(`Product ${product.id} references non-existent category ${product.categoryId}`);
      }
    });

    // Check stock movement-product relationships
    const productIds = new Set(products.map((p: any) => p.id));
    stockMovements.forEach((movement: any) => {
      if (!productIds.has(movement.productId)) {
        errors.push(`Stock movement ${movement.id} references non-existent product ${movement.productId}`);
      }
    });

    // Validate data types according to schema
    for (const [tableName, tableData] of [
      ['products', products],
      ['categories', categories],
      ['sales', sales],
      ['stock_movements', stockMovements]
    ]) {
      const schema = this.schemas.get(tableName);
      if (schema) {
        (tableData as any[]).forEach((row: any) => {
          Object.entries(schema).forEach(([field, expectedType]) => {
            if (row[field] !== undefined && row[field] !== null) {
              const actualType = typeof row[field];
              if (expectedType === 'date' && !(row[field] instanceof Date)) {
                errors.push(`${tableName}.${field} should be a Date, got ${actualType}`);
              } else if (expectedType !== 'date' && actualType !== expectedType) {
                errors.push(`${tableName}.${field} should be ${expectedType}, got ${actualType}`);
              }
            }
          });
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async cleanupTestDatabase(): Promise<void> {
    console.log('Cleaning up test database');

    // Rollback any active transactions
    if (this.state.transactionActive && this.state.currentTransaction) {
      await this.rollbackTransaction(this.state.currentTransaction);
    }

    // Clear all data
    mockServices.reset();

    // Clear transactions
    this.transactions.clear();

    // Reset state
    this.state = {
      isInitialized: false,
      hasData: false,
      transactionActive: false
    };

    console.log('Test database cleanup completed');
  }

  async createTestSnapshot(): Promise<string> {
    const snapshotId = `snapshot-${Date.now()}`;
    const snapshot = new Map<string, any[]>();

    ['products', 'categories', 'customers', 'sales', 'stock_movements'].forEach(table => {
      snapshot.set(table, [...mockServices.supabase.getMockData(table)]);
    });

    // Store snapshot (in a real implementation, this might be saved to disk)
    (this as any)[`snapshot_${snapshotId}`] = snapshot;

    console.log(`Test snapshot ${snapshotId} created`);
    return snapshotId;
  }

  async restoreTestSnapshot(snapshotId: string): Promise<void> {
    const snapshot = (this as any)[`snapshot_${snapshotId}`];
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }

    snapshot.forEach((data: any[], table: string) => {
      mockServices.supabase.setMockData(table, [...data]);
    });

    console.log(`Test snapshot ${snapshotId} restored`);
  }

  getState(): DatabaseTestState {
    return { ...this.state };
  }

  getTransactions(): DatabaseTransaction[] {
    return Array.from(this.transactions.values());
  }

  async executeRawQuery(query: string, params?: any[]): Promise<any> {
    // Mock raw query execution for testing
    console.log(`Executing raw query: ${query}`, params);
    
    // This would be implemented based on your specific needs
    // For now, return a mock result
    return { data: [], error: null };
  }

  async getTableStats(): Promise<Record<string, { count: number; size: number }>> {
    const stats: Record<string, { count: number; size: number }> = {};

    ['products', 'categories', 'customers', 'sales', 'stock_movements'].forEach(table => {
      const data = mockServices.supabase.getMockData(table);
      stats[table] = {
        count: data.length,
        size: JSON.stringify(data).length
      };
    });

    return stats;
  }
}

// Convenience functions
export const testDb = TestDatabaseManager.getInstance();

export async function setupTestDatabase(config: TestConfig): Promise<void> {
  return testDb.setupTestDatabase(config);
}

export async function cleanupTestDatabase(): Promise<void> {
  return testDb.cleanupTestDatabase();
}

export async function beginTransaction(): Promise<string> {
  return testDb.beginTransaction();
}

export async function commitTransaction(transactionId: string): Promise<void> {
  return testDb.commitTransaction(transactionId);
}

export async function rollbackTransaction(transactionId: string): Promise<void> {
  return testDb.rollbackTransaction(transactionId);
}

export async function validateDataIntegrity(): Promise<{ isValid: boolean; errors: string[] }> {
  return testDb.validateDataIntegrity();
}

export async function createTestSnapshot(): Promise<string> {
  return testDb.createTestSnapshot();
}

export async function restoreTestSnapshot(snapshotId: string): Promise<void> {
  return testDb.restoreTestSnapshot(snapshotId);
}