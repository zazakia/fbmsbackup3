import { Product, CartItem } from '../types/business';
import {
  validateMovementType,
  validateStockCalculation,
  validateProductStock,
  validateCartStock,
  validateStockUpdate,
  detectConcurrentStockIssues,
  StockValidationResult,
  StockUpdateOptions
} from '../utils/stockValidation';

// Cache for validation results to improve performance
const validationCache = new Map<string, {
  result: StockValidationResult;
  timestamp: number;
  hash: string;
}>();

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Generate cache key for validation results
function generateCacheKey(product: Product | undefined, quantity: number, options: StockUpdateOptions = {}): string {
  return `${product?.id || 'unknown'}-${quantity}-${JSON.stringify(options)}`;
}

// Generate hash for cache invalidation
function generateValidationHash(product: Product | undefined, quantity: number, options: StockUpdateOptions = {}): string {
  return `${product?.stock || 0}-${product?.isActive || false}-${quantity}-${JSON.stringify(options)}`;
}

export class StockValidationService {
  // Validate single product stock change
  static validateStockChange(
    product: Product | undefined,
    quantity: number,
    options: StockUpdateOptions = {}
  ): StockValidationResult {
    const cacheKey = generateCacheKey(product, quantity, options);
    const currentHash = generateValidationHash(product, quantity, options);
    const now = Date.now();

    // Check cache
    const cached = validationCache.get(cacheKey);
    if (cached && 
        now - cached.timestamp < CACHE_EXPIRATION &&
        cached.hash === currentHash) {
      return cached.result;
    }

    // Perform validation
    const result = validateStockUpdate(product, quantity, options);

    // Cache result
    validationCache.set(cacheKey, {
      result,
      timestamp: now,
      hash: currentHash
    });

    return result;
  }

  // Validate multiple product stock changes
  static validateBulkStockChanges(
    changes: Array<{
      product: Product;
      quantity: number;
      options?: StockUpdateOptions;
    }>
  ): StockValidationResult {
    const errors = [];
    const warnings = [];

    // Validate each change
    for (const change of changes) {
      const result = this.validateStockChange(
        change.product,
        change.quantity,
        change.options
      );

      if (!result.isValid) {
        errors.push(...result.errors);
      }
      warnings.push(...result.warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Validate cart items with race condition detection
  static validateCartWithConcurrency(
    cartItems: CartItem[],
    currentProducts: Product[],
    options: StockUpdateOptions = {}
  ): StockValidationResult {
    // First check for concurrent modifications
    const concurrentErrors = detectConcurrentStockIssues(cartItems, currentProducts);
    if (concurrentErrors.length > 0) {
      return {
        isValid: false,
        errors: concurrentErrors,
        warnings: []
      };
    }

    // Then validate cart stock
    return validateCartStock(cartItems, currentProducts, options);
  }

  // Validate stock movement operation
  static validateStockMovement(
    product: Product | undefined,
    quantity: number,
    movementType: string,
    options: StockUpdateOptions = {}
  ): StockValidationResult {
    // First validate movement type
    const typeValidation = validateMovementType(movementType);
    if (!typeValidation.isValid) {
      return {
        isValid: false,
        errors: [{
          code: 'MOVEMENT_TYPE_MISMATCH',
          message: typeValidation.error || 'Invalid movement type',
          productId: product?.id || 'unknown',
          productName: product?.name || 'unknown',
          requestedQuantity: quantity,
          availableStock: product?.stock || 0,
          suggestions: ['Check movement type definition', 'Use a valid movement type from the predefined list']
        }],
        warnings: []
      };
    }

    // Then validate stock change with movement type
    return this.validateStockChange(product, quantity, {
      ...options,
      movementType
    });
  }

  // Clear validation cache
  static clearCache(): void {
    validationCache.clear();
  }

  // Clear specific cache entry
  static clearCacheEntry(
    product: Product | undefined,
    quantity: number,
    options: StockUpdateOptions = {}
  ): void {
    const cacheKey = generateCacheKey(product, quantity, options);
    validationCache.delete(cacheKey);
  }

  // Get cache size
  static getCacheSize(): number {
    return validationCache.size;
  }

  // Get cache entry
  static getCacheEntry(
    product: Product | undefined,
    quantity: number,
    options: StockUpdateOptions = {}
  ): { result: StockValidationResult; timestamp: number; hash: string } | undefined {
    const cacheKey = generateCacheKey(product, quantity, options);
    return validationCache.get(cacheKey);
  }
}