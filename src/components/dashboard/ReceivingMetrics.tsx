import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Package, 
  CheckCircle, 
  AlertTriangle,
  DollarSign,
  Calendar,
  Users,
  Target
} from 'lucide-react';

interface ReceivingMetricsData {
  // Performance metrics
  averageReceivingTime: number; // in hours
  receivingTimeChange: number; // percentage change
  onTimeDeliveryRate: number; // percentage
  onTimeDeliveryChange: number; // percentage change
  
  // Volume metrics
  totalOrdersReceived: number;
  totalOrdersChange: number; // percentage change
  totalItemsReceived: number;
  totalItemsChange: number; // percentage change
  totalValueReceived: number;
  totalValueChange: number; // percentage change
  
  // Quality metrics
  accuracyRate: number; // percentage of orders received without discrepancies
  accuracyChange: number; // percentage change
  damageRate: number; // percentage of damaged items
  damageRateChange: number; // percentage change
  
  // Efficiency metrics
  avgOrdersPerDay: number;
  avgOrdersPerDayChange: number; // percentage change
  staffProductivity: number; // orders per staff per day
  staffProductivityChange: number; // percentage change
  
  // Trend data for charts
  dailyReceivingTrend: Array<{
    date: string;
    orders: number;
    items: number;
    value: number;
  }>;
  
  // Top performing suppliers
  topSuppliers: Array<{
    name: string;
    ordersReceived: number;
    onTimeRate: number;
    qualityScore: number;
  }>;
  
  // Recent issues
  recentIssues: Array<{
    type: 'overdue' | 'damaged' | 'quantity_mismatch' | 'quality_issue';
    description: string;
    orderNumber: string;
    date: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

interface ReceivingMetricsProps {
  data: ReceivingMetricsData | null;
  onRefresh?: () => void;
  loading?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  format?: 'number' | 'currency' | 'percentage' | 'time';
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color,
  format = 'number'
}) => {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return `₱${val.toLocaleString()}`;
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'time':
        return val < 24 ? `${val.toFixed(1)}h` : `${(val / 24).toFixed(1)}d`;
      default:
        return val.toLocaleString();
    }
  };

  const isPositive = change >= 0;
  const changeIcon = isPositive ? TrendingUp : TrendingDown;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-2">
            {formatValue(value)}
          </p>
          <div className={`flex items-center text-sm ${changeColor}`}>
            {React.createElement(changeIcon, { className: 'h-4 w-4 mr-1' })}
            {Math.abs(change).toFixed(1)}% vs last period
          </div>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
};

const ReceivingMetrics: React.FC<ReceivingMetricsProps> = ({ 
  data, 
  loading = false 
}) => {
  if (loading || !data) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const metrics = [
    {
      title: 'Average Receiving Time',
      value: data.averageReceivingTime,
      change: data.receivingTimeChange,
      icon: Clock,
      color: 'bg-blue-500',
      format: 'time' as const
    },
    {
      title: 'On-Time Delivery Rate',
      value: data.onTimeDeliveryRate,
      change: data.onTimeDeliveryChange,
      icon: Target,
      color: 'bg-green-500',
      format: 'percentage' as const
    },
    {
      title: 'Orders Received',
      value: data.totalOrdersReceived,
      change: data.totalOrdersChange,
      icon: Package,
      color: 'bg-purple-500'
    },
    {
      title: 'Items Received',
      value: data.totalItemsReceived,
      change: data.totalItemsChange,
      icon: CheckCircle,
      color: 'bg-indigo-500'
    },
    {
      title: 'Total Value Received',
      value: data.totalValueReceived,
      change: data.totalValueChange,
      icon: DollarSign,
      color: 'bg-emerald-500',
      format: 'currency' as const
    },
    {
      title: 'Receiving Accuracy',
      value: data.accuracyRate,
      change: data.accuracyChange,
      icon: CheckCircle,
      color: 'bg-cyan-500',
      format: 'percentage' as const
    },
    {
      title: 'Orders per Day',
      value: data.avgOrdersPerDay,
      change: data.avgOrdersPerDayChange,
      icon: Calendar,
      color: 'bg-orange-500'
    },
    {
      title: 'Staff Productivity',
      value: data.staffProductivity,
      change: data.staffProductivityChange,
      icon: Users,
      color: 'bg-pink-500'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Key Performance Metrics */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Key Performance Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
        </div>
      </div>

      {/* Performance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Receiving Trend Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Daily Receiving Trend</h4>
          <div className="h-64 flex items-end justify-between space-x-2">
            {data.dailyReceivingTrend.slice(-7).map((day, index) => {
              const maxOrders = Math.max(...data.dailyReceivingTrend.map(d => d.orders));
              const height = (day.orders / maxOrders) * 100;
              
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full bg-blue-500 rounded-t" style={{ height: `${height}%` }}>
                    <div className="sr-only">{day.orders} orders</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 text-center">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-xs font-medium text-gray-700">
                    {day.orders}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Performing Suppliers */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Top Performing Suppliers</h4>
          <div className="space-y-4">
            {data.topSuppliers.slice(0, 5).map((supplier, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{supplier.name}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>{supplier.ordersReceived} orders</span>
                    <span>{supplier.onTimeRate.toFixed(1)}% on-time</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${supplier.qualityScore}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {supplier.qualityScore.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Issues */}
      {data.recentIssues.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Recent Issues</h4>
          <div className="space-y-3">
            {data.recentIssues.slice(0, 5).map((issue, index) => {
              const severityColors = {
                low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                medium: 'bg-orange-100 text-orange-800 border-orange-200',
                high: 'bg-red-100 text-red-800 border-red-200'
              };

              const typeIcons = {
                overdue: Clock,
                damaged: AlertTriangle,
                quantity_mismatch: Package,
                quality_issue: AlertTriangle
              };

              const Icon = typeIcons[issue.type];

              return (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {issue.description}
                      </p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${severityColors[issue.severity]}`}>
                        {issue.severity.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Order: {issue.orderNumber}</span>
                      <span>{new Date(issue.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceivingMetrics;