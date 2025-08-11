import { supabase } from '../utils/supabase';
import { EnhancedPurchaseOrder } from '../types/business';
import { getReceivableStatuses, mapLegacyToEnhanced } from '../utils/statusMappings';

export interface ReceivingQueueItem extends EnhancedPurchaseOrder {
  priority: 'high' | 'medium' | 'low';
  daysUntilExpected: number;
  isOverdue: boolean;
}

export interface ReceivingMetrics {
  // Performance metrics
  averageReceivingTime: number; // in hours
  receivingTimeChange: number; // percentage change
  onTimeDeliveryRate: number; // percentage
  onTimeDeliveryChange: number; // percentage change
  
  // Volume metrics
  totalOrdersReceived: number;
  totalOrdersChange: number; // percentage change
  totalItemsReceived: number;
  totalItemsChange: number; // percentage change
  totalValueReceived: number;
  totalValueChange: number; // percentage change
  
  // Quality metrics
  accuracyRate: number; // percentage of orders received without discrepancies
  accuracyChange: number; // percentage change
  damageRate: number; // percentage of damaged items
  damageRateChange: number; // percentage change
  
  // Efficiency metrics
  avgOrdersPerDay: number;
  avgOrdersPerDayChange: number; // percentage change
  staffProductivity: number; // orders per staff per day
  staffProductivityChange: number; // percentage change
  
  // Trend data for charts
  dailyReceivingTrend: Array<{
    date: string;
    orders: number;
    items: number;
    value: number;
  }>;
  
  // Top performing suppliers
  topSuppliers: Array<{
    name: string;
    ordersReceived: number;
    onTimeRate: number;
    qualityScore: number;
  }>;
  
  // Recent issues
  recentIssues: Array<{
    type: 'overdue' | 'damaged' | 'quantity_mismatch' | 'quality_issue';
    description: string;
    orderNumber: string;
    date: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

export interface OverdueAlert {
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

class ReceivingDashboardService {
  // Legacy mapping function removed - now using centralized utility from statusMappings.ts

  /**
   * Get the receiving queue - orders that can be received
   */
  async getReceivingQueue(): Promise<EnhancedPurchaseOrder[]> {
    try {
      console.log('Fetching receiving queue...');
      
      // Get purchase orders that can be received
      // Use status for now until enhanced_status is available
      const receivableStatuses = getReceivableStatuses();
      console.log('🔍 DEBUG: Using receivable statuses:', receivableStatuses);
      
      const { data: orders, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .in('status', receivableStatuses) // approved POs that are sent/partially received
        .order('expected_date', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Error fetching receiving queue:', error);
        throw error;
      }

      console.log('🔍 DEBUG: Fetched receiving queue orders:', orders);
      console.log('🔍 DEBUG: Order statuses in receiving queue:', orders?.map(o => ({ poNumber: o.po_number, status: o.status, id: o.id })));
      console.log('🔍 DEBUG: Orders that match receivable filter:', orders?.filter(o => receivableStatuses.includes(o.status)));

      // Transform to enhanced purchase orders  
      const enhancedOrders: EnhancedPurchaseOrder[] = (orders || []).map(order => {
        // Parse items from JSONB column
        const items = Array.isArray(order.items) ? order.items : [];
        const totalItems = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
        const totalReceived = items.reduce((sum, item) => sum + (Number(item.receivedQuantity || item.receivedQty) || 0), 0);
        
        return {
          id: order.id,
          poNumber: order.po_number || `PO-${order.id.slice(-8)}`,
          supplierId: order.supplier_id || '',
          supplierName: order.supplier_name || 'Unknown Supplier',
          items: items.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            productName: item.productName || 'Unknown Product',
            sku: item.sku || '',
            quantity: item.quantity || 0,
            cost: item.cost || 0,
            total: (item.quantity || 0) * (item.cost || 0)
          })),
          subtotal: order.subtotal || 0,
          tax: order.tax || 0,
          total: order.total || 0,
          status: mapLegacyToEnhanced(order.status),
          expectedDate: order.expected_date ? new Date(order.expected_date) : undefined,
          expectedDeliveryDate: order.expected_date ? new Date(order.expected_date) : undefined,
          receivedDate: order.received_date ? new Date(order.received_date) : undefined,
          createdBy: order.created_by,
          createdAt: new Date(order.created_at),
          
          // Enhanced fields
          statusHistory: [],
          receivingHistory: [],
          validationErrors: [],
          approvalHistory: [],
          totalReceived,
          totalPending: totalItems - totalReceived,
          isPartiallyReceived: totalReceived > 0 && totalReceived < totalItems,
          isFullyReceived: totalReceived >= totalItems && totalItems > 0,
          lastReceivedDate: order.last_received_date ? new Date(order.last_received_date) : undefined,
          actualDeliveryDate: order.actual_delivery_date ? new Date(order.actual_delivery_date) : undefined,
          supplierReference: order.supplier_reference,
          internalNotes: order.internal_notes,
          attachments: order.attachments || []
        };
      });

      console.log('Transformed enhanced orders:', enhancedOrders.length);
      return enhancedOrders;
      
    } catch (error) {
      console.error('Error in getReceivingQueue:', error);
      return [];
    }
  }

  /**
   * Get receiving performance metrics
   */
  async getReceivingMetrics(): Promise<ReceivingMetrics> {
    try {
      console.log('Fetching receiving metrics...');
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Get recent orders for metrics
      const { data: recentOrders, error: recentError } = await supabase
        .from('purchase_orders')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (recentError) {
        console.error('Error fetching recent orders:', recentError);
        throw recentError;
      }

      // Get previous period for comparison
      const { data: previousOrders, error: previousError } = await supabase
        .from('purchase_orders')
        .select('*')
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (previousError) {
        console.error('Error fetching previous period orders:', previousError);
      }

      const current = recentOrders || [];
      const previous = previousOrders || [];
      
      // Calculate metrics
      const receivedOrders = current.filter(o => ['received', 'partial'].includes(o.status));
      const previousReceivedOrders = previous.filter(o => ['received', 'partial'].includes(o.status));
      
      // Calculate average receiving time (mock calculation)
      const avgReceivingTime = 2.4; // hours
      const previousAvgReceivingTime = 2.6; // hours
      
      // Calculate on-time delivery rate
      const onTimeOrders = receivedOrders.filter(o => {
        if (!o.expected_date || !o.received_date) return false;
        return new Date(o.received_date) <= new Date(o.expected_date);
      });
      
      const onTimeRate = receivedOrders.length > 0 ? (onTimeOrders.length / receivedOrders.length) * 100 : 0;
      
      // Generate daily trend data
      const dailyTrend = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
        const dayOrders = current.filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate.toDateString() === date.toDateString();
        });
        
        return {
          date: date.toISOString().split('T')[0],
          orders: dayOrders.length,
          items: dayOrders.reduce((sum, o) => sum + (o.total_items || 10), 0), // mock items count
          value: dayOrders.reduce((sum, o) => sum + (o.total || 0), 0)
        };
      });

      const metrics: ReceivingMetrics = {
        // Performance metrics
        averageReceivingTime: avgReceivingTime,
        receivingTimeChange: ((avgReceivingTime - previousAvgReceivingTime) / previousAvgReceivingTime) * 100,
        onTimeDeliveryRate: onTimeRate,
        onTimeDeliveryChange: 5.2, // mock change
        
        // Volume metrics
        totalOrdersReceived: receivedOrders.length,
        totalOrdersChange: previousReceivedOrders.length > 0 ? 
          ((receivedOrders.length - previousReceivedOrders.length) / previousReceivedOrders.length) * 100 : 0,
        totalItemsReceived: receivedOrders.reduce((sum, o) => sum + (o.total_items || 25), 0), // mock
        totalItemsChange: 12.5, // mock
        totalValueReceived: receivedOrders.reduce((sum, o) => sum + (o.total || 0), 0),
        totalValueChange: 8.3, // mock
        
        // Quality metrics
        accuracyRate: 94.2, // mock
        accuracyChange: 2.1, // mock
        damageRate: 1.8, // mock
        damageRateChange: -0.3, // mock
        
        // Efficiency metrics
        avgOrdersPerDay: receivedOrders.length / 30,
        avgOrdersPerDayChange: 15.7, // mock
        staffProductivity: 8.5, // mock
        staffProductivityChange: 6.2, // mock
        
        dailyReceivingTrend: dailyTrend,
        
        topSuppliers: [
          {
            name: 'ABC Trading Corp',
            ordersReceived: 28,
            onTimeRate: 92.8,
            qualityScore: 96.5
          },
          {
            name: 'XYZ Supply Chain',
            ordersReceived: 22,
            onTimeRate: 86.4,
            qualityScore: 91.2
          },
          {
            name: 'Global Distributors Inc',
            ordersReceived: 19,
            onTimeRate: 84.2,
            qualityScore: 89.8
          }
        ],
        
        recentIssues: [
          {
            type: 'overdue',
            description: 'Delivery overdue by 3 days',
            orderNumber: 'PO-001234',
            date: new Date().toISOString(),
            severity: 'high'
          },
          {
            type: 'quantity_mismatch',
            description: 'Received 95 units instead of 100',
            orderNumber: 'PO-001233',
            date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            severity: 'medium'
          }
        ]
      };

      console.log('Calculated receiving metrics:', metrics);
      return metrics;
      
    } catch (error) {
      console.error('Error in getReceivingMetrics:', error);
      
      // Return default metrics on error
      return {
        averageReceivingTime: 0,
        receivingTimeChange: 0,
        onTimeDeliveryRate: 0,
        onTimeDeliveryChange: 0,
        totalOrdersReceived: 0,
        totalOrdersChange: 0,
        totalItemsReceived: 0,
        totalItemsChange: 0,
        totalValueReceived: 0,
        totalValueChange: 0,
        accuracyRate: 0,
        accuracyChange: 0,
        damageRate: 0,
        damageRateChange: 0,
        avgOrdersPerDay: 0,
        avgOrdersPerDayChange: 0,
        staffProductivity: 0,
        staffProductivityChange: 0,
        dailyReceivingTrend: [],
        topSuppliers: [],
        recentIssues: []
      };
    }
  }

  /**
   * Get overdue alerts
   */
  async getOverdueAlerts(): Promise<OverdueAlert[]> {
    try {
      console.log('Fetching overdue alerts...');
      
      // Use status for now until enhanced_status is available
      const receivableStatuses = getReceivableStatuses();
      const { data: orders, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .in('status', receivableStatuses) // orders that can be received
        .order('expected_date', { ascending: true });

      if (error) {
        console.error('Error fetching orders for alerts:', error);
        throw error;
      }

      const now = new Date();
      const alerts: OverdueAlert[] = [];

      (orders || []).forEach(order => {
        const expectedDate = order.expected_date ? new Date(order.expected_date) : null;
        
        if (expectedDate && expectedDate < now) {
          const daysOverdue = Math.floor((now.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
          const orderValue = order.total || 0;
          
          let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
          if (daysOverdue > 7 || orderValue > 100000) severity = 'critical';
          else if (daysOverdue > 3 || orderValue > 50000) severity = 'high';
          else if (daysOverdue > 1) severity = 'medium';
          else severity = 'low';

          alerts.push({
            id: `alert-${order.id}`,
            type: 'overdue_delivery',
            orderId: order.id,
            orderNumber: order.po_number || `PO-${order.id.slice(-8)}`,
            supplierName: order.supplier_name || 'Unknown Supplier',
            severity,
            title: `Purchase Order ${order.po_number || order.id.slice(-8)} is overdue`,
            description: `Expected delivery was ${daysOverdue} days ago. Supplier: ${order.supplier_name}`,
            daysOverdue,
            expectedDate,
            orderValue,
            actionRequired: 'Contact supplier for updated delivery schedule',
            createdAt: new Date(order.created_at),
            updatedAt: new Date(order.updated_at || order.created_at),
            isAcknowledged: false
          });
        }
      });

      // Sort by severity and days overdue
      alerts.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.daysOverdue - a.daysOverdue;
      });

      console.log('Generated overdue alerts:', alerts.length);
      return alerts;
      
    } catch (error) {
      console.error('Error in getOverdueAlerts:', error);
      return [];
    }
  }

  /**
   * Map legacy status to enhanced status - DEPRECATED, use enhanced_status directly
   * @deprecated Use enhanced_status field directly instead of legacy status mapping
   */
  private mapLegacyStatus(status: string): string {
    console.warn('mapLegacyStatus is deprecated. Use enhanced_status field directly.');
    const statusMap: Record<string, string> = {
      'draft': 'draft',
      'sent': 'sent_to_supplier',
      'approved': 'approved',
      'partial': 'partially_received',
      'received': 'fully_received',
      'cancelled': 'cancelled'
    };
    
    return statusMap[status] || status;
  }

  /**
   * Calculate priority based on order characteristics
   */
  private calculatePriority(order: Record<string, unknown>): 'high' | 'medium' | 'low' {
    const now = new Date();
    const expectedDate = order.expectedDate || order.expected_date;
    const daysDiff = expectedDate ? 
      Math.floor((new Date(expectedDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 999;
    const isHighValue = (order.total || 0) > 50000;
    
    if (daysDiff < 0 || (daysDiff <= 2 && isHighValue)) return 'high';
    if (daysDiff <= 5 || isHighValue) return 'medium';
    return 'low';
  }
}

export const receivingDashboardService = new ReceivingDashboardService();