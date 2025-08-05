# Inventory System Test Framework

This comprehensive test framework provides utilities, mocks, and configurations for testing the Filipino Business Management System (FBMS) inventory management system.

## Overview

The test framework includes:

- **Test Data Factory**: Generates realistic test data for all inventory entities
- **Mock Services**: Simulates external dependencies (Supabase, payment gateways, notifications)
- **Test Utilities**: Environment setup, cleanup, validation, and performance monitoring
- **Test Configuration**: Different configurations for unit, integration, e2e, performance, and security tests
- **Database Testing**: Transaction support, data integrity validation, and snapshot management

## Quick Start

```typescript
import { 
  TestDataFactory, 
  setupTestEnvironment, 
  cleanupTestData,
  mockServices,
  validateDataConsistency 
} from '../test/setup';

describe('My Inventory Test', () => {
  beforeEach(async () => {
    await setupTestEnvironment({
      loadTestData: true,
      testDataScale: 'medium'
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it('should test inventory functionality', async () => {
    const product = TestDataFactory.createProduct();
    
    const result = await mockServices.supabase
      .from('products')
      .insert(product)
      .select()
      .single();
    
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject(product);
  });
});
```

## Test Data Factory

### Creating Individual Entities

```typescript
// Create a product with default values
const product = TestDataFactory.createProduct();

// Create a product with custom values
const customProduct = TestDataFactory.createProduct({
  name: 'Custom Product',
  price: 1000,
  stock: 50
});

// Create other entities
const category = TestDataFactory.createCategory();
const customer = TestDataFactory.createCustomer();
const sale = TestDataFactory.createSale();
const stockMovement = TestDataFactory.createStockMovement();
```

### Creating Bulk Data

```typescript
// Create multiple products
const products = TestDataFactory.createBulkProducts(100);

// Create a complete realistic dataset
const inventoryData = TestDataFactory.createRealisticInventoryData();
// Returns: { products, categories, locations, stockMovements, transfers, alerts, customers, suppliers, sales, purchaseOrders }

// Create performance test data
const largeDataset = TestDataFactory.createLargeDataset('large');
```

## Mock Services

### Supabase Mock

```typescript
// Basic database operations
const result = await mockServices.supabase
  .from('products')
  .select()
  .eq('category', 'electronics');

// Insert data
await mockServices.supabase
  .from('products')
  .insert(product)
  .select();

// Update data
await mockServices.supabase
  .from('products')
  .update({ stock: 50 })
  .eq('id', productId);

// Set mock data directly
mockServices.supabase.setMockData('products', [product1, product2]);

// Simulate errors
mockServices.supabase.setMockError(new Error('Database error'));

// Simulate delays
mockServices.supabase.setMockDelay(1000);
```

### Payment Service Mock

```typescript
// Process payment
const result = await mockServices.payment.processPayment(1000, 'gcash');

// Simulate payment failure
mockServices.payment.setFailure(true);

// Process refund
const refund = await mockServices.payment.refundPayment('txn-123');
```

### Notification Service Mock

```typescript
// Send notification
await mockServices.notification.sendNotification(
  'low_stock', 
  'admin@test.com', 
  'Product X is low on stock'
);

// Get sent notifications
const notifications = mockServices.notification.getSentNotifications();

// Send bulk notifications
await mockServices.notification.sendBulkNotifications([
  { type: 'alert', recipient: 'user1@test.com', message: 'Alert 1' },
  { type: 'alert', recipient: 'user2@test.com', message: 'Alert 2' }
]);
```

## Test Environment Management

### Environment Setup

```typescript
await setupTestEnvironment({
  mockDatabase: true,
  mockPayments: true,
  mockNotifications: true,
  loadTestData: true,
  testDataScale: 'medium',
  networkDelay: 100,
  simulateErrors: false
});
```

### Data Validation

```typescript
const validationResult = await validateDataConsistency();

// Check validation result
expectValidationResult(validationResult, 0); // Expect 0 errors

// Access validation details
console.log('Errors:', validationResult.errors);
console.log('Warnings:', validationResult.warnings);
console.log('Consistency checks:', validationResult.dataConsistency);
```

### Performance Monitoring

```typescript
const startTime = performance.now();
// ... perform operation
const endTime = performance.now();

expectPerformanceThreshold('my_operation', endTime - startTime, 1000);

// Get all performance metrics
const metrics = testEnv.getPerformanceMetrics();
```

## Test Configurations

### Using Predefined Configurations

```typescript
import { getTestConfig } from '../test/config/testConfig';

const unitConfig = getTestConfig('unit');
const integrationConfig = getTestConfig('integration');
const e2eConfig = getTestConfig('e2e');
const performanceConfig = getTestConfig('performance');
const securityConfig = getTestConfig('security');
```

### Configuration Properties

Each configuration includes:

- **Database**: Mock settings, data scale, transaction support, RLS
- **Performance**: Thresholds, load testing parameters, memory limits
- **Security**: Authentication, role testing, input validation, security tests
- **Integration**: Module integration flags, network simulation
- **Reporting**: Report testing, formats, size limits, timeouts

## Database Testing

### Transaction Support

```typescript
// Begin transaction
const transactionId = await testDb.beginTransaction();

// Perform operations
await mockServices.supabase.from('products').insert(product);
await mockServices.supabase.from('stock_movements').insert(movement);

// Commit or rollback
await testDb.commitTransaction(transactionId);
// OR
await testDb.rollbackTransaction(transactionId);
```

### Data Integrity Validation

```typescript
const validation = await testDb.validateDataIntegrity();

if (!validation.isValid) {
  console.log('Data integrity errors:', validation.errors);
}
```

### Snapshots

```typescript
// Create snapshot
const snapshotId = await testDb.createTestSnapshot();

// ... make changes to data

// Restore snapshot
await testDb.restoreTestSnapshot(snapshotId);
```

## Component Testing with Providers

```typescript
import { renderWithProviders } from '../test/utils/testUtils';

it('should render inventory component', () => {
  const { getByText } = renderWithProviders(
    <InventoryManagement />,
    { withRouter: true }
  );
  
  expect(getByText('Inventory Management')).toBeInTheDocument();
});
```

## Error Simulation

### Network Errors

```typescript
// Simulate network failure for all services
mockServices.simulateNetworkError();

// Simulate slow network
mockServices.simulateSlowNetwork(2000); // 2 second delay

// Restore normal operation
mockServices.restoreNormalOperation();
```

### Service-Specific Errors

```typescript
// Database errors
mockServices.supabase.setMockError(new Error('Connection timeout'));

// Payment errors
mockServices.payment.setFailure(true);

// Notification errors
mockServices.notification.setFailure(true);
```

## Best Practices

### Test Organization

1. **Use descriptive test names** that explain what is being tested
2. **Group related tests** using `describe` blocks
3. **Setup and cleanup** properly in `beforeEach` and `afterEach`
4. **Use appropriate test configurations** for different test types

### Data Management

1. **Reset test data** between tests to ensure isolation
2. **Use realistic test data** that matches production scenarios
3. **Validate data consistency** in integration tests
4. **Use transactions** for tests that modify data

### Performance Testing

1. **Set appropriate thresholds** based on requirements
2. **Test with realistic data volumes** using large datasets
3. **Monitor memory usage** in bulk operations
4. **Test concurrent operations** for multi-user scenarios

### Error Handling

1. **Test both success and failure scenarios**
2. **Simulate network conditions** (delays, failures)
3. **Validate error messages** and user feedback
4. **Test recovery mechanisms** after errors

## Example Test Patterns

### Unit Test Pattern

```typescript
describe('Product Management Unit Tests', () => {
  it('should validate product data', () => {
    const product = TestDataFactory.createProduct({
      price: 100,
      cost: 60
    });
    
    expect(product.price).toBeGreaterThan(product.cost);
    expect(product.sku).toMatch(/^SKU-[A-Z0-9]{8}$/);
  });
});
```

### Integration Test Pattern

```typescript
describe('POS-Inventory Integration', () => {
  beforeEach(async () => {
    await setupTestEnvironment({
      loadTestData: true,
      testDataScale: 'medium'
    });
  });

  it('should update inventory when sale is completed', async () => {
    const product = TestDataFactory.createProduct({ stock: 100 });
    await mockServices.supabase.from('products').insert(product);
    
    const sale = TestDataFactory.createSale();
    // ... complete sale transaction
    
    const updatedProduct = await mockServices.supabase
      .from('products')
      .select()
      .eq('id', product.id)
      .single();
    
    expect(updatedProduct.data.stock).toBeLessThan(100);
  });
});
```

### Performance Test Pattern

```typescript
describe('Inventory Performance Tests', () => {
  it('should handle bulk operations efficiently', async () => {
    const config = getTestConfig('performance');
    const products = TestDataFactory.createBulkProducts(1000);
    
    const startTime = performance.now();
    mockServices.supabase.setMockData('products', products);
    const result = await mockServices.supabase.from('products').select();
    const endTime = performance.now();
    
    expectPerformanceThreshold(
      'bulk_query', 
      endTime - startTime, 
      config.performance.thresholds.bulkOperation
    );
  });
});
```

## Troubleshooting

### Common Issues

1. **Tests failing due to async operations**: Use `waitForAsyncOperations()`
2. **Data inconsistency between tests**: Ensure proper cleanup in `afterEach`
3. **Mock services not resetting**: Call `mockServices.reset()` in setup
4. **Performance tests flaky**: Use appropriate thresholds and multiple runs

### Debugging

1. **Enable console output**: Use `restoreConsole()` from setup
2. **Check test data**: Use `testEnv.getTestData()` to inspect loaded data
3. **Validate data integrity**: Run `validateDataConsistency()` to check for issues
4. **Monitor performance**: Check `testEnv.getPerformanceMetrics()` for timing data

## Contributing

When adding new test utilities:

1. **Follow existing patterns** and naming conventions
2. **Add comprehensive documentation** and examples
3. **Include unit tests** for the test utilities themselves
4. **Update this README** with new features and usage examples