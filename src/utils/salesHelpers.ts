import { supabase } from './supabase';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';

/**
 * Get the current user ID for sales operations
 * This ensures we always have a valid cashier_id for database constraints
 */
export async function getCurrentCashierId(): Promise<string> {
  try {
    // First try to get from auth store (faster)
    const authUser = useSupabaseAuthStore.getState().user;
    if (authUser?.id) {
      return authUser.id;
    }

    // Fallback to Supabase auth
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      return user.id;
    }

    // Final fallback - create a system user ID
    console.warn('No authenticated user found for sale operation, using system default');
    return 'system-default';
  } catch (error) {
    console.error('Error getting current user for sale:', error);
    return 'system-default';
  }
}

/**
 * Validate sale data before submission
 * This helps catch issues before they reach the database
 */
export function validateSaleData(saleData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields
  if (!saleData.items || !Array.isArray(saleData.items) || saleData.items.length === 0) {
    errors.push('Sale must have at least one item');
  }

  if (typeof saleData.total !== 'number' || saleData.total <= 0) {
    errors.push('Sale total must be a positive number');
  }

  if (!saleData.paymentMethod) {
    errors.push('Payment method is required');
  }

  // Validate items
  if (saleData.items && Array.isArray(saleData.items)) {
    saleData.items.forEach((item: any, index: number) => {
      if (!item.productId && !item.product?.id) {
        errors.push(`Item ${index + 1}: Missing product ID`);
      }
      
      const quantity = Number(item.quantity);
      if (!quantity || quantity <= 0 || !Number.isFinite(quantity)) {
        errors.push(`Item ${index + 1}: Invalid quantity (${item.quantity})`);
      }

      const price = Number(item.price || item.product?.price);
      if (!price || price <= 0 || !Number.isFinite(price)) {
        errors.push(`Item ${index + 1}: Invalid price`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize sale data to ensure it meets database requirements
 */
export async function sanitizeSaleData(saleData: any): Promise<any> {
  const sanitized = { ...saleData };

  // Ensure cashier_id is set
  if (!sanitized.cashierId) {
    sanitized.cashierId = await getCurrentCashierId();
  }

  // Ensure invoice number
  if (!sanitized.invoiceNumber) {
    sanitized.invoiceNumber = `INV-${Date.now()}`;
  }

  // Ensure payment status
  if (!sanitized.paymentStatus) {
    sanitized.paymentStatus = 'pending';
  }

  // Ensure status
  if (!sanitized.status) {
    sanitized.status = 'active';
  }

  // Sanitize items
  if (sanitized.items && Array.isArray(sanitized.items)) {
    sanitized.items = sanitized.items.map((item: any) => ({
      id: item.id || `item-${Date.now()}-${Math.random()}`,
      productId: item.productId || item.product?.id,
      productName: item.productName || item.product?.name || 'Unknown Product',
      sku: item.sku || item.product?.sku || '',
      quantity: Number(item.quantity) || 1,
      price: Number(item.price || item.product?.price) || 0,
      total: Number(item.total) || (Number(item.quantity || 1) * Number(item.price || item.product?.price || 0))
    }));
  }

  return sanitized;
}