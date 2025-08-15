# Supabase Test Utilities

A comprehensive set of testing utilities for Supabase applications, providing disposable clients, retry mechanisms, latency measurement, and typed test data factories.

## Features

- 🔧 **Disposable Supabase Clients** - Self-cleaning test clients with custom timeouts
- 🔄 **Retry Mechanisms** - Exponential backoff for handling flaky operations  
- ⏱️ **Latency Measurement** - Built-in performance monitoring for test operations
- 👥 **Test User Generation** - Automated test user and token generation
- 🏭 **Typed Data Factories** - Generate realistic test data for all business entities
- 🧹 **Automatic Cleanup** - Resource tracking and automated cleanup
- 🚨 **Error Handling** - Comprehensive error types and handling

## Quick Start

```typescript
import { 
  createTestClient, 
  withRetry, 
  timeIt, 
  TestDataFactory,
  TestSuiteHelper 
} from '../helpers/supabaseTestUtils';

// Basic client creation
const client = createTestClient({
  timeout: 10000,
  debugMode: true,
  autoCleanup: true
});

// Use in your tests
const supabase = client.getClient();
const { data, error } = await supabase.from('products').select('*');

// Always dispose when done
await client.dispose();
```

## API Reference

### DisposableSupabaseClient

A wrapper around Supabase client that provides automatic cleanup and enhanced features.

```typescript
class DisposableSupabaseClient {
  constructor(options: TestClientOptions)
  getClient(): SupabaseClient<Database>
  trackResource(table: string, id: string): void
  cleanup(): Promise<void>
  dispose(): Promise<void>
}
```

#### Options

```typescript
interface TestClientOptions {
  timeout?: number;           // Request timeout in ms (default: 10000)
  maxRetries?: number;        // Max retry attempts (default: 3)  
  retryDelay?: number;        // Base retry delay in ms (default: 100)
  autoCleanup?: boolean;      // Auto cleanup on dispose (default: true)
  sessionPersistence?: boolean; // Persist auth sessions (default: false)
  debugMode?: boolean;        // Enable debug logging (default: false)
}
```

#### Usage Examples

```typescript
// Basic usage
const client = createTestClient();
const supabase = client.getClient();

// With custom options
const client = createTestClient({
  timeout: 5000,
  debugMode: true,
  autoCleanup: true
});

// Track resources for cleanup
client.trackResource('customers', customerId);
client.trackResource('products', productId);

// Manual cleanup
await client.cleanup();

// Dispose (includes cleanup if autoCleanup is true)
await client.dispose();
```

### withRetry Function

Wraps operations with exponential backoff retry logic.

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<T>
```

#### Retry Options

```typescript
interface RetryOptions {
  maxAttempts?: number;         // Max retry attempts (default: 3)
  baseDelay?: number;           // Base delay in ms (default: 100)  
  maxDelay?: number;            // Max delay in ms (default: 5000)
  backoffMultiplier?: number;   // Backoff multiplier (default: 2)
  retryableErrors?: string[];   // Error codes to retry on
  onRetry?: (attempt: number, error: Error) => void; // Retry callback
}
```

#### Usage Examples

```typescript
// Basic retry
const result = await withRetry(async () => {
  return await supabase.from('products').select('*');
});

// Custom retry options
const result = await withRetry(
  async () => await supabase.from('products').insert(productData),
  {
    maxAttempts: 5,
    baseDelay: 200,
    onRetry: (attempt, error) => {
      console.log(`Retry ${attempt}: ${error.message}`);
    }
  }
);

// With retryable error filtering
const result = await withRetry(
  () => performDatabaseOperation(),
  {
    retryableErrors: ['TIMEOUT', 'RATE_LIMIT', 'NETWORK_ERROR'],
    maxAttempts: 3
  }
);
```

### timeIt Function

Measures operation latency and provides performance insights.

```typescript
async function timeIt<T>(
  operation: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<{ result: T; measurement: LatencyMeasurement }>
```

#### Usage Examples

```typescript
// Basic latency measurement
const { result, measurement } = await timeIt(async () => {
  return await supabase.from('products').select('*');
});

console.log(`Operation took ${measurement.duration}ms`);
console.log(`Success: ${measurement.success}`);

// With metadata
const { result, measurement } = await timeIt(
  () => supabase.from('customers').insert(customerData),
  { operation: 'customer_creation', userId: 'test-user-123' }
);

// Handle failures
try {
  const { result, measurement } = await timeIt(() => {
    throw new Error('Test error');
  });
} catch (result) {
  console.log(`Failed operation took ${result.measurement.duration}ms`);
  console.log(`Error: ${result.error.message}`);
}
```

### Test User Generation

Generate authenticated test users with tokens.

```typescript
class TestUserGenerator {
  async createTestUser(
    client: SupabaseClient, 
    overrides?: Partial<TestUserData>
  ): Promise<TestUserData>
  
  async generateTestToken(
    client: SupabaseClient, 
    user: TestUserData
  ): Promise<string>
}
```

#### Usage Examples

```typescript
const generator = new TestUserGenerator();

// Create test user
const testUser = await generator.createTestUser(supabase, {
  firstName: 'John',
  lastName: 'Doe', 
  role: 'admin'
});

// Generate auth token
const token = await generator.generateTestToken(supabase, testUser);

// Use token in requests
const { data } = await supabase
  .from('protected_resource')
  .select('*')
  .header('Authorization', `Bearer ${token}`);
```

### Test Data Factories

Generate realistic test data for all business entities.

```typescript
class TestDataFactory {
  static productsFactory(overrides?: Partial<Product>): Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
  static customersFactory(overrides?: Partial<Customer>): Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>
  static salesFactory(overrides?: Partial<Sale>): Omit<Sale, 'id' | 'createdAt'>
  static suppliersFactory(overrides?: Partial<Supplier>): Omit<Supplier, 'id' | 'createdAt'>
  static purchaseOrdersFactory(overrides?: Partial<PurchaseOrder>): Omit<PurchaseOrder, 'id' | 'createdAt'>
  static employeesFactory(overrides?: Partial<Employee>): Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>
  static expensesFactory(overrides?: Partial<Expense>): Omit<Expense, 'id' | 'createdAt'>
  static usersFactory(overrides?: Partial<User>): Omit<User, 'id' | 'createdAt'>
}
```

#### Usage Examples

```typescript
// Generate basic test data
const product = TestDataFactory.productsFactory();
const customer = TestDataFactory.customersFactory();
const sale = TestDataFactory.salesFactory();

// Generate with custom values
const product = TestDataFactory.productsFactory({
  name: 'Custom Product',
  price: 199.99,
  category: 'Electronics'
});

const customer = TestDataFactory.customersFactory({
  email: 'john.doe@example.com',
  creditLimit: 10000,
  customerType: 'business'
});

// Create related entities
const supplier = TestDataFactory.suppliersFactory({
  name: 'Acme Corp'
});

const purchaseOrder = TestDataFactory.purchaseOrdersFactory({
  supplierName: supplier.name,
  total: 5000.00
});

// Insert into database
const { data: productData } = await supabase
  .from('products')
  .insert(product)
  .select()
  .single();

client.trackResource('products', productData.id);
```

### Test Suite Helper

Convenient wrapper for managing multiple clients and resources.

```typescript
class TestSuiteHelper {
  async createClient(options?: TestClientOptions): Promise<DisposableSupabaseClient>
  async createTestUser(client?: SupabaseClient, overrides?: Partial<TestUserData>): Promise<TestUserData>
  async cleanupAll(): Promise<void>
}
```

#### Usage Examples

```typescript
describe('My Test Suite', () => {
  let testSuite: TestSuiteHelper;
  
  beforeEach(() => {
    testSuite = new TestSuiteHelper();
  });
  
  afterEach(async () => {
    await testSuite.cleanupAll();
  });
  
  it('should test something', async () => {
    const client = await testSuite.createClient();
    const testUser = await testSuite.createTestUser(client.getClient());
    
    // Test logic here...
    // Cleanup happens automatically in afterEach
  });
});
```

## Error Handling

### Custom Error Types

```typescript
class SupabaseTestError extends Error {
  constructor(message: string, code?: string, cause?: Error)
}

class RetryableError extends SupabaseTestError {
  // Thrown for errors that should trigger retries
}
```

### Error Usage

```typescript
try {
  await someOperation();
} catch (error) {
  if (error instanceof RetryableError) {
    // Will be retried automatically when using withRetry
  } else if (error instanceof SupabaseTestError) {
    // Handle test-specific errors
    console.error(`Test error: ${error.message}, Code: ${error.code}`);
  }
}
```

## Environment Configuration

Set the following environment variables:

```bash
# Required
VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional - Custom timeout (default: 10000ms)
VITE_SUPABASE_FETCH_TIMEOUT_MS=15000
```

## Best Practices

### 1. Use Test Suite Helper for Multiple Tests

```typescript
describe('Feature Tests', () => {
  let testSuite: TestSuiteHelper;
  
  beforeEach(() => {
    testSuite = new TestSuiteHelper();
  });
  
  afterEach(async () => {
    await testSuite.cleanupAll();
  });
});
```

### 2. Combine with Retry and Timing

```typescript
const { result, measurement } = await timeIt(
  () => withRetry(
    () => supabase.from('products').insert(productData),
    { maxAttempts: 3 }
  ),
  { operation: 'product_creation' }
);
```

### 3. Track Resources for Cleanup

```typescript
const client = createTestClient({ autoCleanup: true });

// Create test data
const { data: customer } = await client.getClient()
  .from('customers')
  .insert(TestDataFactory.customersFactory())
  .select()
  .single();

// Track for cleanup
client.trackResource('customers', customer.id);
```

### 4. Use Appropriate Timeouts

```typescript
// For quick unit tests
const client = createTestClient({ timeout: 3000 });

// For integration tests
const client = createTestClient({ timeout: 15000 });
```

### 5. Enable Debug Mode During Development

```typescript
const client = createTestClient({
  debugMode: process.env.NODE_ENV === 'development'
});
```

## Common Patterns

### Database Connection Testing

```typescript
it('should connect to database', async () => {
  const client = createTestClient({ timeout: 5000 });
  
  const { measurement } = await timeIt(async () => {
    const { error } = await client.getClient()
      .from('customers')
      .select('count', { count: 'exact' });
    
    if (error && error.code !== '42P01') {
      throw new SupabaseTestError(`Connection failed: ${error.message}`);
    }
  });
  
  expect(measurement.success).toBe(true);
  expect(measurement.duration).toBeLessThan(3000);
  
  await client.dispose();
});
```

### CRUD Testing with Cleanup

```typescript
it('should perform CRUD operations', async () => {
  const client = createTestClient({ autoCleanup: true });
  const supabase = client.getClient();
  
  // Create
  const productData = TestDataFactory.productsFactory();
  const { data: product } = await supabase
    .from('products')
    .insert(productData)
    .select()
    .single();
  
  client.trackResource('products', product.id);
  
  // Read
  const { data: foundProduct } = await supabase
    .from('products')
    .select('*')
    .eq('id', product.id)
    .single();
  
  expect(foundProduct.name).toBe(productData.name);
  
  // Update  
  await supabase
    .from('products')
    .update({ price: 299.99 })
    .eq('id', product.id);
  
  // Delete happens automatically via cleanup
  await client.dispose();
});
```

### Performance Testing

```typescript
it('should meet performance requirements', async () => {
  const client = createTestClient();
  
  const measurements: LatencyMeasurement[] = [];
  
  // Run multiple operations
  for (let i = 0; i < 10; i++) {
    const { measurement } = await timeIt(
      () => client.getClient().from('products').select('*').limit(100)
    );
    measurements.push(measurement);
  }
  
  const avgLatency = measurements.reduce((sum, m) => sum + m.duration, 0) / measurements.length;
  
  expect(avgLatency).toBeLessThan(500); // 500ms average
  expect(measurements.every(m => m.success)).toBe(true);
  
  await client.dispose();
});
```

This utility library provides a robust foundation for testing Supabase applications with comprehensive error handling, performance monitoring, and automatic cleanup capabilities.
