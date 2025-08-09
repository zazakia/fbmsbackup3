import { useState, useEffect, useCallback } from 'react';
import { getSimplePurchasesData, SimplePurchasesMetrics } from '../services/simplePurchasesDashboardService';

interface UseSimplePurchasesDataReturn {
  data: SimplePurchasesMetrics | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useSimplePurchasesData(): UseSimplePurchasesDataReturn {
  const [data, setData] = useState<SimplePurchasesMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      console.log('Simple hook: Starting to fetch purchases data...');
      setLoading(true);
      setError(null);
      const metrics = await getSimplePurchasesData();
      console.log('Simple hook: Received metrics:', metrics);
      setData(metrics);
    } catch (err) {
      console.error('Simple hook: Error fetching purchases data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch purchases data'));
    } finally {
      setLoading(false);
      console.log('Simple hook: Finished fetching data');
    }
  }, []);

  const refetch = useCallback(async () => {
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