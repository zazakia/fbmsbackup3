import React from 'react';
import { ArrowDownRight, Clock, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { PurchaseOrder, PurchaseOrderStatus } from '../../types/business';

interface RecentPurchaseOrdersProps {
  orders: PurchaseOrder[];
  loading?: boolean;
  onOrderClick?: (orderId: string) => void;
}

const RecentPurchaseOrders: React.FC<RecentPurchaseOrdersProps> = ({ 
  orders, 
  loading = false,
  onOrderClick 
}) => {
  const getStatusIcon = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'draft':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'sent':
        return <ArrowDownRight className="h-4 w-4 text-blue-600" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'received':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'partial':
        return 'bg-orange-100 text-orange-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBgColor = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-100';
      case 'sent':
        return 'bg-blue-100';
      case 'partial':
        return 'bg-orange-100';
      case 'received':
        return 'bg-green-100';
      case 'cancelled':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-center justify-between p-3 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
              <div className="text-right">
                <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Purchase Orders</h2>
        <button 
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          onClick={() => onOrderClick?.('all')}
        >
          View All
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No recent purchase orders</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div 
              key={order.id} 
              className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
              onClick={() => onOrderClick?.(order.id)}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${getStatusBgColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {order.supplierName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.poNumber} • {formatTimeAgo(new Date(order.createdAt))}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  ₱{order.total.toLocaleString()}
                </p>
                <div className="flex items-center mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status === 'draft' && 'Draft'}
                    {order.status === 'sent' && 'Sent'}
                    {order.status === 'partial' && 'Partial'}
                    {order.status === 'received' && 'Received'}
                    {order.status === 'cancelled' && 'Cancelled'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentPurchaseOrders;