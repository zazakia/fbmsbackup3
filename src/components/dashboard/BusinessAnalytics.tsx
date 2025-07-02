import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, Package, ShoppingCart, AlertTriangle, Target } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';

interface AnalyticsMetric {
  label: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  color: string;
}

const BusinessAnalytics: React.FC = () => {
  const { sales, products, customers, expenses } = useBusinessStore();

  const analytics = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    // Current period (last 30 days)
    const currentSales = sales.filter(sale => new Date(sale.date) >= thirtyDaysAgo);
    const currentRevenue = currentSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const currentTransactions = currentSales.length;

    // Previous period (30-60 days ago)
    const previousSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= sixtyDaysAgo && saleDate < thirtyDaysAgo;
    });
    const previousRevenue = previousSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const previousTransactions = previousSales.length;

    // Calculate changes
    const revenueChange = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;
    
    const transactionChange = previousTransactions > 0
      ? ((currentTransactions - previousTransactions) / previousTransactions) * 100
      : 0;

    // Current expenses (last 30 days)
    const currentExpenses = expenses.filter(expense => new Date(expense.date) >= thirtyDaysAgo);
    const totalExpenses = currentExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Previous expenses (30-60 days ago)
    const previousExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= sixtyDaysAgo && expenseDate < thirtyDaysAgo;
    });
    const previousTotalExpenses = previousExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    const expenseChange = previousTotalExpenses > 0
      ? ((totalExpenses - previousTotalExpenses) / previousTotalExpenses) * 100
      : 0;

    // Profit calculation
    const currentProfit = currentRevenue - totalExpenses;
    const previousProfit = previousRevenue - previousTotalExpenses;
    const profitChange = previousProfit !== 0
      ? ((currentProfit - previousProfit) / Math.abs(previousProfit)) * 100
      : 0;

    // Stock analysis
    const lowStockProducts = products.filter(product => product.stock <= 10);
    const outOfStockProducts = products.filter(product => product.stock <= 0);
    const totalStockValue = products.reduce((sum, product) => sum + (product.price * product.stock), 0);

    // Customer analysis
    const activeCustomers = new Set(currentSales.map(sale => sale.customerId)).size;
    const totalCustomers = customers.length;
    const customerGrowth = totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0;

    const metrics: AnalyticsMetric[] = [
      {
        label: 'Revenue (30 days)',
        value: `₱${currentRevenue.toLocaleString()}`,
        change: revenueChange,
        changeType: revenueChange >= 0 ? 'increase' : 'decrease',
        icon: <DollarSign className="h-5 w-5" />,
        color: 'text-green-600'
      },
      {
        label: 'Profit (30 days)',
        value: `₱${currentProfit.toLocaleString()}`,
        change: profitChange,
        changeType: profitChange >= 0 ? 'increase' : 'decrease',
        icon: <Target className="h-5 w-5" />,
        color: currentProfit >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        label: 'Transactions',
        value: currentTransactions,
        change: transactionChange,
        changeType: transactionChange >= 0 ? 'increase' : 'decrease',
        icon: <ShoppingCart className="h-5 w-5" />,
        color: 'text-blue-600'
      },
      {
        label: 'Active Customers',
        value: `${activeCustomers} / ${totalCustomers}`,
        change: customerGrowth,
        changeType: customerGrowth >= 50 ? 'increase' : customerGrowth >= 25 ? 'neutral' : 'decrease',
        icon: <Users className="h-5 w-5" />,
        color: 'text-purple-600'
      },
      {
        label: 'Stock Value',
        value: `₱${totalStockValue.toLocaleString()}`,
        change: lowStockProducts.length,
        changeType: lowStockProducts.length > 5 ? 'decrease' : 'neutral',
        icon: <Package className="h-5 w-5" />,
        color: 'text-orange-600'
      },
      {
        label: 'Expenses (30 days)',
        value: `₱${totalExpenses.toLocaleString()}`,
        change: expenseChange,
        changeType: expenseChange <= 0 ? 'increase' : 'decrease',
        icon: <TrendingDown className="h-5 w-5" />,
        color: 'text-red-600'
      }
    ];

    return {
      metrics,
      alerts: {
        lowStock: lowStockProducts.length,
        outOfStock: outOfStockProducts.length,
        profitMargin: currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0
      }
    };
  }, [sales, products, customers, expenses]);

  const getChangeIcon = (changeType: AnalyticsMetric['changeType']) => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 bg-gray-300 rounded-full" />;
    }
  };

  const getChangeColor = (changeType: AnalyticsMetric['changeType']) => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {analytics.metrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg bg-gray-50 ${metric.color}`}>
                {metric.icon}
              </div>
              <div className="flex items-center space-x-1">
                {getChangeIcon(metric.changeType)}
                <span className={`text-sm font-medium ${getChangeColor(metric.changeType)}`}>
                  {Math.abs(metric.change).toFixed(1)}%
                </span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
              <p className="text-sm text-gray-600">{metric.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alert Summary */}
      {(analytics.alerts.lowStock > 0 || analytics.alerts.outOfStock > 0 || analytics.alerts.profitMargin < 10) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-medium text-yellow-800">Business Alerts</h3>
          </div>
          <div className="space-y-2">
            {analytics.alerts.outOfStock > 0 && (
              <p className="text-sm text-yellow-700">
                <span className="font-medium">{analytics.alerts.outOfStock}</span> products are out of stock
              </p>
            )}
            {analytics.alerts.lowStock > 0 && (
              <p className="text-sm text-yellow-700">
                <span className="font-medium">{analytics.alerts.lowStock}</span> products have low stock
              </p>
            )}
            {analytics.alerts.profitMargin < 10 && analytics.alerts.profitMargin > 0 && (
              <p className="text-sm text-yellow-700">
                Profit margin is low at <span className="font-medium">{analytics.alerts.profitMargin.toFixed(1)}%</span>
              </p>
            )}
            {analytics.alerts.profitMargin < 0 && (
              <p className="text-sm text-red-700">
                <span className="font-medium">Loss detected:</span> Expenses exceed revenue
              </p>
            )}
          </div>
        </div>
      )}

      {/* Quick Insights */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Best Performing Period</h4>
            <p className="text-sm text-blue-700">
              {analytics.metrics[0].changeType === 'increase' 
                ? 'Revenue is trending upward this month' 
                : 'Consider promotional strategies to boost sales'}
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Inventory Status</h4>
            <p className="text-sm text-green-700">
              {analytics.alerts.lowStock === 0 
                ? 'Inventory levels are healthy' 
                : `${analytics.alerts.lowStock} products need restocking`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessAnalytics;