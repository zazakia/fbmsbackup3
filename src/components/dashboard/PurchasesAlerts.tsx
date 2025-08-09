import React from 'react';
import { AlertTriangle, Clock, Package, DollarSign, ExternalLink } from 'lucide-react';
import { PurchasesAlert } from '../../services/purchasesDashboardService';

interface PurchasesAlertsProps {
  alerts: PurchasesAlert[];
  loading?: boolean;
  onAlertClick?: (alert: PurchasesAlert) => void;
}

const PurchasesAlerts: React.FC<PurchasesAlertsProps> = ({ 
  alerts, 
  loading = false,
  onAlertClick 
}) => {
  const getAlertIcon = (type: PurchasesAlert['type']) => {
    switch (type) {
      case 'overdue':
        return <AlertTriangle className="h-5 w-5" />;
      case 'pending_approval':
        return <Clock className="h-5 w-5" />;
      case 'partial_delivery':
        return <Package className="h-5 w-5" />;
      case 'budget_exceeded':
        return <DollarSign className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getAlertColor = (severity: PurchasesAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          icon: 'text-red-500',
          text: 'text-red-700 dark:text-red-200'
        };
      case 'high':
        return {
          bg: 'bg-orange-50 dark:bg-orange-900/20',
          border: 'border-orange-200 dark:border-orange-800',
          icon: 'text-orange-500',
          text: 'text-orange-700 dark:text-orange-200'
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          icon: 'text-yellow-500',
          text: 'text-yellow-700 dark:text-yellow-200'
        };
      case 'low':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          icon: 'text-blue-500',
          text: 'text-blue-700 dark:text-blue-200'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          icon: 'text-gray-500',
          text: 'text-gray-700 dark:text-gray-200'
        };
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-800 rounded-xl p-0.5 sm:p-2 md:p-4 shadow-sm border border-gray-200 dark:border-dark-700 transition-colors duration-300">
        <div className="flex items-center space-x-2 mb-1 sm:mb-3 animate-pulse">
          <div className="w-5 h-5 bg-gray-200 rounded"></div>
          <div className="h-6 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="space-y-1 sm:space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="flex items-center p-0.5 sm:p-2 rounded-lg animate-pulse">
              <div className="w-5 h-5 bg-gray-200 rounded mr-3"></div>
              <div className="h-4 bg-gray-200 rounded flex-1"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-800 rounded-xl p-0.5 sm:p-2 md:p-4 shadow-sm border border-gray-200 dark:border-dark-700 transition-colors duration-300">
        <div className="flex items-center space-x-2 mb-1 sm:mb-3">
          <Package className="h-5 w-5 text-green-500" />
          <h3 className="text-xs sm:text-lg font-medium text-gray-900 dark:text-gray-100">Purchases Status</h3>
        </div>
        <div className="p-1 sm:p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-xs text-green-700 dark:text-green-200">
            All purchases are up to date. No alerts at this time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-800 rounded-xl p-0.5 sm:p-2 md:p-4 shadow-sm border border-gray-200 dark:border-dark-700 transition-colors duration-300">
      <div className="flex items-center space-x-2 mb-1 sm:mb-3">
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        <h3 className="text-xs sm:text-lg font-medium text-gray-900 dark:text-gray-100">Purchases Alerts</h3>
      </div>
      <div className="space-y-1 sm:space-y-3">
        {alerts.map((alert) => {
          const colors = getAlertColor(alert.severity);
          return (
            <div 
              key={alert.id} 
              className={`flex items-center justify-between p-0.5 sm:p-2 rounded-lg transition-colors duration-200 cursor-pointer hover:opacity-80 ${colors.bg} ${colors.border} border`}
              onClick={() => onAlertClick?.(alert)}
            >
              <div className="flex items-center flex-1">
                <div className={`${colors.icon} mr-3`}>
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1">
                  <span className={`text-xs sm:text-base ${colors.text}`}>
                    {alert.message}
                  </span>
                  {alert.count > 1 && (
                    <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                      {alert.count}
                    </span>
                  )}
                </div>
              </div>
              {alert.actionUrl && (
                <ExternalLink className={`h-4 w-4 ${colors.icon} ml-2`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PurchasesAlerts;