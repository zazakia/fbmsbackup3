import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createValidationMixin } from '../../../store/businessStoreValidation';
import { BusinessService } from '../../../services/businessService';

// Mock BusinessService
vi.mock('../../../services/businessService', () => ({
  BusinessService: {
    validateProductStock: vi.fn(),
    validateCartStock: vi.fn(),
    validateStockUpdate: vi.fn(),
    validateStockMovement: vi.fn()
  }
}));

describe('Business Store Validation', () => {
  const testProduct = {
    id: 'test-1',
    name: 'Test Product',
    sku: 'TEST-001',
    price: 100,
    cost: 50,
    stock: 100,
    minStock: 20,
    category: '1',
    isActive: true
  };

  const mockStore = {
    products: [testProduct],
    cart: []
  };

  const getMock = () => mockStore;
  const validationMixin = createValidationMixin(getMock);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateProductStock', () => {
    it('should call BusinessService.validateProductStock with correct parameters', () => {
      validationMixin.validateProductStock('test-1', 10, { preventNegative: true });

      expect(BusinessService.validateProductStock).toHaveBeenCalledWith(
        testProduct,
        10,
        { preventNegative: true }
      );
    });
  });

  describe('validateCartStock', () => {
    it('should call BusinessService.validateCartStock with correct parameters', () => {
      validationMixin.validateCartStock({ preventNegative: true });

      expect(BusinessService.validateCartStock).toHaveBeenCalledWith(
        [],
        [testProduct],
        { preventNegative: true }
      );
    });
  });

  describe('validateStockUpdate', () => {
    it('should call BusinessService.validateStockUpdate with correct parameters', () => {
      validationMixin.validateStockUpdate('test-1', 10, { preventNegative: true });

      expect(BusinessService.validateStockUpdate).toHaveBeenCalledWith(
        testProduct,
        10,
        { preventNegative: true }
      );
    });
  });

  describe('validateSaleStock', () => {
    it('should call BusinessService.validateCartStock with correct parameters', () => {
      const cartItem = {
        product: testProduct,
        quantity: 10,
        total: 1000
      };

      validationMixin.validateSaleStock([cartItem]);

      expect(BusinessService.validateCartStock).toHaveBeenCalledWith(
        [cartItem],
        [testProduct],
        {
          preventNegative: true,
          validateBeforeUpdate: true
        }
      );
    });
  });
});