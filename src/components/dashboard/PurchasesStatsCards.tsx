import React from 'react';
import { ShoppingCart, Package, TrendingUp, AlertTriangle } from 'lucide-react';
import StatsCard from '../StatsCard';
import { PurchasesMetrics } from '../../services/purchasesDashboardService';

interface PurchasesStatsCardsProps {
  metrics: PurchasesMetrics | null;
  loading?: boolean;
}

const PurchasesStatsCards: React.FC<PurchasesStatsCardsProps> = ({ 
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

  if (!metrics) {
    // Show default/empty state with zero values
    const emptyStatsData = [
      {
        title: 'Monthly Purchases',
        value: '₱0',
        change: '0%',
        trend: 'up' as const,
        icon: ShoppingCart,
        color: 'blue' as const
      },
      {
        title: 'Active Orders',
        value: '0',
        change: '0 pending',
        trend: 'up' as const,
        icon: Package,
        color: 'purple' as const
      },
      {
        title: 'Average Order Value',
        value: '₱0',
        change: 'vs last month',
        trend: 'up' as const,
        icon: TrendingUp,
        color: 'green' as const
      },
      {
        title: 'Pending Orders',
        value: '0',
        change: 'need attention',
        trend: 'up' as const,
        icon: AlertTriangle,
        color: 'orange' as const
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1 sm:gap-2 md:gap-4">
        {emptyStatsData.map((stat, index) => (
          <div key={index} className="p-0.5 sm:p-2 md:p-4">
            <StatsCard {...stat} />
          </div>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: 'Monthly Purchases',
      value: `₱${metrics.totalPurchasesValue.toLocaleString()}`,
      change: `${metrics.totalPurchasesChange >= 0 ? '+' : ''}${metrics.totalPurchasesChange.toFixed(1)}%`,
      trend: metrics.totalPurchasesChange >= 0 ? 'up' as const : 'down' as const,
      icon: ShoppingCart,
      color: 'blue' as const
    },
    {
      title: 'Active Orders',
      value: metrics.activePurchaseOrders.toString(),
      change: `${metrics.pendingOrders} pending`,
      trend: 'up' as const,
      icon: Package,
      color: 'purple' as const
    },
    {
      title: 'Average Order Value',
      value: `₱${metrics.averageOrderValue.toLocaleString()}`,
      change: 'vs last month',
      trend: 'up' as const,
      icon: TrendingUp,
      color: 'green' as const
    },
    {
      title: 'Pending Orders',
      value: metrics.pendingOrders.toString(),
      change: 'need attention',
      trend: metrics.pendingOrders > 5 ? 'down' as const : 'up' as const,
      icon: AlertTriangle,
      color: metrics.pendingOrders > 5 ? 'red' as const : 'orange' as const
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
};

export default PurchasesStatsCards;