import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Package, Users, AlertTriangle } from 'lucide-react';
import { PurchasesAnalytics as PurchasesAnalyticsType, SupplierPerformance } from '../../services/purchasesDashboardService';

interface PurchasesAnalyticsProps {
  analytics: PurchasesAnalyticsType | null;
  supplierPerformance: SupplierPerformance[];
  loading?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const PurchasesAnalytics: React.FC<PurchasesAnalyticsProps> = ({ 
  analytics, 
  supplierPerformance,
  loading = false 
}) => {
  if (loading) {
    return (
      <div className="space-y-1 sm:space-y-3 md:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 sm:gap-3 md:gap-6">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg border border-gray-200 p-1 sm:p-3 md:p-6 shadow-sm animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">Unable to load purchases analytics</p>
      </div>
    );
  }

  const getChangeIcon = (change: number) => {
    return change >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-1 sm:space-y-3 md:space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 sm:gap-3 md:gap-6">
        {/* Year over Year */}
        <div className="bg-white rounded-lg border border-gray-200 p-1 sm:p-3 md:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-1 sm:mb-3 md:mb-4">
            <div className="p-1 rounded-lg bg-gray-50 text-blue-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="flex items-center space-x-1">
              {getChangeIcon(analytics.yearOverYearComparison.changePercentage)}
              <span className={`text-xs font-medium ${getChangeColor(analytics.yearOverYearComparison.changePercentage)}`}>
                {Math.abs(analytics.yearOverYearComparison.changePercentage).toFixed(1)}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">
              ₱{analytics.yearOverYearComparison.currentYear.toLocaleString()}
            </p>
            <p className="text-xs text-gray-600">Year-to-Date Purchases</p>
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white rounded-lg border border-gray-200 p-1 sm:p-3 md:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-1 sm:mb-3 md:mb-4">
            <div className="p-1 rounded-lg bg-gray-50 text-purple-600">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-xs sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">
              {analytics.statusDistribution.reduce((sum, status) => sum + status.count, 0)}
            </p>
            <p className="text-xs text-gray-600">Total Purchase Orders</p>
          </div>
        </div>

        {/* Top Suppliers */}
        <div className="bg-white rounded-lg border border-gray-200 p-1 sm:p-3 md:p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-1 sm:mb-3 md:mb-4">
            <div className="p-1 rounded-lg bg-gray-50 text-green-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-xs sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">
              {supplierPerformance.length}
            </p>
            <p className="text-xs text-gray-600">Active Suppliers</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 sm:gap-3 md:gap-6">
        {/* Monthly Trends Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-1 sm:p-3 md:p-6">
          <h3 className="text-xs sm:text-lg font-medium text-gray-900 mb-1 sm:mb-4">Monthly Spending Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  fontSize={12}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  fontSize={12}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Amount']}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#8884d8" 
                  strokeWidth={2}
                  dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-1 sm:p-3 md:p-6">
          <h3 className="text-xs sm:text-lg font-medium text-gray-900 mb-1 sm:mb-4">Order Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, percentage }) => `${status}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name) => [value, 'Orders']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Supplier Performance */}
      {supplierPerformance.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-1 sm:p-3 md:p-6">
          <h3 className="text-xs sm:text-lg font-medium text-gray-900 mb-1 sm:mb-4">Top Supplier Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierPerformance.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="supplierName" 
                  fontSize={12}
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  fontSize={12}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Total Value']}
                  labelFormatter={(label) => `Supplier: ${label}`}
                />
                <Bar dataKey="totalValue" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {analytics.categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-1 sm:p-3 md:p-6">
          <h3 className="text-xs sm:text-lg font-medium text-gray-900 mb-1 sm:mb-4">Purchases by Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 sm:gap-4">
            {analytics.categoryBreakdown.slice(0, 6).map((category, index) => (
              <div key={category.category} className="flex items-center justify-between p-1 sm:p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">
                    {category.category}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900">
                    ₱{category.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {category.percentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Insights */}
      <div className="bg-white rounded-lg border border-gray-200 p-1 sm:p-3 md:p-6">
        <h3 className="text-xs sm:text-lg font-medium text-gray-900 mb-1 sm:mb-4">Purchases Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 sm:gap-4">
          <div className="p-1 sm:p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-1 sm:mb-2 text-xs sm:text-base">Spending Trend</h4>
            <p className="text-xs text-blue-700">
              {analytics.yearOverYearComparison.changePercentage >= 0 
                ? `Purchases increased by ${analytics.yearOverYearComparison.changePercentage.toFixed(1)}% compared to last year` 
                : `Purchases decreased by ${Math.abs(analytics.yearOverYearComparison.changePercentage).toFixed(1)}% compared to last year`}
            </p>
          </div>
          <div className="p-1 sm:p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-1 sm:mb-2 text-xs sm:text-base">Supplier Performance</h4>
            <p className="text-xs text-green-700">
              {supplierPerformance.length > 0 
                ? `Top supplier: ${supplierPerformance[0]?.supplierName} with ${supplierPerformance[0]?.onTimeDeliveryRate.toFixed(1)}% on-time delivery`
                : 'No supplier performance data available'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchasesAnalytics;