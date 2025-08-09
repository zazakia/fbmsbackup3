import { useState, useEffect, useCallback } from 'react';
import { purchasesDashboardService, PurchasesDashboardData } from '../services/purchasesDashboardService';

interface UsePurchasesDashboardDataReturn {
  data: PurchasesDashboardData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function usePurchasesDashboardData(): UsePurchasesDashboardDataReturn {
  const [data, setData] = useState<PurchasesDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      console.log('Hook: Starting to fetch purchases data...');
      setLoading(true);
      setError(null);
      const dashboardData = await purchasesDashboardService.getDashboardData();
      console.log('Hook: Received dashboard data:', dashboardData);
      setData(dashboardData);
    } catch (err) {
      console.error('Hook: Error fetching purchases dashboard data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch purchases data'));
    } finally {
      setLoading(false);
      console.log('Hook: Finished fetching data');
    }
  }, []);

  const refetch = useCallback(async () => {
    // Clear cache before refetching
    purchasesDashboardService.clearCache();
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch
  };
}