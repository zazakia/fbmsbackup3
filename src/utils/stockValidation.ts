import { Product, CartItem } from '../types/business';

export interface StockValidationError {
  code: 'INSUFFICIENT_STOCK' | 'NEGATIVE_STOCK' | 'PRODUCT_NOT_FOUND' | 'INVALID_QUANTITY';
  message: string;
  productId: string;
  productName: string;
  requestedQuantity: number;
  availableStock: number;
  suggestions?: string[];
}

export interface StockValidationResult {
  isValid: boolean;
  errors: StockValidationError[];
  warnings: StockValidationError[];
}

export interface StockUpdateOptions {
  preventNegative?: boolean;
  allowPartialUpdate?: boolean;
  validateBeforeUpdate?: boolean;
}

/**
 * Validates stock availability for a single product
 */
export function validateProductStock(
  product: Product | undefined,
  requestedQuantity: number,
  options: StockUpdateOptions = {}
): StockValidationResult {
  const errors: StockValidationError[] = [];
  const warnings: StockValidationError[] = [];

  // Check if product exists
  if (!product) {
    errors.push({
      code: 'PRODUCT_NOT_FOUND',
      message: 'Product not found',
      productId: '',
      productName: 'Unknown Product',
      requestedQuantity,
      availableStock: 0,
      suggestions: ['Please verify the product ID or barcode']
    });
    return { isValid: false, errors, warnings };
  }

  // Check for invalid quantity
  if (requestedQuantity <= 0) {
    errors.push({
      code: 'INVALID_QUANTITY',
      message: 'Quantity must be greater than zero',
      productId: product.id,
      productName: product.name,
      requestedQuantity,
      availableStock: product.stock,
      suggestions: ['Please enter a valid quantity']
    });
  }

  // Check for insufficient stock or negative stock prevention
  if (product.stock < requestedQuantity) {
    // If preventNegative is enabled, use NEGATIVE_STOCK error code for better specificity
    const errorCode = options.preventNegative ? 'NEGATIVE_STOCK' : 'INSUFFICIENT_STOCK';
    const errorMessage = options.preventNegative 
      ? `Operation would result in negative stock for ${product.name}`
      : `Insufficient stock for ${product.name}. Available: ${product.stock}, Required: ${requestedQuantity}`;

    const error: StockValidationError = {
      code: errorCode,
      message: errorMessage,
      productId: product.id,
      productName: product.name,
      requestedQuantity,
      availableStock: product.stock,
      suggestions: []
    };

    if (options.preventNegative) {
      error.suggestions?.push('Reduce the quantity to prevent negative stock');
      error.suggestions?.push('Check if stock levels are accurate');
    } else {
      if (product.stock > 0) {
        error.suggestions?.push(`Reduce quantity to ${product.stock} or less`);
        error.suggestions?.push('Check if more stock is available in other locations');
      } else {
        error.suggestions?.push('Product is out of stock');
        error.suggestions?.push('Consider removing this item from the sale');
      }
    }

    if (product.reorderQuantity && product.stock <= product.minStock) {
      error.suggestions?.push(`Consider reordering ${product.reorderQuantity} units`);
    }

    errors.push(error);
  }

  // Add warnings for low stock
  if (product.stock > 0 && product.stock <= product.minStock && product.stock >= requestedQuantity) {
    warnings.push({
      code: 'INSUFFICIENT_STOCK',
      message: `Low stock warning for ${product.name}. Current stock: ${product.stock}, Minimum: ${product.minStock}`,
      productId: product.id,
      productName: product.name,
      requestedQuantity,
      availableStock: product.stock,
      suggestions: [
        'Consider reordering soon',
        `Recommended reorder quantity: ${product.reorderQuantity || product.minStock * 2}`
      ]
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates stock availability for multiple cart items
 */
export function validateCartStock(
  cartItems: CartItem[],
  products: Product[],
  options: StockUpdateOptions = {}
): StockValidationResult {
  const allErrors: StockValidationError[] = [];
  const allWarnings: StockValidationError[] = [];

  for (const item of cartItems) {
    const product = products.find(p => p.id === item.product.id);
    const validation = validateProductStock(product, item.quantity, options);
    
    allErrors.push(...validation.errors);
    allWarnings.push(...validation.warnings);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Validates if a stock update operation is safe
 */
export function validateStockUpdate(
  product: Product | undefined,
  quantityChange: number,
  options: StockUpdateOptions = {}
): StockValidationResult {
  const errors: StockValidationError[] = [];
  const warnings: StockValidationError[] = [];

  if (!product) {
    errors.push({
      code: 'PRODUCT_NOT_FOUND',
      message: 'Product not found for stock update',
      productId: '',
      productName: 'Unknown Product',
      requestedQuantity: Math.abs(quantityChange),
      availableStock: 0
    });
    return { isValid: false, errors, warnings };
  }

  const newStock = product.stock + quantityChange;

  // Check for negative stock if prevention is enabled
  if (options.preventNegative && newStock < 0) {
    errors.push({
      code: 'NEGATIVE_STOCK',
      message: `Stock update would result in negative stock for ${product.name}. Current: ${product.stock}, Change: ${quantityChange}, Result: ${newStock}`,
      productId: product.id,
      productName: product.name,
      requestedQuantity: Math.abs(quantityChange),
      availableStock: product.stock,
      suggestions: [
        `Maximum reduction allowed: ${product.stock}`,
        'Verify the stock change amount',
        'Check if there are pending stock movements'
      ]
    });
  }

  // Add warning for low stock after update
  if (newStock >= 0 && newStock <= product.minStock) {
    warnings.push({
      code: 'INSUFFICIENT_STOCK',
      message: `Stock update will result in low stock for ${product.name}. New stock: ${newStock}, Minimum: ${product.minStock}`,
      productId: product.id,
      productName: product.name,
      requestedQuantity: Math.abs(quantityChange),
      availableStock: product.stock,
      suggestions: [
        'Consider reordering soon',
        `Recommended reorder quantity: ${product.reorderQuantity || product.minStock * 2}`
      ]
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Creates user-friendly error messages for stock validation errors
 */
export function formatStockValidationErrors(errors: StockValidationError[]): string[] {
  return errors.map(error => {
    switch (error.code) {
      case 'INSUFFICIENT_STOCK':
        return `${error.productName}: Not enough stock (Available: ${error.availableStock}, Needed: ${error.requestedQuantity})`;
      
      case 'NEGATIVE_STOCK':
        return `${error.productName}: Operation would cause negative stock`;
      
      case 'PRODUCT_NOT_FOUND':
        return `Product not found or invalid`;
      
      case 'INVALID_QUANTITY':
        return `${error.productName}: Invalid quantity (${error.requestedQuantity})`;
      
      default:
        return error.message;
    }
  });
}

/**
 * Creates user-friendly suggestions for stock validation errors
 */
export function formatStockValidationSuggestions(errors: StockValidationError[]): string[] {
  const suggestions: string[] = [];
  
  errors.forEach(error => {
    if (error.suggestions) {
      suggestions.push(...error.suggestions);
    }
  });

  // Remove duplicates
  return [...new Set(suggestions)];
}

/**
 * Checks if any products in the cart have concurrent stock issues
 */
export function detectConcurrentStockIssues(
  cartItems: CartItem[],
  products: Product[]
): StockValidationError[] {
  const errors: StockValidationError[] = [];
  
  // Group cart items by product to detect multiple entries for same product
  const productQuantities = new Map<string, number>();
  
  cartItems.forEach(item => {
    const currentQuantity = productQuantities.get(item.product.id) || 0;
    productQuantities.set(item.product.id, currentQuantity + item.quantity);
  });

  // Check if total quantities exceed available stock
  productQuantities.forEach((totalQuantity, productId) => {
    const product = products.find(p => p.id === productId);
    if (product && product.stock < totalQuantity) {
      errors.push({
        code: 'INSUFFICIENT_STOCK',
        message: `Multiple cart entries for ${product.name} exceed available stock`,
        productId: product.id,
        productName: product.name,
        requestedQuantity: totalQuantity,
        availableStock: product.stock,
        suggestions: [
          'Consolidate duplicate cart entries',
          `Reduce total quantity to ${product.stock} or less`
        ]
      });
    }
  });

  return errors;
}

/**
 * Creates a comprehensive stock validation error with user-friendly messaging
 */
export function createStockValidationError(
  code: StockValidationError['code'],
  product: Product,
  requestedQuantity: number,
  customMessage?: string
): StockValidationError {
  const baseError: StockValidationError = {
    code,
    message: customMessage || '',
    productId: product.id,
    productName: product.name,
    requestedQuantity,
    availableStock: product.stock,
    suggestions: []
  };

  switch (code) {
    case 'INSUFFICIENT_STOCK':
      baseError.message = customMessage || `Not enough stock for ${product.name}. Available: ${product.stock}, Requested: ${requestedQuantity}`;
      baseError.suggestions = [
        `Reduce quantity to ${product.stock} or less`,
        'Check if more stock is available in other locations',
        product.reorderQuantity ? `Consider reordering ${product.reorderQuantity} units` : 'Consider reordering this product'
      ];
      break;

    case 'NEGATIVE_STOCK':
      baseError.message = customMessage || `Operation would result in negative stock for ${product.name}`;
      baseError.suggestions = [
        'Reduce the quantity to prevent negative stock',
        'Verify current stock levels are accurate',
        'Check for pending stock movements'
      ];
      break;

    case 'PRODUCT_NOT_FOUND':
      baseError.message = customMessage || 'Product not found or has been removed';
      baseError.suggestions = [
        'Refresh the product list',
        'Verify the product barcode or ID',
        'Contact administrator if product should exist'
      ];
      break;

    case 'INVALID_QUANTITY':
      baseError.message = customMessage || `Invalid quantity specified for ${product.name}`;
      baseError.suggestions = [
        'Enter a positive quantity greater than zero',
        'Check for decimal or negative values'
      ];
      break;
  }

  return baseError;
}

/**
 * Validates multiple products for a bulk operation (like a sale)
 */
export function validateBulkStockOperation(
  items: Array<{ productId: string; quantity: number }>,
  products: Product[],
  options: StockUpdateOptions = {}
): StockValidationResult {
  const errors: StockValidationError[] = [];
  const warnings: StockValidationError[] = [];

  // Check for duplicate product entries and consolidate quantities
  const consolidatedItems = new Map<string, number>();
  items.forEach(item => {
    const currentQuantity = consolidatedItems.get(item.productId) || 0;
    consolidatedItems.set(item.productId, currentQuantity + item.quantity);
  });

  // Validate each consolidated item
  consolidatedItems.forEach((totalQuantity, productId) => {
    const product = products.find(p => p.id === productId);
    
    if (!product) {
      errors.push(createStockValidationError('PRODUCT_NOT_FOUND', {
        id: productId,
        name: 'Unknown Product',
        stock: 0
      } as Product, totalQuantity));
      return;
    }

    if (totalQuantity <= 0) {
      errors.push(createStockValidationError('INVALID_QUANTITY', product, totalQuantity));
      return;
    }

    if (product.stock < totalQuantity) {
      if (options.preventNegative) {
        errors.push(createStockValidationError('NEGATIVE_STOCK', product, totalQuantity));
      } else {
        errors.push(createStockValidationError('INSUFFICIENT_STOCK', product, totalQuantity));
      }
    }

    // Add low stock warnings
    if (product.stock > 0 && product.stock <= product.minStock && product.stock >= totalQuantity) {
      warnings.push(createStockValidationError('INSUFFICIENT_STOCK', product, totalQuantity, 
        `Low stock warning for ${product.name}. Current: ${product.stock}, Minimum: ${product.minStock}`));
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}