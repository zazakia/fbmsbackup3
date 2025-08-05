import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestDataFactory, mockServices, setupTestEnvironment, cleanupTestData } from '../../setup';
import { Product } from '../../../types/business';

describe('Product Price and Cost Calculation Validation', () => {
  let testProducts: Product[];

  beforeEach(async () => {
    await setupTestEnvironment({
      mockDatabase: true,
      loadTestData: true,
      testDataScale: 'small'
    });

    testProducts = Array.from({ length: 5 }, () => TestDataFactory.createProduct());
    mockServices.supabase.setMockData('products', testProducts);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Price Validation', () => {
    it('should validate price is a positive number', () => {
      const validPrices = [0.01, 1, 10.50, 100, 999.99, 1000000];
      const invalidPrices = [0, -1, -10.50, NaN, Infinity, -Infinity];

      validPrices.forEach(price => {
        expect(isValidPrice(price)).toBe(true);
      });

      invalidPrices.forEach(price => {
        expect(isValidPrice(price)).toBe(false);
      });
    });

    it('should validate price precision to 2 decimal places', () => {
      const validPrices = [10, 10.5, 10.50, 10.99];
      const invalidPrices = [10.123, 10.999, 10.5555];

      validPrices.forEach(price => {
        expect(hasValidPricePrecision(price)).toBe(true);
      });

      invalidPrices.forEach(price => {
        expect(hasValidPricePrecision(price)).toBe(false);
      });
    });

    it('should enforce minimum and maximum price limits', () => {
      const minPrice = 0.01;
      const maxPrice = 999999.99;

      expect(isWithinPriceRange(minPrice)).toBe(true);
      expect(isWithinPriceRange(maxPrice)).toBe(true);
      expect(isWithinPriceRange(minPrice - 0.01)).toBe(false);
      expect(isWithinPriceRange(maxPrice + 0.01)).toBe(false);
    });

    it('should handle currency formatting correctly', () => {
      const testCases = [
        { price: 10, expected: '₱10.00' },
        { price: 10.5, expected: '₱10.50' },
        { price: 1000, expected: '₱1,000.00' },
        { price: 1234.56, expected: '₱1,234.56' },
        { price: 1000000, expected: '₱1,000,000.00' }
      ];

      testCases.forEach(({ price, expected }) => {
        expect(formatCurrency(price)).toBe(expected);
      });
    });
  });

  describe('Cost Validation', () => {
    it('should validate cost is a positive number', () => {
      const validCosts = [0.01, 1, 10.50, 100, 999.99];
      const invalidCosts = [0, -1, -10.50, NaN, Infinity, -Infinity];

      validCosts.forEach(cost => {
        expect(isValidCost(cost)).toBe(true);
      });

      invalidCosts.forEach(cost => {
        expect(isValidCost(cost)).toBe(false);
      });
    });

    it('should validate cost precision to 2 decimal places', () => {
      const validCosts = [10, 10.5, 10.50, 10.99];
      const invalidCosts = [10.123, 10.999, 10.5555];

      validCosts.forEach(cost => {
        expect(hasValidCostPrecision(cost)).toBe(true);
      });

      invalidCosts.forEach(cost => {
        expect(hasValidCostPrecision(cost)).toBe(false);
      });
    });

    it('should allow zero cost for special cases', () => {
      // Some businesses might have promotional items with zero cost
      expect(isValidCost(0, { allowZero: true })).toBe(true);
      expect(isValidCost(0, { allowZero: false })).toBe(false);
      expect(isValidCost(0)).toBe(false); // Default should not allow zero
    });
  });

  describe('Profit Margin Calculations', () => {
    it('should calculate profit margin correctly', () => {
      const testCases = [
        { cost: 60, price: 100, expectedMargin: 40, expectedPercentage: 66.67 },
        { cost: 50, price: 75, expectedMargin: 25, expectedPercentage: 50 },
        { cost: 80, price: 120, expectedMargin: 40, expectedPercentage: 50 },
        { cost: 100, price: 150, expectedMargin: 50, expectedPercentage: 50 },
        { cost: 25, price: 100, expectedMargin: 75, expectedPercentage: 300 }
      ];

      testCases.forEach(({ cost, price, expectedMargin, expectedPercentage }) => {
        const margin = calculateProfitMargin(cost, price);
        const percentage = calculateProfitPercentage(cost, price);

        expect(margin).toBeCloseTo(expectedMargin, 2);
        expect(percentage).toBeCloseTo(expectedPercentage, 2);
      });
    });

    it('should handle edge cases in profit calculations', () => {
      // Same cost and price (0% margin)
      expect(calculateProfitMargin(100, 100)).toBe(0);
      expect(calculateProfitPercentage(100, 100)).toBe(0);

      // Price lower than cost (negative margin)
      expect(calculateProfitMargin(100, 80)).toBe(-20);
      expect(calculateProfitPercentage(100, 80)).toBe(-20);

      // Zero cost (infinite margin)
      expect(calculateProfitPercentage(0, 100)).toBe(Infinity);
    });

    it('should calculate markup percentage correctly', () => {
      const testCases = [
        { cost: 60, price: 100, expectedMarkup: 66.67 },
        { cost: 50, price: 75, expectedMarkup: 50 },
        { cost: 80, price: 120, expectedMarkup: 50 },
        { cost: 100, price: 200, expectedMarkup: 100 }
      ];

      testCases.forEach(({ cost, price, expectedMarkup }) => {
        const markup = calculateMarkupPercentage(cost, price);
        expect(markup).toBeCloseTo(expectedMarkup, 2);
      });
    });

    it('should calculate break-even price with overhead', () => {
      const testCases = [
        { cost: 100, overheadPercentage: 20, expectedBreakEven: 120 },
        { cost: 50, overheadPercentage: 30, expectedBreakEven: 65 },
        { cost: 200, overheadPercentage: 15, expectedBreakEven: 230 }
      ];

      testCases.forEach(({ cost, overheadPercentage, expectedBreakEven }) => {
        const breakEven = calculateBreakEvenPrice(cost, overheadPercentage);
        expect(breakEven).toBeCloseTo(expectedBreakEven, 2);
      });
    });
  });

  describe('Price-Cost Relationship Validation', () => {
    it('should warn when price is less than cost', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const validationResult = validatePriceCostRelationship(100, 80);

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.warnings).toContain('Price is less than cost');
      expect(validationResult.profitMargin).toBe(-20);

      consoleSpy.mockRestore();
    });

    it('should warn when profit margin is too low', () => {
      const minMarginPercentage = 20; // 20% minimum margin
      const validationResult = validatePriceCostRelationship(100, 110, { minMarginPercentage });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.warnings).toContain('Profit margin below minimum threshold');
      expect(validationResult.profitPercentage).toBe(10);
    });

    it('should validate acceptable profit margins', () => {
      const validationResult = validatePriceCostRelationship(60, 100);

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.warnings).toHaveLength(0);
      expect(validationResult.profitMargin).toBeCloseTo(40, 2);
      expect(validationResult.profitPercentage).toBeCloseTo(66.67, 2);
    });

    it('should suggest optimal pricing based on target margin', () => {
      const cost = 100;
      const targetMarginPercentage = 50;

      const suggestedPrice = calculatePriceForTargetMargin(cost, targetMarginPercentage);
      expect(suggestedPrice).toBe(150);

      const actualMargin = calculateProfitPercentage(cost, suggestedPrice);
      expect(actualMargin).toBeCloseTo(targetMarginPercentage, 2);
    });
  });

  describe('Bulk Pricing Calculations', () => {
    it('should calculate tiered pricing correctly', () => {
      const baseCost = 100;
      const tiers = [
        { minQuantity: 1, maxQuantity: 10, marginPercentage: 50 },
        { minQuantity: 11, maxQuantity: 50, marginPercentage: 40 },
        { minQuantity: 51, maxQuantity: Infinity, marginPercentage: 30 }
      ];

      const testCases = [
        { quantity: 5, expectedPrice: 150 },
        { quantity: 25, expectedPrice: 140 },
        { quantity: 100, expectedPrice: 130 }
      ];

      testCases.forEach(({ quantity, expectedPrice }) => {
        const price = calculateTieredPrice(baseCost, quantity, tiers);
        expect(price).toBe(expectedPrice);
      });
    });

    it('should apply volume discounts correctly', () => {
      const basePrice = 100;
      const discountTiers = [
        { minQuantity: 10, discountPercentage: 5 },
        { minQuantity: 50, discountPercentage: 10 },
        { minQuantity: 100, discountPercentage: 15 }
      ];

      const testCases = [
        { quantity: 5, expectedPrice: 100 },
        { quantity: 15, expectedPrice: 95 },
        { quantity: 75, expectedPrice: 90 },
        { quantity: 150, expectedPrice: 85 }
      ];

      testCases.forEach(({ quantity, expectedPrice }) => {
        const price = applyVolumeDiscount(basePrice, quantity, discountTiers);
        expect(price).toBe(expectedPrice);
      });
    });
  });

  describe('Tax Calculations', () => {
    it('should calculate VAT correctly', () => {
      const vatRate = 0.12; // 12% VAT in Philippines
      const testCases = [
        { price: 100, expectedVAT: 12, expectedTotal: 112 },
        { price: 250, expectedVAT: 30, expectedTotal: 280 },
        { price: 1000, expectedVAT: 120, expectedTotal: 1120 }
      ];

      testCases.forEach(({ price, expectedVAT, expectedTotal }) => {
        const vat = calculateVAT(price, vatRate);
        const total = calculatePriceWithVAT(price, vatRate);

        expect(vat).toBeCloseTo(expectedVAT, 2);
        expect(total).toBeCloseTo(expectedTotal, 2);
      });
    });

    it('should calculate VAT-inclusive and VAT-exclusive prices', () => {
      const vatRate = 0.12;
      const testCases = [
        { vatInclusivePrice: 112, expectedVATExclusive: 100, expectedVAT: 12 },
        { vatInclusivePrice: 280, expectedVATExclusive: 250, expectedVAT: 30 }
      ];

      testCases.forEach(({ vatInclusivePrice, expectedVATExclusive, expectedVAT }) => {
        const vatExclusive = calculateVATExclusivePrice(vatInclusivePrice, vatRate);
        const vat = vatInclusivePrice - vatExclusive;

        expect(vatExclusive).toBeCloseTo(expectedVATExclusive, 2);
        expect(vat).toBeCloseTo(expectedVAT, 2);
      });
    });

    it('should handle tax-exempt products', () => {
      const price = 100;
      const vatRate = 0.12;

      const result = calculateTaxes(price, { isVATExempt: true, vatRate });

      expect(result.vat).toBe(0);
      expect(result.totalWithTax).toBe(price);
      expect(result.isExempt).toBe(true);
    });
  });

  describe('Currency Conversion', () => {
    it('should convert between currencies correctly', () => {
      const exchangeRates = {
        USD: 0.018, // 1 PHP = 0.018 USD
        EUR: 0.016, // 1 PHP = 0.016 EUR
        JPY: 2.5    // 1 PHP = 2.5 JPY
      };

      const phpPrice = 1000;

      const usdPrice = convertCurrency(phpPrice, 'PHP', 'USD', exchangeRates);
      const eurPrice = convertCurrency(phpPrice, 'PHP', 'EUR', exchangeRates);
      const jpyPrice = convertCurrency(phpPrice, 'PHP', 'JPY', exchangeRates);

      expect(usdPrice).toBeCloseTo(18, 2);
      expect(eurPrice).toBeCloseTo(16, 2);
      expect(jpyPrice).toBeCloseTo(2500, 2);
    });

    it('should handle currency rounding correctly', () => {
      const exchangeRate = 0.018567; // More precise rate
      const phpPrice = 1000;

      const usdPrice = convertCurrency(phpPrice, 'PHP', 'USD', { USD: exchangeRate });
      
      // Should round to 2 decimal places for currency
      expect(usdPrice).toBeCloseTo(18.57, 2);
      expect(Number(usdPrice.toFixed(2))).toBe(18.57);
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very large numbers correctly', () => {
      const largeCost = 999999.99;
      const largePrice = 1999999.99;

      const margin = calculateProfitMargin(largeCost, largePrice);
      const percentage = calculateProfitPercentage(largeCost, largePrice);

      expect(margin).toBeCloseTo(1000000, 2);
      expect(percentage).toBeCloseTo(100, 2);
    });

    it('should handle very small numbers correctly', () => {
      const smallCost = 0.01;
      const smallPrice = 0.02;

      const margin = calculateProfitMargin(smallCost, smallPrice);
      const percentage = calculateProfitPercentage(smallCost, smallPrice);

      expect(margin).toBeCloseTo(0.01, 2);
      expect(percentage).toBeCloseTo(100, 2);
    });

    it('should handle floating point precision issues', () => {
      const cost = 0.1;
      const price = 0.2;

      const margin = calculateProfitMargin(cost, price);
      
      // Should handle floating point precision correctly
      expect(margin).toBeCloseTo(0.1, 10);
    });

    it('should validate calculations are performant', () => {
      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        calculateProfitMargin(Math.random() * 100, Math.random() * 200);
        calculateProfitPercentage(Math.random() * 100, Math.random() * 200);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete 10,000 calculations in less than 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});

// Helper functions for price and cost validation
function isValidPrice(price: number): boolean {
  return typeof price === 'number' && 
         !isNaN(price) && 
         isFinite(price) && 
         price > 0;
}

function isValidCost(cost: number, options: { allowZero?: boolean } = {}): boolean {
  if (typeof cost !== 'number' || isNaN(cost) || !isFinite(cost)) {
    return false;
  }
  
  return options.allowZero ? cost >= 0 : cost > 0;
}

function hasValidPricePrecision(price: number): boolean {
  const decimalPlaces = (price.toString().split('.')[1] || '').length;
  return decimalPlaces <= 2;
}

function hasValidCostPrecision(cost: number): boolean {
  const decimalPlaces = (cost.toString().split('.')[1] || '').length;
  return decimalPlaces <= 2;
}

function isWithinPriceRange(price: number): boolean {
  const minPrice = 0.01;
  const maxPrice = 999999.99;
  return price >= minPrice && price <= maxPrice;
}

function formatCurrency(amount: number, currency: string = 'PHP'): string {
  const formatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return formatter.format(amount);
}

function calculateProfitMargin(cost: number, price: number): number {
  return price - cost;
}

function calculateProfitPercentage(cost: number, price: number): number {
  if (cost === 0) return price > 0 ? Infinity : 0;
  return ((price - cost) / cost) * 100;
}

function calculateMarkupPercentage(cost: number, price: number): number {
  if (cost === 0) return price > 0 ? Infinity : 0;
  return ((price - cost) / cost) * 100;
}

function calculateBreakEvenPrice(cost: number, overheadPercentage: number): number {
  return cost * (1 + overheadPercentage / 100);
}

function validatePriceCostRelationship(
  cost: number, 
  price: number, 
  options: { minMarginPercentage?: number } = {}
): {
  isValid: boolean;
  warnings: string[];
  profitMargin: number;
  profitPercentage: number;
} {
  const warnings: string[] = [];
  const profitMargin = calculateProfitMargin(cost, price);
  const profitPercentage = calculateProfitPercentage(cost, price);

  if (price < cost) {
    warnings.push('Price is less than cost');
  }

  if (options.minMarginPercentage && profitPercentage < options.minMarginPercentage) {
    warnings.push('Profit margin below minimum threshold');
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    profitMargin,
    profitPercentage
  };
}

function calculatePriceForTargetMargin(cost: number, targetMarginPercentage: number): number {
  return cost * (1 + targetMarginPercentage / 100);
}

function calculateTieredPrice(
  baseCost: number, 
  quantity: number, 
  tiers: Array<{ minQuantity: number; maxQuantity: number; marginPercentage: number }>
): number {
  const tier = tiers.find(t => quantity >= t.minQuantity && quantity <= t.maxQuantity);
  if (!tier) return baseCost;
  
  return baseCost * (1 + tier.marginPercentage / 100);
}

function applyVolumeDiscount(
  basePrice: number, 
  quantity: number, 
  discountTiers: Array<{ minQuantity: number; discountPercentage: number }>
): number {
  const applicableTier = discountTiers
    .filter(tier => quantity >= tier.minQuantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0];
  
  if (!applicableTier) return basePrice;
  
  return basePrice * (1 - applicableTier.discountPercentage / 100);
}

function calculateVAT(price: number, vatRate: number): number {
  return price * vatRate;
}

function calculatePriceWithVAT(price: number, vatRate: number): number {
  return price * (1 + vatRate);
}

function calculateVATExclusivePrice(vatInclusivePrice: number, vatRate: number): number {
  return vatInclusivePrice / (1 + vatRate);
}

function calculateTaxes(
  price: number, 
  options: { isVATExempt?: boolean; vatRate: number }
): {
  vat: number;
  totalWithTax: number;
  isExempt: boolean;
} {
  if (options.isVATExempt) {
    return {
      vat: 0,
      totalWithTax: price,
      isExempt: true
    };
  }

  const vat = calculateVAT(price, options.vatRate);
  return {
    vat,
    totalWithTax: price + vat,
    isExempt: false
  };
}

function convertCurrency(
  amount: number, 
  fromCurrency: string, 
  toCurrency: string, 
  exchangeRates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount;
  
  const rate = exchangeRates[toCurrency];
  if (!rate) throw new Error(`Exchange rate not found for ${toCurrency}`);
  
  const convertedAmount = amount * rate;
  return Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places
}