import { Product, CartItem } from '../types/business';
import { StockValidationService } from './stockValidationService';

// Business service that integrates stock validation
export class BusinessService {
  // Validate individual product stock
  static validateProductStock(
    product: Product | undefined,
    requestedQuantity: number,
    options = {}
  ) {
    return StockValidationService.validateStockChange(product, requestedQuantity, options);
  }

  // Validate cart stock with concurrent access checks
  static validateCartStock(
    cartItems: CartItem[],
    currentProducts: Product[],
    options = {}
  ) {
    return StockValidationService.validateCartWithConcurrency(cartItems, currentProducts, options);
  }

  // Validate stock update operation
  static validateStockUpdate(
    product: Product | undefined,
    quantityChange: number,
    options = {}
  ) {
    return StockValidationService.validateStockChange(product, quantityChange, options);
  }

  // Validate stock movement
  static validateStockMovement(
    product: Product | undefined,
    quantity: number,
    movementType: string,
    options = {}
  ) {
    return StockValidationService.validateStockMovement(product, quantity, movementType, options);
  }

  // Clear validation cache
  static clearValidationCache() {
    StockValidationService.clearCache();
  }
}