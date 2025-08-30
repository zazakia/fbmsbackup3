import React, { useState, useEffect } from 'react';
import { ArrowDownRight, Clock, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { supabase } from '../../utils/supabase';

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_name: string;
  total: number;
  status: string;
  created_at: string;
}

interface SimpleRecentPurchaseOrdersProps {
  onOrderClick?: (orderId: string) => void;
}

const SimpleRecentPurchaseOrders: React.FC<SimpleRecentPurchaseOrdersProps> = React.memo(({
  onOrderClick
}) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentOrders();
  }, []);

  const fetchRecentOrders = async () => {
    try {
      console.log('Fetching recent purchase orders...');
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('purchase_orders')
        .select('id, po_number, supplier_name, total, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (fetchError) {
        console.error('Error fetching purchase orders:', fetchError);
        setError(fetchError.message);
        return;
      }

      console.log('Fetched recent orders:', data);
      setOrders(data || []);
    } catch (err) {
      console.error('Error in fetchRecentOrders:', err);
      setError('Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
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

  const getStatusColor = (status: string) => {
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

  const getStatusBgColor = (status: string) => {
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

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
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

  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Purchase Orders</h2>
        </div>
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-500">Error loading purchase orders</p>
          <p className="text-sm text-gray-500 mt-1">{error}</p>
          <button 
            onClick={fetchRecentOrders}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
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
          <p className="text-sm text-gray-400 mt-1">Purchase orders will appear here once created</p>
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
                    {order.supplier_name || 'Unknown Supplier'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {order.po_number} • {formatTimeAgo(order.created_at)}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  ₱{(order.total || 0).toLocaleString()}
                </p>
                <div className="flex items-center mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {order.status === 'draft' && 'Draft'}
                    {order.status === 'sent' && 'Sent'}
                    {order.status === 'partial' && 'Partial'}
                    {order.status === 'received' && 'Received'}
                    {order.status === 'cancelled' && 'Cancelled'}
                    {!['draft', 'sent', 'partial', 'received', 'cancelled'].includes(order.status) && order.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

SimpleRecentPurchaseOrders.displayName = 'SimpleRecentPurchaseOrders';

export default SimpleRecentPurchaseOrders;