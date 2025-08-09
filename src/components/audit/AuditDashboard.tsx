/**
 * Audit Dashboard Component
 * 
 * Provides an overview of audit activity across the system including
 * purchase orders, stock movements, and system-wide audit statistics.
 */

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Activity,
  FileText,
  Package,
  Users,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Filter
} from 'lucide-react';
import { auditService } from '../../services/auditService';
import { PurchaseOrderAuditAction } from '../../types/business';
import { formatDate } from '../../utils/formatters';

interface AuditDashboardProps {
  className?: string;
  timeRange?: {
    startDate: Date;
    endDate: Date;
  };
}

interface AuditStatistics {
  totalPurchaseOrderEvents: number;
  totalStockMovements: number;
  totalUsers: number;
  recentActivity: Array<{
    type: 'purchase_order' | 'stock_movement';
    action: string;
    entity: string;
    user: string;
    timestamp: Date;
  }>;
  activityByAction: Record<string, number>;
  activityByUser: Record<string, number>;
  activityByDate: Record<string, number>;
}

export const AuditDashboard: React.FC<AuditDashboardProps> = ({
  className = '',
  timeRange
}) => {
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'quarter' | 'custom'>('week');

  useEffect(() => {
    fetchAuditStatistics();
  }, [timeRange, selectedTimeRange]);

  const getTimeRangeFilter = () => {
    if (timeRange) return timeRange;

    const endDate = new Date();
    const startDate = new Date();

    switch (selectedTimeRange) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    return { startDate, endDate };
  };

  const fetchAuditStatistics = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = getTimeRangeFilter();

      // Get purchase order audit logs
      const poAuditResult = await auditService.getAuditLogs({
        startDate,
        endDate,
        limit: 100
      });

      // Simulate aggregated statistics (in a real implementation, this would be done server-side)
      const poLogs = poAuditResult.success ? poAuditResult.data || [] : [];
      
      const activityByAction: Record<string, number> = {};
      const activityByUser: Record<string, number> = {};
      const activityByDate: Record<string, number> = {};

      poLogs.forEach(log => {
        // Count by action
        const action = log.action.toLowerCase();
        activityByAction[action] = (activityByAction[action] || 0) + 1;

        // Count by user
        const user = log.performedByName || log.performedBy;
        activityByUser[user] = (activityByUser[user] || 0) + 1;

        // Count by date
        const date = log.timestamp.toDateString();
        activityByDate[date] = (activityByDate[date] || 0) + 1;
      });

      const recentActivity = poLogs.slice(0, 10).map(log => ({
        type: 'purchase_order' as const,
        action: log.action.replace(/_/g, ' ').toLowerCase(),
        entity: log.purchaseOrderNumber,
        user: log.performedByName || log.performedBy,
        timestamp: log.timestamp
      }));

      const stats: AuditStatistics = {
        totalPurchaseOrderEvents: poLogs.length,
        totalStockMovements: 0, // Would be fetched from stock movement audit
        totalUsers: Object.keys(activityByUser).length,
        recentActivity,
        activityByAction,
        activityByUser,
        activityByDate
      };

      setStatistics(stats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-semibold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-200 h-96 rounded-lg"></div>
          <div className="bg-gray-200 h-96 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center">
          <AlertCircle className="h-8 w-8 text-red-600 mr-3" />
          <div>
            <h3 className="text-lg font-medium text-red-800">Failed to Load Audit Dashboard</h3>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-6 text-center ${className}`}>
        <Shield className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-600">No audit data available</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Shield className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Dashboard</h1>
            <p className="text-gray-600">System-wide audit trail and activity monitoring</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="quarter">Last 90 days</option>
          </select>

          <button
            onClick={fetchAuditStatistics}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Eye className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Purchase Order Events"
          value={statistics.totalPurchaseOrderEvents}
          icon={<FileText className="h-6 w-6" />}
          color="text-blue-600"
          subtitle={`${selectedTimeRange === 'week' ? 'Last 7 days' : selectedTimeRange === 'month' ? 'Last 30 days' : 'Last 90 days'}`}
        />

        <StatCard
          title="Stock Movements"
          value={statistics.totalStockMovements}
          icon={<Package className="h-6 w-6" />}
          color="text-green-600"
          subtitle="Inventory transactions"
        />

        <StatCard
          title="Active Users"
          value={statistics.totalUsers}
          icon={<Users className="h-6 w-6" />}
          color="text-purple-600"
          subtitle="Users with activity"
        />

        <StatCard
          title="System Health"
          value={
            statistics.totalPurchaseOrderEvents > 0 || statistics.totalStockMovements > 0 
              ? "Healthy" 
              : "Inactive"
          }
          icon={
            statistics.totalPurchaseOrderEvents > 0 || statistics.totalStockMovements > 0 
              ? <CheckCircle className="h-6 w-6" /> 
              : <AlertCircle className="h-6 w-6" />
          }
          color={
            statistics.totalPurchaseOrderEvents > 0 || statistics.totalStockMovements > 0 
              ? "text-green-600" 
              : "text-yellow-600"
          }
          subtitle="Audit system status"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Recent Activity
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {statistics.recentActivity.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                No recent activity
              </div>
            ) : (
              statistics.recentActivity.map((activity, index) => (
                <div key={index} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {activity.type === 'purchase_order' ? (
                        <FileText className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Package className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium capitalize">{activity.action}</span>
                        {' '}on {activity.entity}
                      </p>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        <User className="h-3 w-3 mr-1" />
                        {activity.user}
                        <span className="mx-2">•</span>
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(activity.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity by Action */}
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Activity by Action
            </h3>
          </div>
          
          <div className="p-6">
            {Object.keys(statistics.activityByAction).length === 0 ? (
              <div className="text-center text-gray-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                No activity data
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(statistics.activityByAction)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 8)
                  .map(([action, count]) => {
                    const maxCount = Math.max(...Object.values(statistics.activityByAction));
                    const percentage = (count / maxCount) * 100;
                    
                    return (
                      <div key={action} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {action.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Activity */}
      {Object.keys(statistics.activityByUser).length > 0 && (
        <div className="mt-8 bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Top Active Users
            </h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(statistics.activityByUser)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 6)
                .map(([user, count]) => (
                  <div key={user} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {user}
                      </span>
                    </div>
                    <span className="text-sm text-gray-600 font-medium">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};