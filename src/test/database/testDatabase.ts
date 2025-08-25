import { vi } from 'vitest';
import { TestDataFactory } from '../factories/testDataFactory';
import { mockSupabaseModule } from '../mocks/supabaseMock';

interface TestDatabaseState {
  tables: Record<string, any[]>;
  transactions: any[];
  snapshots: Record<string, Record<string, any[]>>;
}

export class TestDatabase {
  private state: TestDatabaseState;
  private isIsolated: boolean = false;
  private snapshotCounter: number = 0;

  constructor() {
    this.state = {
      tables: {
        products: [],
        customers: [],
        sales: [],
        purchase_orders: [],
        suppliers: [],
        users: [],
        accounts: [],
        receipts: [],
        inventory_movements: [],
        journal_entries: []  
      },
      transactions: [],
      snapshots: {}
    };
  }

  // Initialize test database with sample data
  async initializeTestData() {
    console.log('🔧 Initializing test database...');

    // Create sample Philippine business data
    this.state.tables.products = TestDataFactory.createProductsBatch(10);
    this.state.tables.customers = TestDataFactory.createCustomersBatch(5);
    this.state.tables.suppliers = Array.from({ length: 3 }, () => TestDataFactory.createSupplier());
    this.state.tables.users = TestDataFactory.createUsersBatch(3);
    this.state.tables.accounts = Array.from({ length: 8 }, () => TestDataFactory.createAccount());

    console.log('✅ Test database initialized with sample data');
    return this.state;
  }

  // Create database snapshot for rollback
  createSnapshot(name: string = `snapshot_${++this.snapshotCounter}`) {
    console.log(`📸 Creating database snapshot: ${name}`);
    this.state.snapshots[name] = JSON.parse(JSON.stringify(this.state.tables));
    return name;
  }

  // Restore database from snapshot
  restoreSnapshot(name: string) {
    if (this.state.snapshots[name]) {
      console.log(`🔄 Restoring database snapshot: ${name}`);
      this.state.tables = JSON.parse(JSON.stringify(this.state.snapshots[name]));
      return true;
    }
    console.warn(`⚠️ Snapshot not found: ${name}`);
    return false;
  }

  // Start database isolation for test
  async startIsolation() {
    if (this.isIsolated) {
      console.warn('⚠️ Database is already isolated');
      return;
    }

    console.log('🔒 Starting database isolation');
    this.createSnapshot('isolation_start');
    this.isIsolated = true;

    // Mock Supabase operations to use our test database
    this.mockSupabaseOperations();
  }

  // End database isolation and cleanup
  async endIsolation() {
    if (!this.isIsolated) {
      console.warn('⚠️ Database is not isolated');
      return;
    }

    console.log('🔓 Ending database isolation');
    this.restoreSnapshot('isolation_start');
    this.isIsolated = false;

    // Clear test data
    await this.cleanup();
  }

  // Mock Supabase operations to work with test database
  private mockSupabaseOperations() {
    const mockSupabase = mockSupabaseModule.supabase;

    // Override from method to interact with test database
    mockSupabase.from = vi.fn((tableName: string) => {
      const tableData = this.state.tables[tableName] || [];

      return {
        // SELECT operations
        select: vi.fn(() => ({
          eq: vi.fn((column: string, value: any) => ({
            single: vi.fn(() => {
              const item = tableData.find(row => row[column] === value);
              return Promise.resolve({ data: item || null, error: null });
            }),
            then: vi.fn((callback: any) => {
              const items = tableData.filter(row => row[column] === value);
              return Promise.resolve({ data: items, error: null }).then(callback);
            })
          })),
          order: vi.fn(() => ({
            then: vi.fn((callback: any) => {
              return Promise.resolve({ data: [...tableData], error: null }).then(callback);
            })
          })),
          then: vi.fn((callback: any) => {
            return Promise.resolve({ data: [...tableData], error: null }).then(callback);
          })
        })),

        // INSERT operations
        insert: vi.fn((data: any) => ({
          select: vi.fn(() => ({
            single: vi.fn(() => {
              const newItem = Array.isArray(data) ? data[0] : data;
              const itemWithId = { id: TestDataFactory.getNextId('test'), ...newItem };
              tableData.push(itemWithId);
              console.log(`➕ Inserted into ${tableName}:`, itemWithId);
              return Promise.resolve({ data: itemWithId, error: null });
            })
          }))
        })),

        // UPDATE operations  
        update: vi.fn((updates: any) => ({
          eq: vi.fn((column: string, value: any) => ({
            select: vi.fn(() => ({
              single: vi.fn(() => {
                const itemIndex = tableData.findIndex(row => row[column] === value);
                if (itemIndex !== -1) {
                  tableData[itemIndex] = { ...tableData[itemIndex], ...updates };
                  console.log(`✏️ Updated in ${tableName}:`, tableData[itemIndex]);
                  return Promise.resolve({ data: tableData[itemIndex], error: null });
                }
                return Promise.resolve({ data: null, error: { message: 'Record not found' } });
              })
            }))
          }))
        })),

        // DELETE operations
        delete: vi.fn(() => ({
          eq: vi.fn((column: string, value: any) => {
            const itemIndex = tableData.findIndex(row => row[column] === value);
            if (itemIndex !== -1) {
              const deletedItem = tableData.splice(itemIndex, 1)[0];
              console.log(`🗑️ Deleted from ${tableName}:`, deletedItem);
              return Promise.resolve({ data: null, error: null });
            }
            return Promise.resolve({ data: null, error: { message: 'Record not found' } });
          })
        }))
      };
    });
  }

  // Get test data from table
  getTableData(tableName: string) {
    return this.state.tables[tableName] || [];
  }

  // Add test data to table
  addTableData(tableName: string, data: any) {
    if (!this.state.tables[tableName]) {
      this.state.tables[tableName] = [];
    }
    this.state.tables[tableName].push(data);
  }

  // Clear table data
  clearTable(tableName: string) {
    this.state.tables[tableName] = [];
    console.log(`🧹 Cleared table: ${tableName}`);
  }

  // Clear all tables
  clearAllTables() {
    Object.keys(this.state.tables).forEach(tableName => {
      this.state.tables[tableName] = [];
    });
    console.log('🧹 Cleared all tables');
  }

  // Cleanup test database
  async cleanup() {
    console.log('🧹 Cleaning up test database...');

    // Clear all tables
    this.clearAllTables();

    // Clear transactions
    this.state.transactions = [];

    // Clear snapshots
    this.state.snapshots = {};

    // Reset counter
    TestDataFactory.resetIdCounter();

    console.log('✅ Test database cleanup completed');
  }

  // Verify database state
  verifyState() {
    const report = {
      totalTables: Object.keys(this.state.tables).length,
      totalRecords: Object.values(this.state.tables).reduce((sum, table) => sum + table.length, 0),
      tableStats: Object.entries(this.state.tables).map(([name, data]) => ({
        table: name,
        count: data.length
      })),
      snapshots: Object.keys(this.state.snapshots).length,
      isIsolated: this.isIsolated
    };

    console.log('📊 Database state report:', report);
    return report;
  }

  // Transaction simulation
  async runTransaction(operations: () => Promise<void>) {
    const transactionId = TestDataFactory.getNextId('txn');
    const beforeSnapshot = `txn_before_${transactionId}`;

    try {
      console.log(`🔄 Starting transaction: ${transactionId}`);
      this.createSnapshot(beforeSnapshot);

      await operations();

      console.log(`✅ Transaction completed: ${transactionId}`);
      return { success: true, transactionId };
    } catch (error) {
      console.error(`❌ Transaction failed: ${transactionId}`, error);
      this.restoreSnapshot(beforeSnapshot);
      return { success: false, error, transactionId };
    }
  }

  // Performance testing helpers
  async performanceBenchmark(operation: () => Promise<void>, iterations: number = 100) {
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      await operation();
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    const results = {
      iterations,
      totalTime: Math.round(totalTime * 100) / 100,
      averageTime: Math.round(avgTime * 100) / 100,
      operationsPerSecond: Math.round((iterations / totalTime) * 1000 * 100) / 100
    };

    console.log('⚡ Performance benchmark results:', results);
    return results;
  }
}

// Singleton instance for global use
export const testDb = new TestDatabase();

// Test environment setup helper
export class TestEnvironment {
  private static instance: TestEnvironment;
  private isSetup: boolean = false;

  static getInstance() {
    if (!TestEnvironment.instance) {
      TestEnvironment.instance = new TestEnvironment();
    }
    return TestEnvironment.instance;
  }

  async setupTestEnvironment(options: {
    mockDatabase?: boolean;
    mockPayments?: boolean;
    mockNotifications?: boolean;
    mockReporting?: boolean;
    loadTestData?: boolean;
  } = {}) {
    if (this.isSetup) {
      console.log('✅ Test environment already setup');
      return;
    }

    console.log('🔧 Setting up test environment...');

    if (options.mockDatabase !== false) {
      await testDb.initializeTestData();
      await testDb.startIsolation();
    }

    if (options.loadTestData !== false) {
      // Load additional test data if needed
      const scenario = TestDataFactory.createBusinessScenario();
      console.log('📦 Loaded business scenario with:', {
        products: scenario.products.length,
        customers: scenario.customers.length,
        sales: scenario.sales.length,
        totalValue: scenario.totalValue
      });
    }

    this.isSetup = true;
    console.log('✅ Test environment setup completed');
  }

  async cleanupTestData() {
    if (!this.isSetup) {
      return;
    }

    console.log('🧹 Cleaning up test environment...');
    await testDb.cleanup();
    await testDb.endIsolation();
    this.isSetup = false;
    console.log('✅ Test environment cleanup completed');
  }

  getTestDatabase() {
    return testDb;
  }
}

// Export singleton
export const testEnv = TestEnvironment.getInstance();
