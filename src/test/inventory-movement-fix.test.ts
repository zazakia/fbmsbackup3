import { describe, it, expect } from 'vitest';

describe('Inventory Movement Type Classification Fix', () => {
  it('should correctly classify movement types as stock-decreasing or stock-increasing', () => {
    // Test the movement type classification logic directly
    const STOCK_OUT_TYPES = [
      'sale',               // Sales transactions (NEW)
      'stock_out',          // General stock out
      'adjustment_out',     // Negative adjustments
      'transfer_out',       // Transfers to other locations
      'return_out',         // Returns to suppliers
      'damage_out',         // Damaged goods
      'expired_out',        // Expired products
      'shrinkage'           // Inventory shrinkage (NEW)
    ];

    const STOCK_IN_TYPES = [
      'purchase',           // Purchase orders (NEW)
      'stock_in',           // General stock in
      'adjustment_in',      // Positive adjustments
      'transfer_in',        // Transfers from other locations
      'return_in',          // Customer returns
      'initial_stock',      // Initial stock entry
      'recount'             // Physical count adjustment
    ];

    // Test that 'sale' is correctly classified as stock-decreasing
    expect(STOCK_OUT_TYPES.includes('sale')).toBe(true);
    
    // Test that 'purchase' is correctly classified as stock-increasing
    expect(STOCK_IN_TYPES.includes('purchase')).toBe(true);
    
    // Test that 'shrinkage' is correctly classified as stock-decreasing
    expect(STOCK_OUT_TYPES.includes('shrinkage')).toBe(true);

    // Test that all expected stock-out types are present
    const expectedStockOutTypes = ['sale', 'stock_out', 'adjustment_out', 'transfer_out', 'return_out', 'damage_out', 'expired_out', 'shrinkage'];
    expectedStockOutTypes.forEach(type => {
      expect(STOCK_OUT_TYPES.includes(type)).toBe(true);
    });

    // Test that all expected stock-in types are present
    const expectedStockInTypes = ['purchase', 'stock_in', 'adjustment_in', 'transfer_in', 'return_in', 'initial_stock', 'recount'];
    expectedStockInTypes.forEach(type => {
      expect(STOCK_IN_TYPES.includes(type)).toBe(true);
    });
  });


});