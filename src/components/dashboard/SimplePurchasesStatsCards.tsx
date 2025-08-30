import React from 'react';
import { ShoppingCart, Package, TrendingUp, AlertTriangle } from 'lucide-react';
import StatsCard from '../StatsCard';
import { SimplePurchasesMetrics } from '../../services/simplePurchasesDashboardService';

interface SimplePurchasesStatsCardsProps {
  metrics: SimplePurchasesMetrics | null;
  loading?: boolean;
}

const SimplePurchasesStatsCards: React.FC<SimplePurchasesStatsCardsProps> = React.memo(({
  metrics,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-2 md:gap-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="p-0.5 sm:p-2 md:p-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Use metrics or default to zero values
  const safeMetrics = metrics || {
    totalPurchasesValue: 0,
    totalPurchasesChange: 0,
    activePurchaseOrders: 0,
    pendingOrders: 0,
    averageOrderValue: 0,
    monthlySpending: 0
  };

  const statsData = [
    {
      title: 'Monthly Purchases',
      value: `₱${safeMetrics.totalPurchasesValue.toLocaleString()}`,
      change: `${safeMetrics.totalPurchasesChange >= 0 ? '+' : ''}${safeMetrics.totalPurchasesChange.toFixed(1)}%`,
      trend: safeMetrics.totalPurchasesChange >= 0 ? 'up' as const : 'down' as const,
      icon: ShoppingCart,
      color: 'blue' as const
    },
    {
      title: 'Active Orders',
      value: safeMetrics.activePurchaseOrders.toString(),
      change: `${safeMetrics.pendingOrders} pending`,
      trend: 'up' as const,
      icon: Package,
      color: 'purple' as const
    },
    {
      title: 'Average Order Value',
      value: `₱${safeMetrics.averageOrderValue.toLocaleString()}`,
      change: 'vs last month',
      trend: 'up' as const,
      icon: TrendingUp,
      color: 'green' as const
    },
    {
      title: 'Pending Orders',
      value: safeMetrics.pendingOrders.toString(),
      change: 'need attention',
      trend: safeMetrics.pendingOrders > 5 ? 'down' as const : 'up' as const,
      icon: AlertTriangle,
      color: safeMetrics.pendingOrders > 5 ? 'red' as const : 'orange' as const
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-2 md:gap-4">
      {statsData.map((stat, index) => (
        <div key={index} className="p-0.5 sm:p-2 md:p-4">
          <StatsCard {...stat} />
        </div>
      ))}
    </div>
  );
});

SimplePurchasesStatsCards.displayName = 'SimplePurchasesStatsCards';

export default SimplePurchasesStatsCards;