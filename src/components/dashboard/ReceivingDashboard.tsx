import React, { useState, useEffect } from 'react';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Download,
  RefreshCw
} from 'lucide-react';
import { receivingDashboardService } from '../../services/receivingDashboardService';
import ReceivingQueue from './ReceivingQueue';
import ReceivingMetrics from './ReceivingMetrics';
import OverdueAlerts from './OverdueAlerts';
import ReceivingReports from './ReceivingReports';
import { EnhancedPurchaseOrder } from '../../types/business';

interface ReceivingDashboardProps {
  className?: string;
}

interface DashboardTab {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
}

const ReceivingDashboard: React.FC<ReceivingDashboardProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState('queue');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Dashboard data
  const [queueData, setQueueData] = useState<EnhancedPurchaseOrder[]>([]);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [overdueAlerts, setOverdueAlerts] = useState<Record<string, unknown>[]>([]);

  const tabs: DashboardTab[] = [
    {
      id: 'queue',
      name: 'Receiving Queue',
      icon: Package,
      count: queueData.length
    },
    {
      id: 'metrics',
      name: 'Performance Metrics',
      icon: TrendingUp
    },
    {
      id: 'alerts',
      name: 'Overdue Alerts',
      icon: AlertTriangle,
      count: overdueAlerts.filter(alert => alert.severity === 'high' || alert.severity === 'critical').length
    },
    {
      id: 'reports',
      name: 'Reports',
      icon: Download
    }
  ];

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [queue, metricsData, alerts] = await Promise.all([
        receivingDashboardService.getReceivingQueue(),
        receivingDashboardService.getReceivingMetrics(),
        receivingDashboardService.getOverdueAlerts()
      ]);
      
      setQueueData(queue);
      setMetrics(metricsData);
      setOverdueAlerts(alerts);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading dashboard data...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={loadDashboardData}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'queue':
        return <ReceivingQueue orders={queueData} onRefresh={handleRefresh} />;
      case 'metrics':
        return <ReceivingMetrics data={metrics} onRefresh={handleRefresh} />;
      case 'alerts':
        return <OverdueAlerts alerts={overdueAlerts} onRefresh={handleRefresh} />;
      case 'reports':
        return <ReceivingReports onRefresh={handleRefresh} />;
      default:
        return null;
    }
  };

  return (
    <div className={`bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Receiving Dashboard
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage purchase order receiving and track performance
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 border-b border-gray-200 dark:border-dark-700">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      isActive
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default ReceivingDashboard;