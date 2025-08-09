import { Product, CartItem } from '../types/business';

export interface StockValidationError {
  code: 'INSUFFICIENT_STOCK' | 'NEGATIVE_STOCK' | 'INVALID_QUANTITY' | 'PRODUCT_NOT_FOUND' | 'MOVEMENT_TYPE_MISMATCH' | 'CONCURRENT_MODIFICATION';
  message: string;
  productId: string;
  productName: string;
  requestedQuantity: number;
  availableStock: number;
  suggestions: string[];
}

export interface StockValidationResult {
  isValid: boolean;
  errors: StockValidationError[];
  warnings: string[];
}

export interface StockUpdateOptions {
  preventNegative?: boolean;
  validateBeforeUpdate?: boolean;
  movementType?: string;
  ignoreInactive?: boolean;
  currentUserId?: string;
  referenceNumber?: string;
}

// Stock movement type constants
export const STOCK_OUT_TYPES = [
  'sale',               // Sales transactions
  'stock_out',          // General stock out
  'adjustment_out',     // Negative adjustments
  'transfer_out',       // Transfers to other locations
  'return_out',         // Returns to suppliers
  'damage_out',         // Damaged goods
  'expired_out',        // Expired products
  'shrinkage'           // Inventory shrinkage
];

export const STOCK_IN_TYPES = [
  'purchase',           // Purchase orders
  'stock_in',           // General stock in
  'adjustment_in',      // Positive adjustments
  'transfer_in',        // Transfers from other locations
  'return_in',          // Customer returns
  'initial_stock',      // Initial stock entry
  'recount'             // Physical count adjustment
];

// Enhanced validation for stock movement direction
export function validateMovementType(movementType: string): { isValid: boolean; direction: 'IN' | 'OUT' | null; error?: string } {
  if (STOCK_OUT_TYPES.includes(movementType)) {
    return { isValid: true, direction: 'OUT' };
  } else if (STOCK_IN_TYPES.includes(movementType)) {
    return { isValid: true, direction: 'IN' };
  }
  return { 
    isValid: false, 
    direction: null,
    error: `Invalid movement type: ${movementType}. Must be a valid stock-in or stock-out type.`
  };
}

// Validate stock arithmetic operation
export function validateStockCalculation(previousStock: number, quantityChange: number, movementType: string): StockValidationResult {
  const errors: StockValidationError[] = [];
  const warnings: string[] = [];

  // Validate movement type
  const typeValidation = validateMovementType(movementType);
  if (!typeValidation.isValid) {
    errors.push({
      code: 'MOVEMENT_TYPE_MISMATCH',
      message: typeValidation.error || 'Invalid movement type',
      productId: 'unknown',
      productName: 'unknown',
      requestedQuantity: quantityChange,
      availableStock: previousStock,
      suggestions: ['Check movement type definition', 'Use a valid movement type from the predefined list']
    });
    return { isValid: false, errors, warnings };
  }

  // Ensure quantity is positive
  if (quantityChange <= 0) {
    errors.push({
      code: 'INVALID_QUANTITY',
      message: 'Quantity must be positive',
      productId: 'unknown',
      productName: 'unknown',
      requestedQuantity: quantityChange,
      availableStock: previousStock,
      suggestions: ['Use a positive quantity value']
    });
    return { isValid: false, errors, warnings };
  }

  // Calculate stock change based on movement type
  const isStockOut = typeValidation.direction === 'OUT';
  const effectiveChange = isStockOut ? -quantityChange : quantityChange;
  const newStock = previousStock + effectiveChange;

  // Validate for negative stock
  if (newStock < 0) {
    errors.push({
      code: 'NEGATIVE_STOCK',
      message: `Operation would result in negative stock (${newStock})`,
      productId: 'unknown',
      productName: 'unknown',
      requestedQuantity: quantityChange,
      availableStock: previousStock,
      suggestions: [
        'Reduce quantity',
        'Check available stock',
        'Process incoming stock first'
      ]
    });
    return { isValid: false, errors, warnings };
  }

  // Add warning for large stock changes
  if (Math.abs(effectiveChange) > previousStock * 2) {
    warnings.push(`Large stock change detected: ${effectiveChange} units. Please verify this is intended.`);
  }

  return { isValid: true, errors: [], warnings };
}

// Enhanced product stock validation
export function validateProductStock(
  product: Product | undefined,
  requestedQuantity: number,
  options: StockUpdateOptions = {}
): StockValidationResult {
  const errors: StockValidationError[] = [];
  const warnings: string[] = [];

  // Validate product exists
  if (!product) {
    errors.push({
      code: 'PRODUCT_NOT_FOUND',
      message: 'Product not found',
      productId: 'unknown',
      productName: 'unknown',
      requestedQuantity,
      availableStock: 0,
      suggestions: ['Check product ID', 'Verify product exists']
    });
    return { isValid: false, errors, warnings };
  }

  // Validate product is active
  if (!options.ignoreInactive && !product.isActive) {
    errors.push({
      code: 'PRODUCT_NOT_FOUND',
      message: 'Product is inactive',
      productId: product.id,
      productName: product.name,
      requestedQuantity,
      availableStock: product.stock,
      suggestions: ['Activate product', 'Use a different product']
    });
    return { isValid: false, errors, warnings };
  }

  // For stock-out operations, validate sufficient stock first
  const movementValidation = options.movementType ? validateMovementType(options.movementType) : null;
  if (movementValidation?.direction === 'OUT' && options.preventNegative && requestedQuantity > product.stock) {
    errors.push({
      code: 'INSUFFICIENT_STOCK',
      message: `Insufficient stock. Available: ${product.stock}, Requested: ${requestedQuantity}`,
      productId: product.id,
      productName: product.name,
      requestedQuantity,
      availableStock: product.stock,
      suggestions: [
        'Reduce quantity',
        'Check stock level',
        'Process incoming stock first'
      ]
    });
    return { isValid: false, errors, warnings };
  }

  // If movement type provided, validate stock calculation
  if (options.movementType) {
    const calcValidation = validateStockCalculation(product.stock, requestedQuantity, options.movementType);
    if (!calcValidation.isValid) {
      return calcValidation;
    }
    warnings.push(...calcValidation.warnings);
  }

  // Add warning for low stock
  if (product.minStock && product.stock - requestedQuantity < product.minStock) {
    warnings.push(`Stock will fall below minimum level (${product.minStock} units)`);
  }

  return { isValid: true, errors, warnings };
}

// Enhanced cart stock validation
export function validateCartStock(
  cartItems: CartItem[],
  products: Product[],
  options: StockUpdateOptions = {}
): StockValidationResult {
  const errors: StockValidationError[] = [];
  const warnings: string[] = [];

  // Validate each cart item
  for (const item of cartItems) {
    const product = products.find(p => p.id === item.product.id);
    const itemValidation = validateProductStock(product, item.quantity, {
      ...options,
      movementType: 'sale' // Cart items are always sales
    });

    if (!itemValidation.isValid) {
      errors.push(...itemValidation.errors);
    }
    warnings.push(...itemValidation.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Enhanced stock update validation
export function validateStockUpdate(
  product: Product | undefined,
  quantityChange: number,
  options: StockUpdateOptions = {}
): StockValidationResult {
  // First validate product
  const productValidation = validateProductStock(product, Math.abs(quantityChange), options);
  if (!productValidation.isValid) {
    return productValidation;
  }

  if (!product) {
    return productValidation;
  }

  // Then validate stock calculation if movement type provided
  if (options.movementType) {
    const calcValidation = validateStockCalculation(product.stock, Math.abs(quantityChange), options.movementType);
    if (!calcValidation.isValid) {
      return calcValidation;
    }
    productValidation.warnings.push(...calcValidation.warnings);
  }

  return productValidation;
}

// Format validation errors for display
export function formatStockValidationErrors(errors: StockValidationError[]): string[] {
  return errors.map(error => `${error.productName}: ${error.message}`);
}

// Format validation suggestions for display
export function formatStockValidationSuggestions(errors: StockValidationError[]): string[] {
  const suggestions = new Set<string>();
  errors.forEach(error => error.suggestions.forEach(s => suggestions.add(s)));
  return Array.from(suggestions);
}

// Detect concurrent stock modifications
export function detectConcurrentStockIssues(
  cartItems: CartItem[],
  products: Product[],
): StockValidationError[] {
  const errors: StockValidationError[] = [];

  cartItems.forEach(item => {
    const product = products.find(p => p.id === item.product.id);
    if (product && item.product.stock !== product.stock) {
      errors.push({
        code: 'CONCURRENT_MODIFICATION',
        message: `Product stock changed while in cart. Was: ${item.product.stock}, Now: ${product.stock}`,
        productId: product.id,
        productName: product.name,
        requestedQuantity: item.quantity,
        availableStock: product.stock,
        suggestions: [
          'Refresh cart with current stock levels',
          'Verify quantity is still available'
        ]
      });
    }
  });

  return errors;
}