import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Package, 
  DollarSign, 
  User,
  ExternalLink,
  Settings,
  Bell,
  BellOff
} from 'lucide-react';

interface OverdueAlert {
  id: string;
  type: 'overdue_delivery' | 'delayed_approval' | 'missing_receipt' | 'quality_hold';
  orderId: string;
  orderNumber: string;
  supplierName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  daysOverdue: number;
  expectedDate: Date;
  orderValue: number;
  actionRequired: string;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  isAcknowledged: boolean;
  notes?: string;
}

interface AlertThresholds {
  warningDays: number;
  criticalDays: number;
  highValueThreshold: number;
  enableEmailNotifications: boolean;
  enableSlackNotifications: boolean;
  notificationFrequency: 'immediate' | 'daily' | 'weekly';
}

interface OverdueAlertsProps {
  alerts: OverdueAlert[];
  onRefresh?: () => void;
  onAlertClick?: (alert: OverdueAlert) => void;
  onAcknowledgeAlert?: (alertId: string) => void;
  onUpdateThresholds?: (thresholds: AlertThresholds) => void;
}

const OverdueAlerts: React.FC<OverdueAlertsProps> = ({
  alerts,
  onRefresh,
  onAlertClick,
  onAcknowledgeAlert,
  onUpdateThresholds
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  
  const [thresholds, setThresholds] = useState<AlertThresholds>({
    warningDays: 2,
    criticalDays: 5,
    highValueThreshold: 50000,
    enableEmailNotifications: true,
    enableSlackNotifications: false,
    notificationFrequency: 'daily'
  });

  // Filter alerts based on current filters
  const filteredAlerts = alerts.filter(alert => {
    if (filter !== 'all' && alert.severity !== filter) return false;
    if (!showAcknowledged && alert.isAcknowledged) return false;
    return true;
  });

  // Group alerts by severity for summary
  const alertSummary = alerts.reduce((acc, alert) => {
    if (!alert.isAcknowledged) {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          badge: 'bg-red-100 text-red-800',
          icon: 'text-red-500'
        };
      case 'high':
        return {
          bg: 'bg-orange-50 border-orange-200',
          text: 'text-orange-800',
          badge: 'bg-orange-100 text-orange-800',
          icon: 'text-orange-500'
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-800',
          badge: 'bg-yellow-100 text-yellow-800',
          icon: 'text-yellow-500'
        };
      case 'low':
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-800',
          badge: 'bg-blue-100 text-blue-800',
          icon: 'text-blue-500'
        };
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          text: 'text-gray-800',
          badge: 'bg-gray-100 text-gray-800',
          icon: 'text-gray-500'
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'overdue_delivery':
        return Clock;
      case 'delayed_approval':
        return AlertTriangle;
      case 'missing_receipt':
        return Package;
      case 'quality_hold':
        return AlertTriangle;
      default:
        return AlertTriangle;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const handleAlertClick = (alert: OverdueAlert) => {
    if (onAlertClick) {
      onAlertClick(alert);
    } else {
      // Default navigation to purchase order
      window.location.href = `/purchases/orders/${alert.orderId}`;
    }
  };

  const handleAcknowledge = (e: React.MouseEvent, alertId: string) => {
    e.stopPropagation();
    if (onAcknowledgeAlert) {
      onAcknowledgeAlert(alertId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['critical', 'high', 'medium', 'low'].map((severity) => {
          const count = alertSummary[severity] || 0;
          const colors = getSeverityColor(severity);
          
          return (
            <div key={severity} className={`p-4 rounded-lg border ${colors.bg}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${colors.text}`}>
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </p>
                  <p className={`text-2xl font-bold ${colors.text}`}>{count}</p>
                </div>
                <AlertTriangle className={`h-6 w-6 ${colors.icon}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Severity Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Show Acknowledged Toggle */}
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showAcknowledged}
              onChange={(e) => setShowAcknowledged(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show acknowledged</span>
          </label>
        </div>

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Settings className="h-4 w-4 mr-1" />
          Alert Settings
        </button>
      </div>

      {/* Alert Settings Panel */}
      {showSettings && (
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Alert Configuration</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-3">Thresholds</h5>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Warning Days</label>
                  <input
                    type="number"
                    value={thresholds.warningDays}
                    onChange={(e) => setThresholds(prev => ({ 
                      ...prev, 
                      warningDays: parseInt(e.target.value) || 0 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Critical Days</label>
                  <input
                    type="number"
                    value={thresholds.criticalDays}
                    onChange={(e) => setThresholds(prev => ({ 
                      ...prev, 
                      criticalDays: parseInt(e.target.value) || 0 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-700 mb-1">High Value Threshold</label>
                  <input
                    type="number"
                    value={thresholds.highValueThreshold}
                    onChange={(e) => setThresholds(prev => ({ 
                      ...prev, 
                      highValueThreshold: parseInt(e.target.value) || 0 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-3">Notifications</h5>
              <div className="space-y-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={thresholds.enableEmailNotifications}
                    onChange={(e) => setThresholds(prev => ({ 
                      ...prev, 
                      enableEmailNotifications: e.target.checked 
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Email notifications</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={thresholds.enableSlackNotifications}
                    onChange={(e) => setThresholds(prev => ({ 
                      ...prev, 
                      enableSlackNotifications: e.target.checked 
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Slack notifications</span>
                </label>
                
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Frequency</label>
                  <select
                    value={thresholds.notificationFrequency}
                    onChange={(e) => setThresholds(prev => ({ 
                      ...prev, 
                      notificationFrequency: e.target.value as any 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="daily">Daily Digest</option>
                    <option value="weekly">Weekly Summary</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              onClick={() => {
                onUpdateThresholds?.(thresholds);
                setShowSettings(false);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Alerts</h3>
          <p className="text-gray-500">
            {filter !== 'all' || !showAcknowledged
              ? 'No alerts match your current filters'
              : 'All purchase orders are on track'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => {
            const colors = getSeverityColor(alert.severity);
            const TypeIcon = getTypeIcon(alert.type);
            
            return (
              <div
                key={alert.id}
                className={`border rounded-lg p-4 cursor-pointer hover:shadow-md transition-all ${colors.bg} ${
                  alert.isAcknowledged ? 'opacity-60' : ''
                }`}
                onClick={() => handleAlertClick(alert)}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <TypeIcon className={`h-5 w-5 ${colors.icon}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className={`text-lg font-medium ${colors.text}`}>
                        {alert.title}
                      </h4>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      {alert.isAcknowledged && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <BellOff className="h-3 w-3 mr-1" />
                          ACKNOWLEDGED
                        </span>
                      )}
                    </div>
                    
                    <p className={`text-sm ${colors.text} mb-3`}>
                      {alert.description}
                    </p>
                    
                    <div className="flex items-center space-x-6 text-sm text-gray-600 mb-2">
                      <div className="flex items-center">
                        <Package className="h-4 w-4 mr-1" />
                        {alert.orderNumber}
                      </div>
                      
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        {alert.supplierName}
                      </div>
                      
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        ₱{alert.orderValue.toLocaleString()}
                      </div>
                      
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {alert.daysOverdue} days overdue
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Expected: {alert.expectedDate.toLocaleDateString()} • 
                        Created {formatTimeAgo(alert.createdAt)}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {!alert.isAcknowledged && (
                          <button
                            onClick={(e) => handleAcknowledge(e, alert.id)}
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            Acknowledge
                          </button>
                        )}
                        <ExternalLink className={`h-4 w-4 ${colors.icon}`} />
                      </div>
                    </div>
                    
                    {alert.actionRequired && (
                      <div className={`mt-3 p-3 rounded-lg bg-white bg-opacity-50`}>
                        <p className={`text-sm font-medium ${colors.text}`}>
                          Action Required: {alert.actionRequired}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OverdueAlerts;