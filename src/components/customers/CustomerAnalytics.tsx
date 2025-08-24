import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar, 
  Award, 
  BarChart3, 
  PieChart, 
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getCustomers, getCustomerStats } from '../../api/customers';
import { Customer, CustomerType } from '../../types/business';
import { useToastStore } from '../../store/toastStore';
import LoadingSpinner from '../LoadingSpinner';

// Allow any object for props for now; component currently takes no props
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CustomerAnalyticsProps extends Record<string, never> {}

interface AnalyticsData {
  customerGrowth: Array<{ month: string; newCustomers: number; totalCustomers: number }>;
  customersByType: Array<{ name: string; value: number; color: string }>;
  loyaltyDistribution: Array<{ tier: string; count: number; percentage: number }>;
  topCustomers: Array<{ customer: Customer; lifetimeValue: number; totalOrders: number }>;
  monthlyRetention: Array<{ month: string; activeCustomers: number; retentionRate: number }>;
}

const CustomerAnalytics: React.FC<CustomerAnalyticsProps> = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const { addToast } = useToastStore();

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const [customersResult, statsResult] = await Promise.all([
        getCustomers(),
        getCustomerStats()
      ]);

      if (customersResult.error || statsResult.error) {
        throw new Error('Failed to fetch data');
      }

      const customersData = customersResult.data || [];
      const statsData = statsResult.data;

      setCustomers(customersData);
      setStats(statsData);

      // Generate analytics data
      const analyticsData = generateAnalyticsData(customersData);
      setAnalytics(analyticsData);

    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load analytics data'
      });
    } finally {
      setLoading(false);
    }
  };

  const generateAnalyticsData = (customers: Customer[]): AnalyticsData => {
    // Customer Growth (last 12 months)
    const customerGrowth = generateCustomerGrowthData(customers);

    // Customers by Type
    const customersByType = [
      { name: 'Individual', value: customers.filter(c => c.customerType === 'individual').length, color: '#3B82F6' },
      { name: 'Business', value: customers.filter(c => c.customerType === 'business').length, color: '#10B981' },
      { name: 'VIP', value: customers.filter(c => c.customerType === 'vip').length, color: '#8B5CF6' },
      { name: 'Wholesale', value: customers.filter(c => c.customerType === 'wholesale').length, color: '#F59E0B' }
    ];

    // Loyalty Distribution
    const loyaltyDistribution = generateLoyaltyDistribution(customers);

    // Top Customers (by total purchases)
    const topCustomers = customers
      .filter(c => c.totalPurchases > 0)
      .sort((a, b) => b.totalPurchases - a.totalPurchases)
      .slice(0, 10)
      .map(customer => ({
        customer,
        lifetimeValue: customer.totalPurchases,
        totalOrders: Math.floor(customer.totalPurchases / 1000) // Mock order count
      }));

    // Monthly Retention (mock data)
    const monthlyRetention = generateRetentionData(customers);

    return {
      customerGrowth,
      customersByType,
      loyaltyDistribution,
      topCustomers,
      monthlyRetention
    };
  };

  const generateCustomerGrowthData = (customers: Customer[]) => {
    const monthlyData: Record<string, { new: number; total: number }> = {};
    const now = new Date();
    
    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toISOString().slice(0, 7);
      monthlyData[monthKey] = { new: 0, total: 0 };
    }

    // Count new customers by month
    customers.forEach(customer => {
      const monthKey = customer.createdAt.toISOString().slice(0, 7);
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].new++;
      }
    });

    // Calculate cumulative totals
    let cumulativeTotal = 0;
    return Object.entries(monthlyData).map(([month, data]) => {
      cumulativeTotal += data.new;
      return {
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        newCustomers: data.new,
        totalCustomers: cumulativeTotal
      };
    });
  };

  const generateLoyaltyDistribution = (customers: Customer[]) => {
    const tiers = {
      Bronze: customers.filter(c => c.loyaltyPoints < 1000).length,
      Silver: customers.filter(c => c.loyaltyPoints >= 1000 && c.loyaltyPoints < 5000).length,
      Gold: customers.filter(c => c.loyaltyPoints >= 5000 && c.loyaltyPoints < 10000).length,
      Platinum: customers.filter(c => c.loyaltyPoints >= 10000).length
    };

    const total = customers.length;
    return Object.entries(tiers).map(([tier, count]) => ({
      tier,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  };

  const generateRetentionData = (customers: Customer[]) => {
    // Mock retention data - in real app, this would come from actual transaction data
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const activeCustomers = Math.floor(customers.length * (0.7 + Math.random() * 0.2));
      const retentionRate = 70 + Math.random() * 20; // 70-90%
      
      months.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        activeCustomers,
        retentionRate: Math.round(retentionRate)
      });
    }
    
    return months;
  };

  const exportAnalytics = () => {
    // Generate CSV data
    const csvData = [
      ['Customer Analytics Report'],
      ['Generated on:', new Date().toLocaleString()],
      [''],
      ['Customer Stats'],
      ['Total Customers:', stats?.total || 0],
      ['Active Customers:', stats?.active || 0],
      ['Total Purchases:', `₱${stats?.totalPurchases?.toLocaleString() || 0}`],
      [''],
      ['Top Customers'],
      ['Name', 'Lifetime Value', 'Customer Type'],
      ...analytics?.topCustomers.slice(0, 5).map(tc => [
        `${tc.customer.firstName} ${tc.customer.lastName}`,
        `₱${tc.lifetimeValue.toLocaleString()}`,
        tc.customer.customerType
      ]) || []
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    addToast({
      type: 'success',
      title: 'Export Complete',
      message: 'Analytics report has been downloaded'
    });
  };

  if (loading) {
    return <LoadingSpinner message="Loading customer analytics..." size="lg" className="min-h-[400px]" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="h-6 w-6 mr-2" />
            Customer Analytics
          </h2>
          <p className="text-gray-600 mt-1">Comprehensive insights into your customer base</p>
        </div>
        <div className="flex items-center space-x-4 mt-4 lg:mt-0">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={fetchAnalyticsData}
            className="inline-flex items-center px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={exportAnalytics}
            className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Customers</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
                <p className="text-sm text-green-600 mt-1">
                  {stats.active} active ({((stats.active / stats.total) * 100).toFixed(1)}%)
                </p>
              </div>
              <Users className="h-12 w-12 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">₱{stats.totalPurchases.toLocaleString()}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Avg: ₱{stats.active > 0 ? (stats.totalPurchases / stats.active).toLocaleString() : 0}
                </p>
              </div>
              <DollarSign className="h-12 w-12 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Outstanding Balance</p>
                <p className="text-3xl font-bold text-gray-900">₱{stats.totalBalance.toLocaleString()}</p>
                <p className="text-sm text-orange-600 mt-1">
                  {stats.totalBalance > 0 ? 'Requires attention' : 'All clear'}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-orange-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Avg Loyalty Points</p>
                <p className="text-3xl font-bold text-gray-900">{stats.averageLoyaltyPoints.toFixed(0)}</p>
                <p className="text-sm text-purple-600 mt-1">Customer engagement</p>
              </div>
              <Award className="h-12 w-12 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Growth */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Growth</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.customerGrowth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="newCustomers" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="New Customers"
                />
                <Line 
                  type="monotone" 
                  dataKey="totalCustomers" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Total Customers"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Customer Types */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Types</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={analytics.customersByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.customersByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          {/* Loyalty Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Loyalty Tier Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.loyaltyDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tier" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Customer Retention */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Retention</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.monthlyRetention}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="retentionRate" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  name="Retention Rate (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Customers */}
      {analytics && analytics.topCustomers.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Top Customers by Lifetime Value</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lifetime Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Loyalty Points
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.topCustomers.map((topCustomer, index) => (
                  <tr key={topCustomer.customer.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-600">
                              {topCustomer.customer.firstName[0]}{topCustomer.customer.lastName[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {topCustomer.customer.firstName} {topCustomer.customer.lastName}
                          </div>
                          {topCustomer.customer.businessName && (
                            <div className="text-sm text-gray-500">{topCustomer.customer.businessName}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        topCustomer.customer.customerType === 'individual' ? 'bg-blue-100 text-blue-800' :
                        topCustomer.customer.customerType === 'business' ? 'bg-green-100 text-green-800' :
                        topCustomer.customer.customerType === 'vip' ? 'bg-purple-100 text-purple-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {topCustomer.customer.customerType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₱{topCustomer.lifetimeValue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {topCustomer.customer.loyaltyPoints.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`h-2 w-2 rounded-full mr-2 ${
                          topCustomer.customer.isActive ? 'bg-green-400' : 'bg-red-400'
                        }`} />
                        <span className="text-sm text-gray-600">
                          {topCustomer.customer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerAnalytics;