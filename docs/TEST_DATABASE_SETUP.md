# Dedicated Test Database Setup

This document explains how to use the dedicated test database functionality in the FBMS project. The system supports multiple testing strategies to balance speed, reliability, and realism.

## Quick Start

### 1. Set up the test environment:
```bash
# Setup everything automatically
./scripts/test-db.sh setup
```

### 2. Run tests with real database:
```bash
# Run all tests
npm test

# Run integration tests specifically
npm test -- integration

# Run tests with the management script
./scripts/test-db.sh run integration
```

## Overview

The test system supports three testing strategies:

1. **Mock Database** - Fast, isolated unit tests using mocked services
2. **Local Supabase** - Integration tests using local Supabase instance
3. **Remote Test Database** - CI/CD tests using a remote test database

The system automatically detects the `import.meta.env.TEST` flag and switches between real database and mocks based on configuration.

## Testing Strategies

### 1. Mock Database Strategy (Unit Tests)

**Best for:** Fast unit tests, component testing, isolated logic testing

```typescript
import { setupTestEnvironment } from '../test/utils/testUtils';

beforeEach(async () => {
  await setupTestEnvironment({
    testType: 'unit',
    forceMockDatabase: true,
    loadTestData: true,
    testDataScale: 'small'
  });
});
```

**Features:**
- ⚡ Very fast execution
- 🔒 Completely isolated tests
- 🎭 Simulated network conditions
- 📊 Consistent test data
- 💾 No database dependencies

### 2. Local Supabase Strategy (Integration Tests)

**Best for:** Integration tests, database schema validation, real transaction testing

```typescript
import { setupTestEnvironment } from '../test/utils/testUtils';
import { testEnvironment } from '../test/config/testEnvironment';

beforeEach(async () => {
  await setupTestEnvironment({
    testType: 'integration',
    useTestDatabase: true,
    databaseStrategy: 'local_supabase'
  });
});

afterEach(async () => {
  await testEnvironment.cleanup();
});
```

**Features:**
- 🗄️ Real database operations
- 🔄 Transaction support
- 🌱 Automatic test data seeding
- 🧹 Automatic cleanup
- 📈 Realistic performance testing

**Requirements:**
- Docker running
- Supabase CLI installed
- Local Supabase instance started

### 3. Remote Test Database Strategy (CI/CD)

**Best for:** Continuous integration, production-like testing

```typescript
// Set environment variables in CI/CD:
// VITE_TEST_SUPABASE_URL=https://your-test-project.supabase.co
// VITE_TEST_SUPABASE_ANON_KEY=your-test-anon-key

await setupTestEnvironment({
  testType: 'ci',
  databaseStrategy: 'remote_test'
});
```

## Test Database Management

### Using the Management Script

The `scripts/test-db.sh` script provides easy management of the test database:

```bash
# Show available commands
./scripts/test-db.sh help

# Setup complete test environment
./scripts/test-db.sh setup

# Start only Supabase
./scripts/test-db.sh start

# Reset database with fresh migrations
./scripts/test-db.sh reset

# Seed test data
./scripts/test-db.sh seed

# Test connection
./scripts/test-db.sh test

# Run tests
./scripts/test-db.sh run
./scripts/test-db.sh run integration
./scripts/test-db.sh run "product.*test"

# Show status
./scripts/test-db.sh status

# Cleanup and stop
./scripts/test-db.sh cleanup
```

### Manual Supabase Management

```bash
# Start Supabase
supabase start

# Check status
supabase status

# Reset database
supabase db reset

# Stop Supabase
supabase stop
```

## Test Data and Fixtures

### Automatic Test Data Seeding

The system automatically seeds minimal test fixtures when using real database:

- **Categories**: Test Food & Beverages, Test Electronics, Test Supplies
- **Products**: 5 test products with various scenarios (normal, low stock, out of stock)
- **Customers**: 3 test customers
- **Suppliers**: 2 test suppliers
- **Locations**: 3 test inventory locations
- **Stock Movements**: Sample movements for testing
- **Sales**: Sample sales data
- **Purchase Orders**: Sample purchase orders

### Test Data Characteristics

All test data uses predictable IDs and patterns:
- IDs: `cat-test-001`, `prod-test-001`, `cust-test-001`, etc.
- SKUs: `TEST-001`, `TEST-002`, etc.
- Easy to identify and clean up
- Consistent across test runs

### Custom Test Data

```typescript
import { TestDataFactory } from '../test/factories/testDataFactory';

// Create custom test data
const customProduct = TestDataFactory.createProduct({
  name: 'My Test Product',
  sku: 'CUSTOM-001',
  price: 100.00
});

// Use with real database
const client = testEnvironment.getSupabaseClient();
if (client) {
  await client.from('products').insert([customProduct]);
}
```

## Configuration Options

### Test Environment Configuration

```typescript
interface TestEnvironmentConfig {
  // Database strategy
  useTestDatabase?: boolean;           // Use real DB when TEST flag is true
  forceMockDatabase?: boolean;         // Force mocks even in test mode
  databaseStrategy?: 'local_supabase' | 'mock' | 'remote_test';
  testType?: 'unit' | 'integration' | 'e2e' | 'ci';
  
  // Data options
  loadTestData?: boolean;              // Load test fixtures
  testDataScale?: 'small' | 'medium' | 'large';
  
  // Legacy mock options
  mockDatabase?: boolean;
  mockPayments?: boolean;
  mockNotifications?: boolean;
  networkDelay?: number;
  simulateErrors?: boolean;
}
```

### Predefined Configurations

```typescript
import { TEST_CONFIGURATIONS } from '../test/config/testEnvironment';

// Unit test configuration
const unitConfig = TEST_CONFIGURATIONS.unit;
// - Uses mocks for speed
// - No real database dependencies
// - Fast performance mode

// Integration test configuration  
const integrationConfig = TEST_CONFIGURATIONS.integration;
// - Uses local Supabase
// - Seeds test data
// - Realistic performance mode

// E2E test configuration
const e2eConfig = TEST_CONFIGURATIONS.e2e;
// - Uses local Supabase
// - Full test data set
// - Cross-test data persistence

// CI/CD configuration
const ciConfig = TEST_CONFIGURATIONS.ci;
// - Uses remote test database
// - Fast but realistic testing
// - Isolated test runs
```

## Environment Variables

### Local Development

```bash
# .env.local (for development)
VITE_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
VITE_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeo-pkc4y4I4UuQXX1WlCd3yW_vLX2-THqI
```

### Test Environment

```bash
# For remote test database (CI/CD)
VITE_TEST_SUPABASE_URL=https://your-test-project.supabase.co
VITE_TEST_SUPABASE_ANON_KEY=your-test-anon-key

# Alternative naming
VITE_PUBLIC_SUPABASE_URL_TEST=https://your-test-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY_TEST=your-test-anon-key
```

## Usage Examples

### Simple Unit Test

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestEnvironment, cleanupTestData } from '../test/utils/testUtils';

describe('Product Service', () => {
  beforeEach(async () => {
    await setupTestEnvironment({
      testType: 'unit',
      forceMockDatabase: true
    });
  });
  
  it('should calculate product profit margin', () => {
    // Test uses mocks - fast and isolated
    expect(calculateProfitMargin(100, 80)).toBe(20);
  });
});
```

### Integration Test with Real Database

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestEnvironment, cleanupTestData } from '../test/utils/testUtils';
import { testEnvironment } from '../test/config/testEnvironment';

describe('Product CRUD Integration', () => {
  beforeEach(async () => {
    await setupTestEnvironment({
      testType: 'integration',
      useTestDatabase: true,
      databaseStrategy: 'local_supabase'
    });
  });
  
  afterEach(async () => {
    await cleanupTestData();
    await testEnvironment.cleanup();
  });
  
  it('should create and retrieve product from database', async () => {
    if (testEnvironment.isUsingRealDatabase()) {
      const client = testEnvironment.getSupabaseClient();
      
      // Test with real database
      const newProduct = {
        name: 'Integration Test Product',
        sku: 'INT-TEST-001',
        price: 50.00,
        cost: 40.00,
        stock: 100,
        min_stock: 10,
        unit: 'piece',
        is_active: true
      };
      
      const { data: created, error } = await client!
        .from('products')
        .insert([newProduct])
        .select()
        .single();
      
      expect(error).toBeNull();
      expect(created.name).toBe(newProduct.name);
      
      // Cleanup
      await client!.from('products').delete().eq('id', created.id);
    }
  });
});
```

### Performance Testing

```typescript
import { setupTestEnvironment, testEnv } from '../test/utils/testUtils';

describe('Performance Tests', () => {
  beforeEach(async () => {
    await setupTestEnvironment({
      testType: 'integration',
      loadTestData: true,
      testDataScale: 'large'
    });
  });
  
  it('should handle bulk operations efficiently', async () => {
    const startTime = performance.now();
    
    // Your performance-critical code here
    await bulkProcessProducts();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Record performance metric
    testEnv.recordPerformanceMetric('bulk_process', duration, 1000);
    
    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });
});
```

## Troubleshooting

### Common Issues

1. **"Local Supabase not available"**
   ```bash
   # Check if Docker is running
   docker info
   
   # Check if Supabase is started
   supabase status
   
   # Start Supabase
   ./scripts/test-db.sh start
   ```

2. **"Test data not found"**
   ```bash
   # Re-seed test data
   ./scripts/test-db.sh seed
   
   # Or reset everything
   ./scripts/test-db.sh reset
   ```

3. **Port conflicts**
   ```bash
   # Check what's using Supabase ports
   lsof -i :54321  # API
   lsof -i :54328  # Database
   
   # Stop conflicting services or change ports in config.toml
   ```

4. **Tests using wrong database**
   ```typescript
   // Force mock database
   await setupTestEnvironment({
     forceMockDatabase: true
   });
   
   // Force real database
   await setupTestEnvironment({
     useTestDatabase: true,
     databaseStrategy: 'local_supabase'
   });
   ```

### Debug Information

```typescript
import { testEnvironment } from '../test/config/testEnvironment';

// Check current strategy
const status = await testEnvironment.getConnectionStatus();
console.log('Database strategy:', status.strategy);
console.log('Connected:', status.connected);

// Check if using real database
const isReal = testEnvironment.isUsingRealDatabase();
console.log('Using real database:', isReal);

// Get current test configuration
const config = testEnv.getCurrentConfig();
console.log('Test config:', config);
```

## Best Practices

### Test Organization

1. **Use appropriate test types:**
   - Unit tests: `testType: 'unit'`, mocks
   - Integration tests: `testType: 'integration'`, local DB
   - E2E tests: `testType: 'e2e'`, local DB
   - CI tests: `testType: 'ci'`, remote DB

2. **Proper cleanup:**
   ```typescript
   afterEach(async () => {
     await cleanupTestData();
     await testEnvironment.cleanup();
   });
   ```

3. **Conditional testing:**
   ```typescript
   it('should test real database feature', async () => {
     if (testEnvironment.isUsingRealDatabase()) {
       // Test with real database
     } else {
       // Test with mocks or skip
       expect(true).toBe(true);
     }
   });
   ```

### Performance Considerations

1. **Use mocks for unit tests** - Much faster execution
2. **Use real database sparingly** - Only for integration/e2e tests
3. **Scale test data appropriately** - Use 'small' for most tests
4. **Monitor test performance** - Use performance metrics

### Data Management

1. **Use predictable test IDs** - Makes cleanup easier
2. **Clean up after tests** - Prevent test interference
3. **Use transactions when possible** - For better isolation
4. **Seed minimal data** - Only what's needed for tests

## Migration from Mock-Only Tests

### Before (Mock Only)
```typescript
beforeEach(async () => {
  await setupTestEnvironment({
    mockDatabase: true,
    loadTestData: true
  });
});
```

### After (Flexible Strategy)
```typescript
beforeEach(async () => {
  await setupTestEnvironment({
    testType: 'integration',        // Will use real DB if available
    useTestDatabase: true,          // Enable real DB testing
    databaseStrategy: 'local_supabase'  // Prefer local Supabase
  });
});
```

The system will automatically fallback to mocks if the real database is not available, ensuring your tests always run.

## Contributing

When adding new tests:

1. Choose the appropriate test strategy
2. Use the standard setup/cleanup pattern
3. Handle both mock and real database scenarios
4. Add appropriate test data cleanup
5. Document any special requirements

## Scripts Reference

| Command | Description |
|---------|-------------|
| `./scripts/test-db.sh setup` | Complete test environment setup |
| `./scripts/test-db.sh start` | Start Supabase only |
| `./scripts/test-db.sh stop` | Stop Supabase |
| `./scripts/test-db.sh reset` | Reset database with migrations |
| `./scripts/test-db.sh seed` | Seed test data |
| `./scripts/test-db.sh test` | Test database connection |
| `./scripts/test-db.sh run [pattern]` | Run tests with test DB |
| `./scripts/test-db.sh status` | Show Supabase status |
| `./scripts/test-db.sh cleanup` | Stop and cleanup |
| `npm test` | Run all tests |
| `npm test -- --run` | Run tests without watch mode |
| `npm test -- integration` | Run integration tests only |

This setup provides a robust, flexible testing environment that can adapt to different scenarios while maintaining test reliability and performance.
