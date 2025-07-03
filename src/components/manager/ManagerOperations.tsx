import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Package,
  ShoppingCart,
  CreditCard,
  Star,
  Target,
  Activity,
  Bell,
  Settings,
  Eye,
  Edit,
  Plus,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { hasPermission } from '../../utils/permissions';

interface StaffSchedule {
  id: string;
  employeeId: string;
  employeeName: string;
  shift: 'morning' | 'afternoon' | 'night';
  startTime: string;
  endTime: string;
  date: Date;
  status: 'scheduled' | 'present' | 'absent' | 'late';
}

interface OperationalAlert {
  id: string;
  type: 'low_stock' | 'overdue_payment' | 'staff_shortage' | 'system';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
}

interface DailyOperations {
  date: Date;
  salesTarget: number;
  actualSales: number;
  staffPresent: number;
  totalStaff: number;
  customerCount: number;
  avgTransactionValue: number;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
}

const ManagerOperations: React.FC = () => {
  const { user } = useAuthStore();
  const { products, customers, employees, sales } = useBusinessStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [staffSchedules, setStaffSchedules] = useState<StaffSchedule[]>([]);
  const [operationalAlerts, setOperationalAlerts] = useState<OperationalAlert[]>([]);
  const [dailyOps, setDailyOps] = useState<DailyOperations | null>(null);

  useEffect(() => {
    generateMockData();
  }, [selectedDate, employees, sales, products]);

  const generateMockData = () => {
    // Generate staff schedules
    const schedules: StaffSchedule[] = employees.slice(0, 6).map((emp, index) => ({
      id: `schedule-${emp.id}-${selectedDate.toISOString()}`,
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      shift: index % 3 === 0 ? 'morning' : index % 3 === 1 ? 'afternoon' : 'night',
      startTime: index % 3 === 0 ? '08:00' : index % 3 === 1 ? '14:00' : '20:00',
      endTime: index % 3 === 0 ? '14:00' : index % 3 === 1 ? '20:00' : '02:00',
      date: selectedDate,
      status: Math.random() > 0.2 ? 'present' : Math.random() > 0.5 ? 'late' : 'absent'
    }));
    setStaffSchedules(schedules);

    // Generate operational alerts
    const alerts: OperationalAlert[] = [
      {
        id: '1',
        type: 'low_stock',
        message: 'Rice (25kg) is running low - only 5 units remaining',
        severity: 'high',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        resolved: false
      },
      {
        id: '2',
        type: 'overdue_payment',
        message: 'Customer "Mang Juan\'s Store" has overdue payment of ₱15,000',
        severity: 'medium',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        resolved: false
      },
      {
        id: '3',
        type: 'staff_shortage',
        message: 'Afternoon shift understaffed - only 2 out of 4 staff present',
        severity: 'medium',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        resolved: true
      }
    ];
    setOperationalAlerts(alerts);

    // Generate daily operations data
    const todaySales = sales.filter(sale => 
      new Date(sale.date).toDateString() === selectedDate.toDateString()
    );
    const totalSales = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const customerCount = new Set(todaySales.map(sale => sale.customerId)).size;
    const avgTransaction = customerCount > 0 ? totalSales / todaySales.length : 0;

    setDailyOps({
      date: selectedDate,
      salesTarget: 50000,
      actualSales: totalSales,
      staffPresent: schedules.filter(s => s.status === 'present').length,
      totalStaff: schedules.length,
      customerCount,
      avgTransactionValue: avgTransaction,
      topProducts: products.slice(0, 5).map(product => ({
        name: product.name,
        quantity: Math.floor(Math.random() * 20) + 1,
        revenue: Math.floor(Math.random() * 10000) + 1000
      }))
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'text-green-600 bg-green-100';
      case 'late': return 'text-yellow-600 bg-yellow-100';
      case 'absent': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-300';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-300';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      case 'low': return 'text-blue-600 bg-blue-100 border-blue-300';
      default: return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  if (!hasPermission(user?.role || 'cashier', 'dashboard', 'view')) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-600">You don't have permission to access manager operations.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Operations Management</h1>
          <p className="text-gray-600">Monitor and manage daily business operations</p>
        </div>

        {/* Date Selector */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Calendar className="h-5 w-5 text-gray-500" />
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => generateMockData()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: Activity },
                { id: 'staff', label: 'Staff Management', icon: Users },
                { id: 'alerts', label: 'Alerts', icon: Bell },
                { id: 'performance', label: 'Performance', icon: TrendingUp }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && dailyOps && (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100">Sales vs Target</p>
                        <p className="text-2xl font-bold">
                          {((dailyOps.actualSales / dailyOps.salesTarget) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <Target className="h-8 w-8 text-blue-200" />
                    </div>
                    <div className="mt-2 text-sm text-blue-100">
                      {formatCurrency(dailyOps.actualSales)} / {formatCurrency(dailyOps.salesTarget)}
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100">Staff Attendance</p>
                        <p className="text-2xl font-bold">
                          {dailyOps.staffPresent}/{dailyOps.totalStaff}
                        </p>
                      </div>
                      <Users className="h-8 w-8 text-green-200" />
                    </div>
                    <div className="mt-2 text-sm text-green-100">
                      {((dailyOps.staffPresent / dailyOps.totalStaff) * 100).toFixed(0)}% present
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100">Customers Served</p>
                        <p className="text-2xl font-bold">{dailyOps.customerCount}</p>
                      </div>
                      <ShoppingCart className="h-8 w-8 text-purple-200" />
                    </div>
                    <div className="mt-2 text-sm text-purple-100">
                      Avg: {formatCurrency(dailyOps.avgTransactionValue)}
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-lg text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100">Active Alerts</p>
                        <p className="text-2xl font-bold">
                          {operationalAlerts.filter(a => !a.resolved).length}
                        </p>
                      </div>
                      <AlertTriangle className="h-8 w-8 text-orange-200" />
                    </div>
                    <div className="mt-2 text-sm text-orange-100">
                      {operationalAlerts.filter(a => a.severity === 'high' || a.severity === 'critical').length} high priority
                    </div>
                  </div>
                </div>

                {/* Top Products */}
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Products Today</h3>
                  <div className="space-y-3">
                    {dailyOps.topProducts.map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-600">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-sm text-gray-500">{product.quantity} units sold</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
                          <p className="text-sm text-gray-500">Revenue</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Staff Management Tab */}
            {activeTab === 'staff' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Staff Schedule</h3>
                  <div className="flex space-x-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2">
                      <Plus className="h-4 w-4" />
                      <span>Add Schedule</span>
                    </button>
                  </div>
                </div>

                <div className="grid gap-4">
                  {staffSchedules.map((schedule) => (
                    <div key={schedule.id} className="bg-white border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{schedule.employeeName}</p>
                            <p className="text-sm text-gray-500">
                              {schedule.shift.charAt(0).toUpperCase() + schedule.shift.slice(1)} Shift
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {schedule.startTime} - {schedule.endTime}
                            </p>
                            <p className="text-sm text-gray-500">{formatDate(schedule.date)}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(schedule.status)}`}>
                            {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                          </span>
                          <button className="p-2 text-gray-400 hover:text-gray-600">
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Operational Alerts</h3>
                  <div className="flex space-x-2">
                    <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center space-x-2">
                      <Filter className="h-4 w-4" />
                      <span>Filter</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {operationalAlerts.map((alert) => (
                    <div key={alert.id} className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)} ${alert.resolved ? 'opacity-60' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="mt-1">
                            {alert.type === 'low_stock' && <Package className="h-5 w-5" />}
                            {alert.type === 'overdue_payment' && <CreditCard className="h-5 w-5" />}
                            {alert.type === 'staff_shortage' && <Users className="h-5 w-5" />}
                            {alert.type === 'system' && <Settings className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-medium">{alert.message}</p>
                            <p className="text-sm mt-1">
                              {formatDate(alert.timestamp)} • {alert.severity.toUpperCase()} priority
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {alert.resolved ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <button className="px-3 py-1 bg-white border border-current rounded text-sm hover:bg-gray-50">
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Tab */}
            {activeTab === 'performance' && dailyOps && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Performance Analytics</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Sales Performance</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Daily Target</span>
                        <span className="font-medium">{formatCurrency(dailyOps.salesTarget)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Actual Sales</span>
                        <span className="font-medium">{formatCurrency(dailyOps.actualSales)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min((dailyOps.actualSales / dailyOps.salesTarget) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Achievement</span>
                        <span className={`font-medium ${dailyOps.actualSales >= dailyOps.salesTarget ? 'text-green-600' : 'text-orange-600'}`}>
                          {((dailyOps.actualSales / dailyOps.salesTarget) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border rounded-lg p-6">
                    <h4 className="font-medium text-gray-900 mb-4">Staff Efficiency</h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Scheduled Staff</span>
                        <span className="font-medium">{dailyOps.totalStaff}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Present Staff</span>
                        <span className="font-medium">{dailyOps.staffPresent}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${(dailyOps.staffPresent / dailyOps.totalStaff) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Attendance Rate</span>
                        <span className="font-medium text-green-600">
                          {((dailyOps.staffPresent / dailyOps.totalStaff) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerOperations;