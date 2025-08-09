import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Package, DollarSign, ExternalLink } from 'lucide-react';
import { supabase } from '../../utils/supabase';

interface PurchaseAlert {
  id: string;
  type: 'overdue' | 'pending_approval' | 'partial_delivery' | 'budget_exceeded';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  actionUrl?: string;
}

interface SimplePurchasesAlertsProps {
  onAlertClick?: (alert: PurchaseAlert) => void;
}

const SimplePurchasesAlerts: React.FC<SimplePurchasesAlertsProps> = ({ 
  onAlertClick 
}) => {
  const [alerts, setAlerts] = useState<PurchaseAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlertsData();
  }, []);

  const fetchAlertsData = async () => {
    try {
      console.log('Fetching purchases alerts data...');
      setLoading(true);

      const { data: orders, error } = await supabase
        .from('purchase_orders')
        .select('id, po_number, status, expected_date, created_at, total')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching purchase orders for alerts:', error);
        setLoading(false);
        return;
      }

      console.log('Orders for alerts:', orders);

      const generatedAlerts: PurchaseAlert[] = [];
      const now = new Date();

      if (orders && orders.length > 0) {
        // Check for overdue orders
        const overdueOrders = orders.filter(order => 
          order.status === 'sent' && 
          order.expected_date && 
          new Date(order.expected_date) < now
        );

        if (overdueOrders.length > 0) {
          generatedAlerts.push({
            id: 'overdue-orders',
            type: 'overdue',
            message: `${overdueOrders.length} purchase orders are overdue`,
            severity: overdueOrders.length > 5 ? 'critical' : overdueOrders.length > 2 ? 'high' : 'medium',
            count: overdueOrders.length,
            actionUrl: '/purchases?filter=overdue'
          });
        }

        // Check for draft orders (pending approval)
        const draftOrders = orders.filter(order => order.status === 'draft');
        if (draftOrders.length > 0) {
          generatedAlerts.push({
            id: 'pending-approval',
            type: 'pending_approval',
            message: `${draftOrders.length} purchase orders pending approval`,
            severity: draftOrders.length > 10 ? 'high' : 'medium',
            count: draftOrders.length,
            actionUrl: '/purchases?filter=draft'
          });
        }

        // Check for partial deliveries
        const partialOrders = orders.filter(order => order.status === 'partial');
        if (partialOrders.length > 0) {
          generatedAlerts.push({
            id: 'partial-delivery',
            type: 'partial_delivery',
            message: `${partialOrders.length} orders have partial deliveries`,
            severity: 'medium',
            count: partialOrders.length,
            actionUrl: '/purchases?filter=partial'
          });
        }

        // Check monthly spending (simplified budget check)
        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyOrders = orders.filter(order => 
          new Date(order.created_at) >= currentMonth && order.status !== 'cancelled'
        );
        const monthlySpending = monthlyOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        const budgetLimit = 500000; // Example budget limit

        if (monthlySpending > budgetLimit) {
          generatedAlerts.push({
            id: 'budget-exceeded',
            type: 'budget_exceeded',
            message: `Monthly spending exceeded budget by ₱${(monthlySpending - budgetLimit).toLocaleString()}`,
            severity: 'critical',
            count: 1,
            actionUrl: '/purchases/reports'
          });
        }
      }

      console.log('Generated alerts:', generatedAlerts);
      setAlerts(generatedAlerts);
    } catch (error) {
      console.error('Error in fetchAlertsData:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAlertIcon = (type: PurchaseAlert['type']) => {
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

  const getAlertColor = (severity: PurchaseAlert['severity']) => {
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
          {[...Array(2)].map((_, index) => (
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

export default SimplePurchasesAlerts;