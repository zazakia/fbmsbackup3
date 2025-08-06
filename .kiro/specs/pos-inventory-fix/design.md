# Design Document

## Overview

This design document outlines the technical solution to fix the critical inventory management bug in the POS system where sales transactions incorrectly increase inventory quantities instead of decreasing them. The root cause is in the `createMovementRecord` function where the `'sale'` movement type is not properly categorized as a stock-decreasing operation.

## Architecture

### Current System Flow (Buggy)
1. **Sale Completion**: `createSale()` calls `updateStock(productId, -quantity, 'sale')`
2. **Stock Update**: `updateStock()` calls `createMovementRecord()` with `Math.abs(quantity)` and type `'sale'`
3. **Movement Processing**: `createMovementRecord()` checks if `'sale'` is in the negative types array
4. **Bug**: `'sale'` is NOT in `['stock_out', 'adjustment_out', 'transfer_out', 'return_out', 'damage_out', 'expired_out']`
5. **Result**: Stock is INCREASED instead of decreased

### Fixed System Flow
1. **Sale Completion**: `createSale()` calls `updateStock()` with proper parameters
2. **Stock Update**: `updateStock()` correctly identifies sale as stock-decreasing operation
3. **Movement Processing**: `createMovementRecord()` properly handles sales as negative stock changes
4. **Result**: Stock is correctly DECREASED

## Components and Interfaces

### BusinessStore Interface Updates

```typescript
interface StockUpdateOptions {
  referenceId?: string;
  referenceType?: string;
  userId?: string;
  notes?: string;
  preventNegative?: boolean;
}

interface StockMovementResult {
  success: boolean;
  previousStock: number;
  newStock: number;
  actualChange: number;
  error?: string;
}
```

### Movement Type Classification

```typescript
// Stock decreasing operations (outbound)
const STOCK_OUT_TYPES = [
  'sale',           // Sales transactions (NEW)
  'stock_out',      // General stock out
  'adjustment_out', // Negative adjustments
  'transfer_out',   // Transfers to other locations
  'return_out',     // Returns to suppliers
  'damage_out',     // Damaged goods
  'expired_out',    // Expired products
  'shrinkage'       // Inventory shrinkage (NEW)
];

// Stock increasing operations (inbound)
const STOCK_IN_TYPES = [
  'purchase',       // Purchase orders
  'stock_in',       // General stock in
  'adjustment_in',  // Positive adjustments
  'transfer_in',    // Transfers from other locations
  'return_in',      // Customer returns
  'production'      // Manufactured goods
];
```

## Data Models

### Enhanced Stock Movement Record

```typescript
interface StockMovement {
  id: string;
  productId: string;
  type: ProductMovementType;
  quantity: number;           // Always positive (absolute value)
  direction: 'in' | 'out';    // Explicit direction indicator
  previousStock: number;
  newStock: number;
  actualChange: number;       // Signed value (+/-)
  referenceId?: string;       // Sale ID, PO ID, etc.
  referenceType: string;      // 'sale', 'purchase', 'adjustment'
  userId?: string;
  reason: string;
  notes?: string;
  createdAt: Date;
}
```

### Sale Item Processing

```typescript
interface SaleItemStockUpdate {
  productId: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  success: boolean;
  error?: string;
}

interface SaleStockUpdateResult {
  success: boolean;
  items: SaleItemStockUpdate[];
  errors: string[];
}
```

## Error Handling

### Stock Validation Scenarios

1. **Insufficient Stock**: Prevent sale if any item quantity exceeds available stock
2. **Negative Stock Prevention**: Ensure stock never goes below zero
3. **Concurrent Updates**: Handle race conditions when multiple sales occur simultaneously
4. **Database Failures**: Graceful handling of movement record creation failures
5. **Rollback Capability**: Ability to reverse stock changes if sale fails

### Error Response Structure

```typescript
interface StockUpdateError {
  code: 'INSUFFICIENT_STOCK' | 'NEGATIVE_STOCK' | 'PRODUCT_NOT_FOUND' | 'DATABASE_ERROR';
  message: string;
  productId: string;
  requestedQuantity: number;
  availableStock: number;
  suggestions?: string[];
}
```

## Testing Strategy

### Unit Tests
- Test `createMovementRecord` with all movement types
- Verify stock calculations for positive and negative changes
- Test edge cases (zero stock, exact stock match)
- Validate error handling for insufficient stock

### Integration Tests
- End-to-end sale processing with stock updates
- Multiple item sales with mixed stock levels
- Concurrent sale processing
- Database transaction rollback scenarios

### Data Integrity Tests
- Verify stock levels after multiple operations
- Check movement record accuracy
- Validate audit trail completeness
- Test stock reconciliation

## Implementation Approach

### Phase 1: Fix Core Bug
1. **Update Movement Type Classification**: Add `'sale'` to stock-decreasing types
2. **Fix Stock Calculation Logic**: Ensure sales properly decrease inventory
3. **Add Validation**: Prevent negative stock scenarios
4. **Test Basic Functionality**: Verify single-item sales work correctly

### Phase 2: Enhanced Error Handling
1. **Implement Stock Validation**: Check availability before processing
2. **Add Rollback Capability**: Handle partial failures in multi-item sales
3. **Improve Error Messages**: Provide clear feedback for stock issues
4. **Add Logging**: Enhanced debugging for stock operations

### Phase 3: Audit and Monitoring
1. **Movement Record Enhancement**: Improve tracking and reporting
2. **Stock Reconciliation**: Add tools to verify stock accuracy
3. **Performance Optimization**: Optimize concurrent stock updates
4. **Monitoring Dashboard**: Real-time stock movement tracking

## Technical Specifications

### Database Considerations
- Ensure atomic operations for multi-item sales
- Add database constraints to prevent negative stock
- Implement proper indexing for stock movement queries
- Consider using database triggers for audit trails

### Performance Requirements
- Stock updates should complete within 100ms
- Support concurrent sales without data corruption
- Efficient querying of stock movement history
- Minimal impact on POS transaction speed

### Security Considerations
- Validate user permissions for stock adjustments
- Log all stock changes with user attribution
- Prevent unauthorized stock modifications
- Secure API endpoints for stock operations

## Migration Strategy

### Data Cleanup
1. **Identify Affected Records**: Find sales with incorrect stock movements
2. **Calculate Corrections**: Determine proper stock adjustments needed
3. **Apply Corrections**: Update stock levels and movement records
4. **Verify Integrity**: Ensure all corrections are accurate

### Rollout Plan
1. **Development Testing**: Comprehensive testing in development environment
2. **Staging Validation**: Full system testing with production-like data
3. **Backup Creation**: Full database backup before deployment
4. **Gradual Rollout**: Deploy during low-traffic periods
5. **Monitoring**: Close monitoring of stock operations post-deployment