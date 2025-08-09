import { supabase } from '../utils/supabase';

export interface SimplePurchasesMetrics {
  totalPurchasesValue: number;
  totalPurchasesChange: number;
  activePurchaseOrders: number;
  pendingOrders: number;
  averageOrderValue: number;
  monthlySpending: number;
}

export async function getSimplePurchasesData(): Promise<SimplePurchasesMetrics> {
  try {
    console.log('Fetching simple purchases data...');
    
    // Get all purchase orders
    const { data: orders, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching purchase orders:', error);
      throw error;
    }

    console.log('Fetched orders:', orders);

    if (!orders || orders.length === 0) {
      console.log('No orders found, returning zero metrics');
      return {
        totalPurchasesValue: 0,
        totalPurchasesChange: 0,
        activePurchaseOrders: 0,
        pendingOrders: 0,
        averageOrderValue: 0,
        monthlySpending: 0
      };
    }

    // Calculate metrics
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Current month orders
    const currentMonthOrders = orders.filter(order => 
      new Date(order.created_at) >= currentMonth && order.status !== 'cancelled'
    );

    const totalValue = currentMonthOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const activeOrders = orders.filter(order => 
      ['draft', 'sent', 'partial'].includes(order.status)
    );
    const pendingOrders = orders.filter(order => 
      order.status === 'draft' || order.status === 'sent'
    );

    const metrics: SimplePurchasesMetrics = {
      totalPurchasesValue: totalValue,
      totalPurchasesChange: 0, // Simplified for now
      activePurchaseOrders: activeOrders.length,
      pendingOrders: pendingOrders.length,
      averageOrderValue: currentMonthOrders.length > 0 ? totalValue / currentMonthOrders.length : 0,
      monthlySpending: totalValue
    };

    console.log('Calculated metrics:', metrics);
    return metrics;

  } catch (error) {
    console.error('Error in getSimplePurchasesData:', error);
    throw error;
  }
}