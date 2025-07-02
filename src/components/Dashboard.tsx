import React, { useEffect } from 'react';
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users, 
  AlertTriangle,
  Calendar,
  Target
} from 'lucide-react';
import StatsCard from './StatsCard';
import RecentTransactions from './RecentTransactions';
import QuickActions from './QuickActions';
import SalesChart from './SalesChart';
import TopProducts from './TopProducts';
import BusinessAnalytics from './dashboard/BusinessAnalytics';
import { useNotificationStore, createSystemNotification } from '../store/notificationStore';
import { inventoryMonitor } from '../services/inventoryMonitor';

const Dashboard: React.FC = () => {
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    // Initialize notifications system
    addNotification(createSystemNotification(
      'Welcome to FBMS',
      'Your business management system is ready to use!',
      'success'
    ));

    // Start inventory monitoring
    inventoryMonitor.checkNow();
  }, [addNotification]);
  
  const statsData = [
    {
      title: 'Total Revenue',
      value: '₱156,789',
      change: '+12.5%',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Total Sales',
      value: '1,234',
      change: '+8.2%',
      trend: 'up' as const,
      icon: ShoppingCart,
      color: 'blue'
    },
    {
      title: 'Inventory Value',
      value: '₱89,456',
      change: '-2.1%',
      trend: 'down' as const,
      icon: Package,
      color: 'purple'
    },
    {
      title: 'Active Customers',
      value: '567',
      change: '+15.3%',
      trend: 'up' as const,
      icon: Users,
      color: 'indigo'
    }
  ];

  const alerts = [
    { type: 'warning', message: '15 products are running low on stock', icon: AlertTriangle },
    { type: 'info', message: 'Monthly BIR filing due in 5 days', icon: Calendar },
    { type: 'success', message: 'Sales target achieved for this month', icon: Target }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-500 dark:to-primary-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Good morning, Juan! 👋</h1>
            <p className="text-primary-100 mt-1">Here's what's happening with your business today</p>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <div className="text-right">
              <p className="text-primary-100 text-sm">Today's Date</p>
              <p className="font-semibold">{new Date().toLocaleDateString('en-PH', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Alerts */}
      <div className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-700 transition-colors duration-300">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />
          Important Alerts
        </h2>
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div key={index} className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${
              alert.type === 'warning' ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' :
              alert.type === 'info' ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' :
              'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            }`}>
              <alert.icon className={`h-5 w-5 mr-3 ${
                alert.type === 'warning' ? 'text-orange-500' :
                alert.type === 'info' ? 'text-blue-500' :
                'text-green-500'
              }`} />
              <span className="text-gray-700 dark:text-gray-200">{alert.message}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="lg:col-span-2">
          <SalesChart />
        </div>

        {/* Quick Actions */}
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Business Analytics */}
      <div className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-dark-700 transition-colors duration-300">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Business Analytics</h2>
        <BusinessAnalytics />
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <RecentTransactions />
        
        {/* Top Products */}
        <TopProducts />
      </div>
    </div>
  );
};

export default Dashboard;