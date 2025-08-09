import { useState, useEffect, useCallback } from 'react';
import { 
  receivingDashboardService, 
  ReceivingMetrics, 
  OverdueAlert 
} from '../services/receivingDashboardService';
import { EnhancedPurchaseOrder } from '../types/business';

interface UseReceivingDashboardDataReturn {
  data: {
    queue: EnhancedPurchaseOrder[];
    metrics: ReceivingMetrics | null;
    alerts: OverdueAlert[];
  } | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useReceivingDashboardData(): UseReceivingDashboardDataReturn {
  const [data, setData] = useState<{
    queue: EnhancedPurchaseOrder[];
    metrics: ReceivingMetrics | null;
    alerts: OverdueAlert[];
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      console.log('Receiving hook: Starting to fetch dashboard data...');
      setLoading(true);
      setError(null);
      
      // Fetch all dashboard data in parallel
      const [queue, metrics, alerts] = await Promise.all([
        receivingDashboardService.getReceivingQueue(),
        receivingDashboardService.getReceivingMetrics(),
        receivingDashboardService.getOverdueAlerts()
      ]);
      
      console.log('Receiving hook: Received data:', { 
        queueLength: queue.length, 
        metricsAvailable: !!metrics,
        alertsLength: alerts.length 
      });
      
      setData({
        queue,
        metrics,
        alerts
      });
    } catch (err) {
      console.error('Receiving hook: Error fetching dashboard data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch receiving dashboard data'));
    } finally {
      setLoading(false);
      console.log('Receiving hook: Finished fetching data');
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