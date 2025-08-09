import { useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { purchasesDashboardService } from '../services/purchasesDashboardService';

interface UsePurchasesSubscriptionsProps {
  onDataChange?: () => void;
  enabled?: boolean;
}

export function usePurchasesSubscriptions({ 
  onDataChange, 
  enabled = true 
}: UsePurchasesSubscriptionsProps = {}) {
  const handleDataChange = useCallback(() => {
    // Clear cache when data changes
    purchasesDashboardService.clearCache();
    
    // Notify parent component
    if (onDataChange) {
      onDataChange();
    }
  }, [onDataChange]);

  useEffect(() => {
    if (!enabled) return;

    // Subscribe to purchase_orders table changes
    const purchaseOrdersSubscription = supabase
      .channel('purchase_orders_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_orders'
        },
        (payload) => {
          console.log('Purchase order changed:', payload);
          handleDataChange();
        }
      )
      .subscribe();

    // Subscribe to suppliers table changes
    const suppliersSubscription = supabase
      .channel('suppliers_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suppliers'
        },
        (payload) => {
          console.log('Supplier changed:', payload);
          handleDataChange();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(purchaseOrdersSubscription);
      supabase.removeChannel(suppliersSubscription);
    };
  }, [enabled, handleDataChange]);

  return {
    // Could return subscription status or other utilities if needed
  };
}