import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface TestDatabaseConfig {
  strategy: 'local_supabase' | 'mock' | 'remote_test';
  useRealDatabase: boolean;
  seedData: boolean;
  isolateTests: boolean;
  resetBetweenTests: boolean;
}

export interface TestEnvironmentSetup {
  database: TestDatabaseConfig;
  networkMocking: boolean;
  performanceMode: 'fast' | 'realistic';
  debugMode: boolean;
}

/**
 * Test Environment Manager
 * Handles switching between different testing strategies based on TEST flag and configuration
 */
export class TestEnvironmentManager {
  private static instance: TestEnvironmentManager;
  private supabaseClient: SupabaseClient | null = null;
  private currentStrategy: 'local_supabase' | 'mock' | 'remote_test' = 'mock';
  private isTestEnvironment = false;

  static getInstance(): TestEnvironmentManager {
    if (!TestEnvironmentManager.instance) {
      TestEnvironmentManager.instance = new TestEnvironmentManager();
    }
    return TestEnvironmentManager.instance;
  }

  constructor() {
    // Detect if we're in test environment
    this.isTestEnvironment = import.meta.env.TEST === true || 
                             import.meta.env.MODE === 'test' ||
                             process.env.NODE_ENV === 'test';
    
    console.log('🧪 Test Environment Detected:', this.isTestEnvironment);
  }

  /**
   * Initialize test environment with specific configuration
   */
  async initialize(config: TestEnvironmentSetup): Promise<void> {
    if (!this.isTestEnvironment) {
      console.warn('⚠️ TestEnvironmentManager should only be used in test environment');
      return;
    }

    this.currentStrategy = config.database.strategy;
    console.log(`🔧 Initializing test environment with strategy: ${this.currentStrategy}`);

    switch (this.currentStrategy) {
      case 'local_supabase':
        await this.setupLocalSupabase(config.database);
        break;
      case 'remote_test':
        await this.setupRemoteTestDatabase(config.database);
        break;
      case 'mock':
      default:
        await this.setupMockEnvironment(config.database);
        break;
    }

    if (config.database.seedData) {
      await this.seedTestData();
    }
  }

  /**
   * Setup local Supabase instance for testing
   */
  private async setupLocalSupabase(dbConfig: TestDatabaseConfig): Promise<void> {
    const localSupabaseUrl = 'http://127.0.0.1:54321';
    const localAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeo-pkc4y4I4UuQXX1WlCd3yW_vLX2-THqI';

    try {
      this.supabaseClient = createClient(localSupabaseUrl, localAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: 'public'
        }
      });

      // Test connection
      const { data, error } = await this.supabaseClient
        .from('products')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ Local Supabase connection failed:', error.message);
        console.log('💡 Make sure to run: supabase start');
        throw new Error(`Local Supabase not available: ${error.message}`);
      }

      console.log('✅ Connected to local Supabase instance');

      // Reset test data if requested
      if (dbConfig.resetBetweenTests) {
        await this.resetTestDatabase();
      }

    } catch (error) {
      console.error('❌ Failed to setup local Supabase:', error);
      console.log('🔄 Falling back to mock environment');
      this.currentStrategy = 'mock';
      await this.setupMockEnvironment(dbConfig);
    }
  }

  /**
   * Setup remote test database (for CI/CD environments)
   */
  private async setupRemoteTestDatabase(dbConfig: TestDatabaseConfig): Promise<void> {
    const testSupabaseUrl = process.env.VITE_TEST_SUPABASE_URL || process.env.VITE_PUBLIC_SUPABASE_URL_TEST;
    const testAnonKey = process.env.VITE_TEST_SUPABASE_ANON_KEY || process.env.VITE_PUBLIC_SUPABASE_ANON_KEY_TEST;

    if (!testSupabaseUrl || !testAnonKey) {
      console.warn('⚠️ Remote test database credentials not found, falling back to mock');
      this.currentStrategy = 'mock';
      await this.setupMockEnvironment(dbConfig);
      return;
    }

    this.supabaseClient = createClient(testSupabaseUrl, testAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    });

    console.log('✅ Connected to remote test database');

    if (dbConfig.resetBetweenTests) {
      await this.resetTestDatabase();
    }
  }

  /**
   * Setup mock environment for fast testing
   */
  private async setupMockEnvironment(dbConfig: TestDatabaseConfig): Promise<void> {
    // This will use the existing mock services from the test framework
    console.log('🎭 Using mock environment for testing');
    this.supabaseClient = null; // Will use mocks instead
  }

  /**
   * Seed the database with test fixtures
   */
  private async seedTestData(): Promise<void> {
    if (!this.supabaseClient) {
      console.log('🌱 Seeding mock data through test data factory');
      // This will be handled by the existing TestDataFactory
      return;
    }

    console.log('🌱 Seeding test database with fixtures...');

    try {
      // Load and execute the test seed file
      const response = await fetch('/supabase/seed-test.sql');
      if (!response.ok) {
        console.warn('⚠️ Could not load seed-test.sql file, using inline data');
        await this.seedInlineTestData();
        return;
      }

      // For now, we'll use inline seeding as SQL execution would require additional setup
      await this.seedInlineTestData();
      
    } catch (error) {
      console.error('❌ Failed to seed test data:', error);
      await this.seedInlineTestData();
    }
  }

  /**
   * Inline test data seeding (fallback method)
   */
  private async seedInlineTestData(): Promise<void> {
    if (!this.supabaseClient) return;

    try {
      // Clear existing test data
      await this.clearTestData();

      // Insert test categories
      const { error: catError } = await this.supabaseClient
        .from('categories')
        .insert([
          { id: 'cat-test-001', name: 'Test Food & Beverages', description: 'Test category for food items', is_active: true },
          { id: 'cat-test-002', name: 'Test Electronics', description: 'Test category for electronics', is_active: true },
          { id: 'cat-test-003', name: 'Test Supplies', description: 'Test category for supplies', is_active: true }
        ]);

      if (catError) console.warn('⚠️ Category seeding warning:', catError.message);

      // Insert test products
      const { error: prodError } = await this.supabaseClient
        .from('products')
        .insert([
          { id: 'prod-test-001', name: 'Test Product A', sku: 'TEST-001', category: 'Test Food & Beverages', price: 25.00, cost: 20.00, stock: 100, min_stock: 20, unit: 'piece', is_active: true },
          { id: 'prod-test-002', name: 'Test Product B', sku: 'TEST-002', category: 'Test Electronics', price: 150.00, cost: 120.00, stock: 50, min_stock: 10, unit: 'piece', is_active: true },
          { id: 'prod-test-003', name: 'Test Product C', sku: 'TEST-003', category: 'Test Supplies', price: 75.00, cost: 60.00, stock: 200, min_stock: 50, unit: 'pack', is_active: true }
        ]);

      if (prodError) console.warn('⚠️ Product seeding warning:', prodError.message);

      // Insert test customers
      const { error: custError } = await this.supabaseClient
        .from('customers')
        .insert([
          { id: 'cust-test-001', first_name: 'Test', last_name: 'Customer', email: 'test.customer@example.com', phone: '09123456789', is_active: true },
          { id: 'cust-test-002', first_name: 'Jane', last_name: 'Doe', email: 'jane.doe@test.com', phone: '09987654321', is_active: true }
        ]);

      if (custError) console.warn('⚠️ Customer seeding warning:', custError.message);

      console.log('✅ Test data seeded successfully');

    } catch (error) {
      console.error('❌ Failed to seed inline test data:', error);
    }
  }

  /**
   * Clear test data from database
   */
  private async clearTestData(): Promise<void> {
    if (!this.supabaseClient) return;

    try {
      // Delete in order to respect foreign key constraints
      await this.supabaseClient.from('sales_items').delete().like('id', '%test%');
      await this.supabaseClient.from('sales').delete().like('id', '%test%');
      await this.supabaseClient.from('purchase_order_items').delete().like('id', '%test%');
      await this.supabaseClient.from('purchase_orders').delete().like('id', '%test%');
      await this.supabaseClient.from('stock_movements').delete().like('id', '%test%');
      await this.supabaseClient.from('stock_alerts').delete().like('id', '%test%');
      await this.supabaseClient.from('products').delete().like('id', '%test%');
      await this.supabaseClient.from('customers').delete().like('id', '%test%');
      await this.supabaseClient.from('suppliers').delete().like('id', '%test%');
      await this.supabaseClient.from('categories').delete().like('id', '%test%');

      console.log('🧹 Test data cleared');
    } catch (error) {
      console.warn('⚠️ Could not clear all test data:', error);
    }
  }

  /**
   * Reset the entire test database
   */
  private async resetTestDatabase(): Promise<void> {
    console.log('🔄 Resetting test database...');
    await this.clearTestData();
    await this.seedTestData();
  }

  /**
   * Get the current Supabase client (real or mock)
   */
  getSupabaseClient(): SupabaseClient | null {
    return this.supabaseClient;
  }

  /**
   * Get current strategy
   */
  getCurrentStrategy(): 'local_supabase' | 'mock' | 'remote_test' {
    return this.currentStrategy;
  }

  /**
   * Check if using real database
   */
  isUsingRealDatabase(): boolean {
    return this.currentStrategy !== 'mock' && this.supabaseClient !== null;
  }

  /**
   * Cleanup test environment
   */
  async cleanup(): Promise<void> {
    if (this.currentStrategy !== 'mock' && this.supabaseClient) {
      await this.clearTestData();
    }
    this.supabaseClient = null;
  }

  /**
   * Execute raw SQL (for advanced test scenarios)
   */
  async executeSql(sql: string): Promise<any> {
    if (!this.supabaseClient) {
      throw new Error('No database client available for SQL execution');
    }

    try {
      const { data, error } = await this.supabaseClient.rpc('exec_sql', { sql_query: sql });
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ SQL execution failed:', error);
      throw error;
    }
  }

  /**
   * Get database connection status
   */
  async getConnectionStatus(): Promise<{ connected: boolean; strategy: string; error?: string }> {
    if (this.currentStrategy === 'mock') {
      return { connected: true, strategy: 'mock' };
    }

    if (!this.supabaseClient) {
      return { connected: false, strategy: this.currentStrategy, error: 'No client available' };
    }

    try {
      const { error } = await this.supabaseClient.from('products').select('count').limit(1);
      return { 
        connected: !error, 
        strategy: this.currentStrategy, 
        error: error?.message 
      };
    } catch (error) {
      return { 
        connected: false, 
        strategy: this.currentStrategy, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Export singleton instance
export const testEnvironment = TestEnvironmentManager.getInstance();

// Configuration presets
export const TEST_CONFIGURATIONS = {
  unit: {
    database: {
      strategy: 'mock' as const,
      useRealDatabase: false,
      seedData: false,
      isolateTests: true,
      resetBetweenTests: true
    },
    networkMocking: true,
    performanceMode: 'fast' as const,
    debugMode: false
  },
  integration: {
    database: {
      strategy: 'local_supabase' as const,
      useRealDatabase: true,
      seedData: true,
      isolateTests: true,
      resetBetweenTests: true
    },
    networkMocking: false,
    performanceMode: 'realistic' as const,
    debugMode: true
  },
  e2e: {
    database: {
      strategy: 'local_supabase' as const,
      useRealDatabase: true,
      seedData: true,
      isolateTests: false,
      resetBetweenTests: false
    },
    networkMocking: false,
    performanceMode: 'realistic' as const,
    debugMode: true
  },
  ci: {
    database: {
      strategy: 'remote_test' as const,
      useRealDatabase: true,
      seedData: true,
      isolateTests: true,
      resetBetweenTests: true
    },
    networkMocking: false,
    performanceMode: 'fast' as const,
    debugMode: false
  }
} as const;
