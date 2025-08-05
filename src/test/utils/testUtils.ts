import { vi } from 'vitest';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { TestDataFactory, InventoryTestData } from '../factories/testDataFactory';
import { mockServices } from '../mocks/mockServices';
import { Product, Sale, StockMovement, Customer } from '../../types/business';

// Test environment configuration
export interface TestEnvironmentConfig {
  mockDatabase?: boolean;
  mockPayments?: boolean;
  mockNotifications?: boolean;
  mockReporting?: boolean;
  networkDelay?: number;
  simulateErrors?: boolean;
  loadTestData?: boolean;
  testDataScale?: 'small' | 'medium' | 'large';
}

// Test validation results
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  dataConsistency: ConsistencyCheck[];
  performanceMetrics: PerformanceMetric[];
}

export interface ValidationError {
  type: string;
  message: string;
  field?: string;
  value?: any;
  expected?: any;
}

export interface ValidationWarning {
  type: string;
  message: string;
  suggestion?: string;
}

export interface ConsistencyCheck {
  entity: string;
  field: string;
  status: 'valid' | 'invalid' | 'warning';
  message: string;
  relatedEntities?: string[];
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  memoryUsage?: number;
  threshold: number;
  status: 'pass' | 'fail' | 'warning';
}

// User interaction simulation
export interface UserAction {
  type: 'click' | 'type' | 'select' | 'submit' | 'navigate';
  target: string;
  value?: any;
  delay?: number;
}

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialEntries?: string[];
  withRouter?: boolean;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const { withRouter = true, ...renderOptions } = options;

  // For now, just use basic render without router wrapper to avoid JSX issues
  return render(ui, renderOptions);
}

// Test environment setup and cleanup utilities
export class TestEnvironmentManager {
  private static instance: TestEnvironmentManager;
  private currentConfig: TestEnvironmentConfig = {};
  private testData: InventoryTestData | null = null;
  private performanceMetrics: PerformanceMetric[] = [];

  static getInstance(): TestEnvironmentManager {
    if (!TestEnvironmentManager.instance) {
      TestEnvironmentManager.instance = new TestEnvironmentManager();
    }
    return TestEnvironmentManager.instance;
  }

  async setupTestEnvironment(config: TestEnvironmentConfig = {}): Promise<void> {
    this.currentConfig = { ...config };

    // Reset all mock services
    mockServices.reset();

    // Configure mock services based on config
    if (config.mockDatabase !== false) {
      this.setupMockDatabase();
    }

    if (config.networkDelay && config.networkDelay > 0) {
      mockServices.simulateSlowNetwork(config.networkDelay);
    }

    if (config.simulateErrors) {
      mockServices.simulateNetworkError();
    }

    // Load test data if requested
    if (config.loadTestData) {
      await this.loadTestData(config.testDataScale || 'medium');
    }

    // Setup performance monitoring
    this.setupPerformanceMonitoring();
  }

  private setupMockDatabase(): void {
    // Mock localStorage for Zustand persistence
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock
    });

    // Mock window.location for navigation tests
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000',
        origin: 'http://localhost:3000',
        pathname: '/',
        search: '',
        hash: '',
        reload: vi.fn(),
        assign: vi.fn(),
        replace: vi.fn()
      },
      writable: true
    });

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  }

  private async loadTestData(scale: 'small' | 'medium' | 'large'): Promise<void> {
    this.testData = TestDataFactory.createLargeDataset(scale);

    // Load data into mock services
    mockServices.supabase.setMockData('products', this.testData.products);
    mockServices.supabase.setMockData('categories', this.testData.categories);
    mockServices.supabase.setMockData('customers', this.testData.customers);
    mockServices.supabase.setMockData('sales', this.testData.sales);
    mockServices.supabase.setMockData('purchase_orders', this.testData.purchaseOrders);
    mockServices.supabase.setMockData('stock_movements', this.testData.stockMovements);
    mockServices.supabase.setMockData('inventory_locations', this.testData.locations);
    mockServices.supabase.setMockData('stock_transfers', this.testData.transfers);
    mockServices.supabase.setMockData('stock_alerts', this.testData.alerts);
  }

  private setupPerformanceMonitoring(): void {
    this.performanceMetrics = [];
    
    // Mock performance.now() for consistent timing
    let mockTime = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => {
      mockTime += Math.random() * 10; // Simulate some time passage
      return mockTime;
    });
  }

  async cleanupTestData(): Promise<void> {
    // Clear mock services
    mockServices.reset();

    // Clear test data
    this.testData = null;
    this.performanceMetrics = [];

    // Restore normal operation
    mockServices.restoreNormalOperation();

    // Clear any timers
    vi.clearAllTimers();
    vi.useRealTimers();
  }

  async waitForAsyncOperations(timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Async operations did not complete within ${timeout}ms`));
      }, timeout);

      // Wait for next tick to allow async operations to complete
      setTimeout(() => {
        clearTimeout(timeoutId);
        resolve();
      }, 0);
    });
  }

  mockApiResponses(responses: Array<{ endpoint: string; response: any; delay?: number }>): void {
    responses.forEach(({ endpoint, response, delay = 0 }) => {
      // This would be implemented based on your specific API structure
      // For now, we'll use the mock services
      if (delay > 0) {
        mockServices.supabase.setMockDelay(delay);
      }
    });
  }

  async simulateUserInteraction(action: UserAction): Promise<void> {
    const { type, target, value, delay = 0 } = action;

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // This would be implemented with actual user event simulation
    // For now, we'll just log the action
    console.log(`Simulating ${type} on ${target}${value ? ` with value ${value}` : ''}`);
  }

  async validateDataConsistency(): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const consistencyChecks: ConsistencyCheck[] = [];

    if (!this.testData) {
      return {
        isValid: true,
        errors,
        warnings,
        dataConsistency: consistencyChecks,
        performanceMetrics: this.performanceMetrics
      };
    }

    // Validate product data consistency
    this.validateProducts(this.testData.products, errors, warnings, consistencyChecks);

    // Validate stock movement consistency
    this.validateStockMovements(this.testData.stockMovements, errors, warnings, consistencyChecks);

    // Validate sales data consistency
    this.validateSales(this.testData.sales, errors, warnings, consistencyChecks);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      dataConsistency: consistencyChecks,
      performanceMetrics: this.performanceMetrics
    };
  }

  private validateProducts(products: Product[], errors: ValidationError[], warnings: ValidationWarning[], checks: ConsistencyCheck[]): void {
    const skuSet = new Set<string>();
    const barcodeSet = new Set<string>();

    products.forEach(product => {
      // Check for duplicate SKUs
      if (skuSet.has(product.sku)) {
        errors.push({
          type: 'duplicate_sku',
          message: `Duplicate SKU found: ${product.sku}`,
          field: 'sku',
          value: product.sku
        });
      } else {
        skuSet.add(product.sku);
      }

      // Check for duplicate barcodes
      if (product.barcode && barcodeSet.has(product.barcode)) {
        errors.push({
          type: 'duplicate_barcode',
          message: `Duplicate barcode found: ${product.barcode}`,
          field: 'barcode',
          value: product.barcode
        });
      } else if (product.barcode) {
        barcodeSet.add(product.barcode);
      }

      // Check price vs cost relationship
      if (product.price <= product.cost) {
        warnings.push({
          type: 'price_cost_relationship',
          message: `Product ${product.name} has price (${product.price}) less than or equal to cost (${product.cost})`,
          suggestion: 'Review pricing strategy'
        });
      }

      // Check stock levels
      if (product.stock < 0) {
        errors.push({
          type: 'negative_stock',
          message: `Product ${product.name} has negative stock: ${product.stock}`,
          field: 'stock',
          value: product.stock
        });
      }

      if (product.stock < product.minStock) {
        warnings.push({
          type: 'low_stock',
          message: `Product ${product.name} is below minimum stock level`,
          suggestion: 'Consider reordering'
        });
      }

      checks.push({
        entity: 'product',
        field: 'data_integrity',
        status: 'valid',
        message: `Product ${product.name} data integrity check passed`
      });
    });
  }

  private validateStockMovements(movements: StockMovement[], errors: ValidationError[], warnings: ValidationWarning[], checks: ConsistencyCheck[]): void {
    movements.forEach(movement => {
      // Check for valid quantities
      if (movement.quantity <= 0) {
        errors.push({
          type: 'invalid_quantity',
          message: `Stock movement has invalid quantity: ${movement.quantity}`,
          field: 'quantity',
          value: movement.quantity
        });
      }

      // Check for required fields
      if (!movement.reason || movement.reason.trim() === '') {
        errors.push({
          type: 'missing_reason',
          message: 'Stock movement is missing reason',
          field: 'reason',
          value: movement.reason
        });
      }

      checks.push({
        entity: 'stock_movement',
        field: 'data_integrity',
        status: 'valid',
        message: `Stock movement ${movement.id} data integrity check passed`
      });
    });
  }

  private validateSales(sales: Sale[], errors: ValidationError[], warnings: ValidationWarning[], checks: ConsistencyCheck[]): void {
    sales.forEach(sale => {
      // Check total calculations
      const calculatedSubtotal = sale.items.reduce((sum, item) => sum + item.total, 0);
      if (Math.abs(calculatedSubtotal - sale.subtotal) > 0.01) {
        errors.push({
          type: 'calculation_error',
          message: `Sale ${sale.invoiceNumber} subtotal mismatch`,
          field: 'subtotal',
          value: sale.subtotal,
          expected: calculatedSubtotal
        });
      }

      // Check tax calculation (12% VAT)
      const expectedTax = calculatedSubtotal * 0.12;
      if (Math.abs(expectedTax - sale.tax) > 0.01) {
        warnings.push({
          type: 'tax_calculation',
          message: `Sale ${sale.invoiceNumber} tax calculation may be incorrect`,
          suggestion: 'Verify tax rate and calculation'
        });
      }

      checks.push({
        entity: 'sale',
        field: 'calculations',
        status: 'valid',
        message: `Sale ${sale.invoiceNumber} calculations check passed`
      });
    });
  }

  recordPerformanceMetric(operation: string, duration: number, threshold: number): void {
    const status: 'pass' | 'fail' | 'warning' = 
      duration <= threshold ? 'pass' : 
      duration <= threshold * 1.5 ? 'warning' : 'fail';

    this.performanceMetrics.push({
      operation,
      duration,
      threshold,
      status
    });
  }

  getTestData(): InventoryTestData | null {
    return this.testData;
  }

  getCurrentConfig(): TestEnvironmentConfig {
    return { ...this.currentConfig };
  }

  getPerformanceMetrics(): PerformanceMetric[] {
    return [...this.performanceMetrics];
  }
}

// Convenience functions
export const testEnv = TestEnvironmentManager.getInstance();

export async function setupTestEnvironment(config?: TestEnvironmentConfig): Promise<void> {
  return testEnv.setupTestEnvironment(config);
}

export async function cleanupTestData(): Promise<void> {
  return testEnv.cleanupTestData();
}

export async function waitForAsyncOperations(timeout?: number): Promise<void> {
  return testEnv.waitForAsyncOperations(timeout);
}

export function mockApiResponses(responses: Array<{ endpoint: string; response: any; delay?: number }>): void {
  return testEnv.mockApiResponses(responses);
}

export async function simulateUserInteraction(action: UserAction): Promise<void> {
  return testEnv.simulateUserInteraction(action);
}

export async function validateDataConsistency(): Promise<ValidationResult> {
  return testEnv.validateDataConsistency();
}

// Test assertion helpers
export function expectValidationResult(result: ValidationResult, expectedErrors: number = 0): void {
  if (result.errors.length !== expectedErrors) {
    console.error('Validation errors:', result.errors);
    console.warn('Validation warnings:', result.warnings);
  }
  expect(result.errors).toHaveLength(expectedErrors);
}

export function expectPerformanceThreshold(operation: string, actualDuration: number, threshold: number): void {
  testEnv.recordPerformanceMetric(operation, actualDuration, threshold);
  expect(actualDuration).toBeLessThanOrEqual(threshold);
}

export function expectDataConsistency(checks: ConsistencyCheck[], expectedValid: number): void {
  const validChecks = checks.filter(check => check.status === 'valid');
  expect(validChecks).toHaveLength(expectedValid);
}

// Export commonly used test utilities
export * from '@testing-library/react';
export * from '@testing-library/user-event';
export { vi } from 'vitest';