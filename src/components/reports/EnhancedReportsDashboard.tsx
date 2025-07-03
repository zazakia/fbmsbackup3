import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart,
  TrendingUp, 
  TrendingDown,
  Activity,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Eye,
  FileText,
  Target,
  Briefcase,
  Building2,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Globe,
  Zap,
  Star,
  Award
} from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { formatCurrency, formatDate, formatPercentage } from '../../utils/formatters';

interface BusinessMetrics {
  revenue: {
    total: number;
    monthly: number;
    growth: number;
    forecast: number;
  };
  profit: {
    gross: number;
    net: number;
    margin: number;
    growth: number;
  };
  customers: {
    total: number;
    new: number;
    returning: number;
    retention: number;
  };
  sales: {
    totalOrders: number;
    averageOrderValue: number;
    conversionRate: number;
    growth: number;
  };
  inventory: {
    turnoverRate: number;
    stockValue: number;
    lowStockItems: number;
    topProducts: Array<{ name: string; sales: number; revenue: number }>;
  };
  expenses: {
    total: number;
    operational: number;
    marketing: number;
    growth: number;
  };
}

interface ReportData {
  period: string;
  revenue: number;
  expenses: number;
  profit: number;
  orders: number;
  customers: number;
}

interface ProductPerformance {
  id: string;
  name: string;
  category: string;
  unitsSold: number;
  revenue: number;
  profit: number;
  margin: number;
  growth: number;
  rank: number;
}

interface CustomerSegment {
  segment: string;
  count: number;
  revenue: number;
  averageOrderValue: number;
  frequency: number;
  percentage: number;
}

interface SalesChannel {
  channel: string;
  revenue: number;
  orders: number;
  percentage: number;
  growth: number;
}

const EnhancedReportsDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'overview' | 'sales' | 'financial' | 'customers' | 'products' | 'analytics'>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y' | 'custom'>('30d');
  const [selectedDateRange, setSelectedDateRange] = useState({ start: '', end: '' });
  const [compareMode, setCompareMode] = useState(false);
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [productPerformance, setProductPerformance] = useState<ProductPerformance[]>([]);
  const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>([]);
  const [salesChannels, setSalesChannels] = useState<SalesChannel[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { products, customers, sales } = useBusinessStore();

  // Initialize mock data for comprehensive reporting
  useEffect(() => {
    generateMockReportData();
  }, [selectedPeriod]);

  const generateMockReportData = () => {
    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      // Mock business metrics
      const mockMetrics: BusinessMetrics = {
        revenue: {
          total: 2450000,
          monthly: 450000,
          growth: 15.7,
          forecast: 520000
        },
        profit: {
          gross: 980000,
          net: 340000,
          margin: 13.9,
          growth: 8.3
        },
        customers: {
          total: 2847,
          new: 156,
          returning: 432,
          retention: 78.5
        },
        sales: {
          totalOrders: 8924,
          averageOrderValue: 2750,
          conversionRate: 3.2,
          growth: 12.4
        },
        inventory: {
          turnoverRate: 4.8,
          stockValue: 850000,
          lowStockItems: 23,
          topProducts: [
            { name: 'Premium Office Chair', sales: 245, revenue: 612500 },
            { name: 'Standing Desk', sales: 189, revenue: 567000 },
            { name: 'Ergonomic Mouse', sales: 567, revenue: 340200 }
          ]
        },
        expenses: {
          total: 1980000,
          operational: 1540000,
          marketing: 195000,
          growth: 5.2
        }
      };

      // Mock time series data
      const mockReportData: ReportData[] = [
        { period: 'Jan', revenue: 385000, expenses: 320000, profit: 65000, orders: 742, customers: 234 },
        { period: 'Feb', revenue: 420000, expenses: 340000, profit: 80000, orders: 823, customers: 287 },
        { period: 'Mar', revenue: 392000, expenses: 335000, profit: 57000, orders: 756, customers: 245 },
        { period: 'Apr', revenue: 465000, expenses: 358000, profit: 107000, orders: 921, customers: 312 },
        { period: 'May', revenue: 438000, expenses: 347000, profit: 91000, orders: 867, customers: 298 },
        { period: 'Jun', revenue: 485000, expenses: 365000, profit: 120000, orders: 987, customers: 334 }
      ];

      // Mock product performance
      const mockProducts: ProductPerformance[] = [
        {
          id: 'prod-1',
          name: 'Premium Office Chair',
          category: 'Furniture',
          unitsSold: 245,
          revenue: 612500,
          profit: 153125,
          margin: 25.0,
          growth: 18.5,
          rank: 1
        },
        {
          id: 'prod-2',
          name: 'Standing Desk',
          category: 'Furniture',
          unitsSold: 189,
          revenue: 567000,
          profit: 113400,
          margin: 20.0,
          growth: 22.3,
          rank: 2
        },
        {
          id: 'prod-3',
          name: 'Ergonomic Mouse',
          category: 'Accessories',
          unitsSold: 567,
          revenue: 340200,
          profit: 102060,
          margin: 30.0,
          growth: 15.7,
          rank: 3
        },
        {
          id: 'prod-4',
          name: 'Wireless Keyboard',
          category: 'Accessories',
          unitsSold: 423,
          revenue: 254000,
          profit: 63500,
          margin: 25.0,
          growth: -5.2,
          rank: 4
        },
        {
          id: 'prod-5',
          name: 'Monitor Stand',
          category: 'Accessories',
          unitsSold: 312,
          revenue: 187200,
          profit: 37440,
          margin: 20.0,
          growth: 8.9,
          rank: 5
        }
      ];

      // Mock customer segments
      const mockSegments: CustomerSegment[] = [
        {
          segment: 'VIP Customers',
          count: 89,
          revenue: 750000,
          averageOrderValue: 8426,
          frequency: 4.2,
          percentage: 30.6
        },
        {
          segment: 'Regular Customers',
          count: 567,
          revenue: 1200000,
          averageOrderValue: 2116,
          frequency: 2.8,
          percentage: 49.0
        },
        {
          segment: 'New Customers',
          count: 234,
          revenue: 380000,
          averageOrderValue: 1624,
          frequency: 1.6,
          percentage: 15.5
        },
        {
          segment: 'Inactive Customers',
          count: 145,
          revenue: 120000,
          averageOrderValue: 827,
          frequency: 0.8,
          percentage: 4.9
        }
      ];

      // Mock sales channels
      const mockChannels: SalesChannel[] = [
        {
          channel: 'Online Store',
          revenue: 1470000,
          orders: 5354,
          percentage: 60.0,
          growth: 24.5
        },
        {
          channel: 'Physical Store',
          revenue: 735000,
          orders: 2677,
          percentage: 30.0,
          growth: 8.2
        },
        {
          channel: 'B2B Sales',
          revenue: 245000,
          orders: 893,
          percentage: 10.0,
          growth: 15.7
        }
      ];

      setMetrics(mockMetrics);
      setReportData(mockReportData);
      setProductPerformance(mockProducts);
      setCustomerSegments(mockSegments);
      setSalesChannels(mockChannels);
      setIsLoading(false);
    }, 1000);
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      case '1y': return 'Last Year';
      case 'custom': return 'Custom Range';
      default: return 'Last 30 Days';
    }
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600 dark:text-green-400';
    if (growth < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowUpRight className="h-4 w-4" />;
    if (growth < 0) return <ArrowDownRight className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  return (
    <div className="p-6 space-y-6 dark:bg-dark-950 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Business Intelligence & Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Comprehensive analytics and performance insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
            <option value="custom">Custom Range</option>
          </select>
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`px-3 py-2 text-sm rounded-lg transition-colors ${
              compareMode
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600'
            }`}
          >
            Compare
          </button>
          <button
            onClick={generateMockReportData}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(metrics.revenue.total)}</p>
                <div className={`flex items-center text-sm ${getGrowthColor(metrics.revenue.growth)}`}>
                  {getGrowthIcon(metrics.revenue.growth)}
                  <span className="ml-1">{formatPercentage(Math.abs(metrics.revenue.growth))} vs last period</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Net Profit</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(metrics.profit.net)}</p>
                <div className={`flex items-center text-sm ${getGrowthColor(metrics.profit.growth)}`}>
                  {getGrowthIcon(metrics.profit.growth)}
                  <span className="ml-1">{formatPercentage(Math.abs(metrics.profit.growth))} vs last period</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.sales.totalOrders.toLocaleString()}</p>
                <div className={`flex items-center text-sm ${getGrowthColor(metrics.sales.growth)}`}>
                  {getGrowthIcon(metrics.sales.growth)}
                  <span className="ml-1">{formatPercentage(Math.abs(metrics.sales.growth))} vs last period</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.customers.total.toLocaleString()}</p>
                <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                  <Star className="h-4 w-4" />
                  <span className="ml-1">{formatPercentage(metrics.customers.retention)} retention</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance Indicators */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Sales Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Average Order Value</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(metrics.sales.averageOrderValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Conversion Rate</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatPercentage(metrics.sales.conversionRate)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Monthly Forecast</span>
                <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(metrics.revenue.forecast)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Financial Health</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Gross Profit</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(metrics.profit.gross)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Profit Margin</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatPercentage(metrics.profit.margin)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Operating Expenses</span>
                <span className="font-medium text-red-600 dark:text-red-400">{formatCurrency(metrics.expenses.operational)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Inventory Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Turnover Rate</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{metrics.inventory.turnoverRate}x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Stock Value</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(metrics.inventory.stockValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Low Stock Items</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">{metrics.inventory.lowStockItems}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700">
        <div className="border-b border-gray-200 dark:border-dark-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'sales', label: 'Sales Analytics', icon: TrendingUp },
              { id: 'financial', label: 'Financial Reports', icon: DollarSign },
              { id: 'customers', label: 'Customer Insights', icon: Users },
              { id: 'products', label: 'Product Performance', icon: Package },
              { id: 'analytics', label: 'Advanced Analytics', icon: Activity }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeView === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeView === 'overview' && (
            <div className="space-y-6">
              {/* Revenue Trend Chart Area */}
              <div className="bg-gray-50 dark:bg-dark-700 p-6 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Revenue Trend ({getPeriodLabel()})</h3>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">Revenue chart would be displayed here</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Integration with charting library needed</p>
                  </div>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {reportData.slice(-4).map((data, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">{data.period}</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Revenue</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(data.revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Profit</span>
                        <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(data.profit)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Orders</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{data.orders}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sales Analytics Tab */}
          {activeView === 'sales' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sales Channels */}
                <div className="bg-gray-50 dark:bg-dark-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Sales by Channel</h3>
                  <div className="space-y-4">
                    {salesChannels.map(channel => (
                      <div key={channel.channel} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900 dark:text-gray-100">{channel.channel}</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{formatPercentage(channel.percentage)}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-dark-600 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${channel.percentage}%` }}
                            ></div>
                          </div>
                          <div className="flex items-center justify-between mt-1 text-sm">
                            <span className="text-gray-600 dark:text-gray-400">{formatCurrency(channel.revenue)}</span>
                            <span className={`${getGrowthColor(channel.growth)}`}>
                              {channel.growth > 0 ? '+' : ''}{formatPercentage(channel.growth)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Products */}
                <div className="bg-gray-50 dark:bg-dark-700 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Top Selling Products</h3>
                  <div className="space-y-3">
                    {metrics?.inventory.topProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-dark-800 rounded-lg">
                        <div className="flex items-center">
                          <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">{product.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(product.revenue)}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{product.sales} units</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Customer Insights Tab */}
          {activeView === 'customers' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Customer Segmentation</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {customerSegments.map(segment => (
                  <div key={segment.segment} className="bg-gray-50 dark:bg-dark-700 p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{segment.segment}</h4>
                      <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                        {formatPercentage(segment.percentage)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Customers</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{segment.count.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(segment.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Avg Order Value</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(segment.averageOrderValue)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Purchase Frequency</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{segment.frequency.toFixed(1)}x</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product Performance Tab */}
          {activeView === 'products' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Product Performance Analysis</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-dark-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Rank</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Product</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Category</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Units Sold</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Revenue</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Profit</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Margin</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">Growth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productPerformance.map(product => (
                      <tr key={product.id} className="border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            {product.rank <= 3 ? (
                              <Award className={`h-4 w-4 mr-2 ${
                                product.rank === 1 ? 'text-yellow-500' : 
                                product.rank === 2 ? 'text-gray-400' : 'text-orange-600'
                              }`} />
                            ) : null}
                            <span className="font-medium text-gray-900 dark:text-gray-100">#{product.rank}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{product.name}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{product.category}</td>
                        <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{product.unitsSold.toLocaleString()}</td>
                        <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">{formatCurrency(product.revenue)}</td>
                        <td className="py-3 px-4 text-green-600 dark:text-green-400">{formatCurrency(product.profit)}</td>
                        <td className="py-3 px-4 text-gray-900 dark:text-gray-100">{formatPercentage(product.margin)}</td>
                        <td className="py-3 px-4">
                          <div className={`flex items-center ${getGrowthColor(product.growth)}`}>
                            {getGrowthIcon(product.growth)}
                            <span className="ml-1">{formatPercentage(Math.abs(product.growth))}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Other tabs would continue with similar comprehensive reporting interfaces */}
          {activeView === 'financial' && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Financial Reports</h3>
              <p className="text-gray-500 dark:text-gray-400">Comprehensive financial statements and analysis.</p>
            </div>
          )}

          {activeView === 'analytics' && (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Advanced Analytics</h3>
              <p className="text-gray-500 dark:text-gray-400">AI-powered insights and predictive analytics.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedReportsDashboard;