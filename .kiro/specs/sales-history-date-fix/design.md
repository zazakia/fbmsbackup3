# Design Document

## Overview

The "Invalid time value" error in the sales history display is caused by improper date/time handling when retrieving and displaying sales data from the Supabase sales table. The issue occurs when the JavaScript `Date` constructor receives invalid or malformed date strings, causing the entire sales history view to break.

Based on code analysis, the problem stems from:
1. Direct `new Date(sale.created_at)` calls without validation in the sales API
2. Lack of error handling for invalid date values in the SalesHistory component
3. Missing fallback mechanisms when date parsing fails
4. Inconsistent date formatting across different views

## Architecture

### Current Date Handling Flow
```
Supabase Database → Sales API → Business Store → SalesHistory Component → Date Display
```

### Proposed Enhanced Flow
```
Supabase Database → Sales API (with validation) → Business Store → SalesHistory Component (with error handling) → Safe Date Display
```

## Components and Interfaces

### 1. Enhanced Date Utilities (`src/utils/formatters.ts`)

**Current Implementation Issues:**
- `parseDate()` function exists but isn't consistently used
- `formatDate()` has basic error handling but doesn't handle all edge cases
- No specific handling for Supabase timestamp formats

**Enhanced Implementation:**
```typescript
// Enhanced date parsing with Supabase-specific handling
export const parseSupabaseDate = (date: string | null | undefined): Date | null => {
  if (!date) return null;
  
  try {
    // Handle Supabase timestamp formats
    const parsed = new Date(date);
    
    // Validate the parsed date
    if (isNaN(parsed.getTime())) {
      console.warn('Invalid date from Supabase:', date);
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.error('Error parsing Supabase date:', date, error);
    return null;
  }
};

// Safe date formatting with fallbacks
export const formatSalesDate = (
  date: string | Date | null | undefined, 
  format: 'short' | 'long' | 'time' | 'relative' = 'short'
): string => {
  const dateObj = typeof date === 'string' ? parseSupabaseDate(date) : parseDate(date);
  
  if (!dateObj) {
    return 'Date unavailable';
  }
  
  try {
    switch (format) {
      case 'relative':
        return formatRelativeTime(dateObj);
      case 'long':
        return dateObj.toLocaleDateString('en-PH', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      case 'time':
        return dateObj.toLocaleTimeString('en-PH', {
          hour: '2-digit',
          minute: '2-digit'
        });
      default:
        return dateObj.toLocaleDateString('en-PH');
    }
  } catch (error) {
    console.warn('Error formatting sales date:', date, error);
    return 'Date format error';
  }
};

// Relative time formatting (e.g., "2 hours ago")
export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-PH');
};
```

### 2. Enhanced Sales API (`src/api/sales.ts`)

**Current Issues:**
- Direct `new Date(data.created_at)` without validation
- No error handling for malformed timestamps
- Inconsistent date transformation across functions

**Enhanced Implementation:**
```typescript
import { parseSupabaseDate } from '../utils/formatters';

// Safe date transformation helper
const transformSaleData = (saleData: any) => {
  const createdAt = parseSupabaseDate(saleData.created_at);
  
  return {
    id: saleData.id,
    invoiceNumber: saleData.invoice_number,
    customerId: saleData.customer_id,
    customerName: saleData.customer_name,
    items: saleData.items || [],
    subtotal: saleData.subtotal || 0,
    tax: saleData.tax || 0,
    discount: saleData.discount || 0,
    total: saleData.total || 0,
    paymentMethod: saleData.payment_method,
    paymentStatus: saleData.payment_status,
    status: saleData.status,
    cashierId: saleData.cashier_id,
    notes: saleData.notes,
    createdAt: createdAt || new Date(), // Fallback to current date
    hasValidDate: createdAt !== null // Flag for UI handling
  };
};
```

### 3. Enhanced SalesHistory Component (`src/components/sales/SalesHistory.tsx`)

**Current Issues:**
- Direct date operations without error handling
- No fallback UI for invalid dates
- Date filtering logic assumes valid dates

**Enhanced Implementation:**
```typescript
import { formatSalesDate, parseSupabaseDate } from '../../utils/formatters';

// Safe date display component
const SafeDateDisplay: React.FC<{ date: Date | string | null; format?: string }> = ({ 
  date, 
  format = 'short' 
}) => {
  const formattedDate = formatSalesDate(date, format as any);
  const isInvalid = formattedDate.includes('unavailable') || formattedDate.includes('error');
  
  return (
    <div className={isInvalid ? 'text-red-500' : ''}>
      {formattedDate}
      {isInvalid && (
        <div className="text-xs text-gray-400">
          Data issue
        </div>
      )}
    </div>
  );
};

// Enhanced date filtering with validation
const isDateInRange = (saleDate: Date | string | null, startDate: string, endDate: string): boolean => {
  const parsedSaleDate = typeof saleDate === 'string' ? parseSupabaseDate(saleDate) : saleDate;
  
  if (!parsedSaleDate) {
    // Include invalid dates in results but flag them
    return true;
  }
  
  try {
    const saleDateStr = parsedSaleDate.toISOString().split('T')[0];
    return saleDateStr >= startDate && saleDateStr <= endDate;
  } catch (error) {
    console.warn('Error comparing dates:', saleDate, error);
    return true; // Include problematic dates for visibility
  }
};
```

## Data Models

### Enhanced Sale Type
```typescript
interface Sale {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: SaleStatus;
  cashierId?: string;
  notes?: string;
  createdAt: Date | null; // Allow null for invalid dates
  hasValidDate?: boolean; // Flag for UI handling
}
```

### Date Validation Result
```typescript
interface DateValidationResult {
  isValid: boolean;
  parsedDate: Date | null;
  originalValue: string | null;
  errorMessage?: string;
}
```

## Error Handling

### 1. API Level Error Handling
- Validate all date fields from Supabase before transformation
- Log invalid date values for debugging
- Provide fallback dates when necessary
- Include validation flags in response data

### 2. Component Level Error Handling
- Use safe date display components
- Show user-friendly error messages for invalid dates
- Provide fallback UI when date operations fail
- Allow filtering and sorting to continue working with invalid dates

### 3. User Experience
- Display "Date unavailable" instead of "Invalid Date"
- Show data quality indicators for problematic records
- Maintain functionality even with some invalid dates
- Provide export functionality that handles date issues gracefully

## Testing Strategy

### 1. Unit Tests
- Test date parsing functions with various invalid inputs
- Test date formatting functions with edge cases
- Test API transformation functions with malformed data
- Test component rendering with invalid date props

### 2. Integration Tests
- Test sales history display with mixed valid/invalid dates
- Test date filtering with problematic data
- Test export functionality with date issues
- Test sorting functionality with invalid dates

### 3. Data Quality Tests
- Identify existing invalid dates in the database
- Test migration scenarios for fixing existing data
- Test real-time handling of new invalid dates
- Validate timezone handling for Philippine Standard Time

### 4. Error Scenarios
```typescript
// Test cases for date validation
const testCases = [
  { input: null, expected: null },
  { input: undefined, expected: null },
  { input: '', expected: null },
  { input: 'invalid-date', expected: null },
  { input: '2024-13-45', expected: null },
  { input: '2024-01-15T10:30:00Z', expected: validDate },
  { input: '2024-01-15T10:30:00.000Z', expected: validDate },
  { input: new Date('invalid'), expected: null }
];
```

## Performance Considerations

### 1. Date Parsing Optimization
- Cache parsed dates to avoid repeated parsing
- Use efficient date validation methods
- Minimize date operations in render loops

### 2. Error Logging
- Throttle error logging to prevent spam
- Use structured logging for date validation issues
- Implement error aggregation for monitoring

### 3. Fallback Strategies
- Use lightweight fallback dates
- Implement progressive enhancement for date features
- Maintain responsive UI even with date processing errors