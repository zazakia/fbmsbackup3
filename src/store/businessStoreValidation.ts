import { BusinessService } from '../services/businessService';
import { Product, CartItem } from '../types/business';

// Validation mixin for business store
export const createValidationMixin = (get: () => any) => ({
  // Validate individual product stock
  validateProductStock: (productId: string, requestedQuantity: number, options = {}) => {
    const { products } = get();
    return BusinessService.validateProductStock(
      products.find((p: Product) => p.id === productId),
      requestedQuantity,
      options
    );
  },

  // Validate cart stock
  validateCartStock: (options = {}) => {
    const { cart, products } = get();
    return BusinessService.validateCartStock(cart, products, options);
  },

  // Validate stock update
  validateStockUpdate: (productId: string, quantityChange: number, options = {}) => {
    const { products } = get();
    return BusinessService.validateStockUpdate(
      products.find((p: Product) => p.id === productId),
      quantityChange,
      options
    );
  },

  // Validate sale stock
  validateSaleStock: (cartItems: CartItem[]) => {
    const { products } = get();
    return BusinessService.validateCartStock(cartItems, products, {
      preventNegative: true,
      validateBeforeUpdate: true
    });
  }
});