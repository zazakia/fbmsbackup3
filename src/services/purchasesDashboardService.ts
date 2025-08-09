import { getPurchaseOrders, getSuppliers, getPurchaseOrdersByStatus } from '../api/purchases';
import { PurchaseOrder, Supplier, PurchaseOrderStatus } from '../types/business';

// Dashboard-specific interfaces
export interface PurchasesDashboardData {
  metrics: PurchasesMetrics;
  recentOrders: PurchaseOrder[];
  supplierPerformance: SupplierPerformance[];
  alerts: PurchasesAlert[];
  analytics: PurchasesAnalytics;
}

export interface PurchasesMetrics {
  totalPurchasesValue: number;
  totalPurchasesChange: number;
  activePurchaseOrders: number;
  pendingOrders: number;
  averageOrderValue: number;
  monthlySpending: number;
}

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  totalOrders: number;
  totalValue: number;
  averageDeliveryTime: number;
  onTimeDeliveryRate: number;
  qualityRating: number;
}

export interface PurchasesAlert {
  id: string;
  type: 'overdue' | 'pending_approval' | 'partial_delivery' | 'budget_exceeded';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  actionUrl?: string;
}

export interface PurchasesAnalytics {
  monthlyTrends: MonthlyTrend[];
  statusDistribution: StatusDistribution[];
  categoryBreakdown: CategoryBreakdown[];
  yearOverYearComparison: YearOverYearData;
}

export interface MonthlyTrend {
  month: string;
  value: number;
  orders: number;
}

export interface StatusDistribution {
  status: PurchaseOrderStatus;
  count: number;
  value: number;
  percentage: number;
}

export interface CategoryBreakdown {
  category: string;
  value: number;
  percentage: number;
}

export interface YearOverYearData {
  currentYear: number;
  previousYear: number;
  change: number;
  changePercentage: number;
}

class PurchasesDashboardService {
  private static instance: PurchasesDashboardService;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  static getInstance(): PurchasesDashboardService {
    if (!PurchasesDashboardService.instance) {
      PurchasesDashboardService.instance = new PurchasesDashboardService();
    }
    return PurchasesDashboardService.instance;
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedData<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  async getDashboardData(): Promise<PurchasesDashboardData> {
    const cacheKey = 'dashboard-data';
    const cached = this.getCachedData<PurchasesDashboardData>(cacheKey);
    if (cached) {
      console.log('Returning cached purchases data:', cached);
      return cached;
    }

    console.log('Fetching fresh purchases data...');
    try {
      // Fetch all required data in parallel
      const [
        allOrdersResult,
        suppliersResult,
        draftOrdersResult,
        sentOrdersResult,
        partialOrdersResult,
        receivedOrdersResult
      ] = await Promise.all([
        getPurchaseOrders(100), // Get recent 100 orders
        getSuppliers(),
        getPurchaseOrdersByStatus('draft'),
        getPurchaseOrdersByStatus('sent'),
        getPurchaseOrdersByStatus('partial'),
        getPurchaseOrdersByStatus('received')
      ]);

      console.log('API Results:', {
        allOrdersResult,
        suppliersResult,
        draftOrdersResult,
        sentOrdersResult,
        partialOrdersResult,
        receivedOrdersResult
      });

      if (allOrdersResult.error) {
        console.error('Purchase orders error:', allOrdersResult.error);
        throw new Error(`Failed to fetch purchase orders: ${allOrdersResult.error.message}`);
      }

      if (suppliersResult.error) {
        console.error('Suppliers error:', suppliersResult.error);
        // Don't throw error for suppliers, just log it
      }

      const allOrders = allOrdersResult.data || [];
      const suppliers = suppliersResult.data || [];
      const draftOrders = draftOrdersResult.data || [];
      const sentOrders = sentOrdersResult.data || [];
      const partialOrders = partialOrdersResult.data || [];
      const receivedOrders = receivedOrdersResult.data || [];

      console.log('Processed data:', {
        allOrdersCount: allOrders.length,
        suppliersCount: suppliers.length,
        draftOrdersCount: draftOrders.length,
        sentOrdersCount: sentOrders.length,
        partialOrdersCount: partialOrders.length,
        receivedOrdersCount: receivedOrders.length
      });

      // Calculate metrics
      const metrics = this.calculateMetrics(allOrders);
      
      // Get recent orders (last 10)
      const recentOrders = allOrders.slice(0, 10);
      
      // Calculate supplier performance
      const supplierPerformance = this.calculateSupplierPerformance(allOrders, suppliers);
      
      // Generate alerts
      const alerts = this.generateAlerts(allOrders, draftOrders, sentOrders, partialOrders);
      
      // Calculate analytics
      const analytics = this.calculateAnalytics(allOrders, draftOrders, sentOrders, partialOrders, receivedOrders);

      const dashboardData: PurchasesDashboardData = {
        metrics,
        recentOrders,
        supplierPerformance,
        alerts,
        analytics
      };

      console.log('Generated dashboard data:', dashboardData);
      this.setCachedData(cacheKey, dashboardData);
      return dashboardData;

    } catch (error) {
      console.error('Error fetching purchases dashboard data:', error);
      throw error;
    }
  }

  private calculateMetrics(orders: PurchaseOrder[]): PurchasesMetrics {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Current month orders
    const currentMonthOrders = orders.filter(order => 
      new Date(order.createdAt) >= currentMonth && order.status !== 'cancelled'
    );

    // Previous month orders
    const previousMonthOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= previousMonth && orderDate <= previousMonthEnd && order.status !== 'cancelled';
    });

    const currentMonthValue = currentMonthOrders.reduce((sum, order) => sum + order.total, 0);
    const previousMonthValue = previousMonthOrders.reduce((sum, order) => sum + order.total, 0);

    const totalPurchasesChange = previousMonthValue > 0 
      ? ((currentMonthValue - previousMonthValue) / previousMonthValue) * 100 
      : 0;

    const activeOrders = orders.filter(order => 
      ['draft', 'sent', 'partial'].includes(order.status)
    );

    const pendingOrders = orders.filter(order => 
      order.status === 'draft' || order.status === 'sent'
    );

    const averageOrderValue = currentMonthOrders.length > 0 
      ? currentMonthValue / currentMonthOrders.length 
      : 0;

    return {
      totalPurchasesValue: currentMonthValue,
      totalPurchasesChange,
      activePurchaseOrders: activeOrders.length,
      pendingOrders: pendingOrders.length,
      averageOrderValue,
      monthlySpending: currentMonthValue
    };
  }

  private calculateSupplierPerformance(orders: PurchaseOrder[], suppliers: Supplier[]): SupplierPerformance[] {
    const supplierMap = new Map<string, SupplierPerformance>();

    // Initialize supplier performance data
    suppliers.forEach(supplier => {
      supplierMap.set(supplier.id, {
        supplierId: supplier.id,
        supplierName: supplier.name,
        totalOrders: 0,
        totalValue: 0,
        averageDeliveryTime: 0,
        onTimeDeliveryRate: 0,
        qualityRating: 0
      });
    });

    // Calculate performance metrics
    orders.forEach(order => {
      const performance = supplierMap.get(order.supplierId);
      if (performance) {
        performance.totalOrders++;
        performance.totalValue += order.total;

        // Calculate delivery time if order is received
        if (order.receivedDate && order.expectedDate) {
          const deliveryTime = Math.ceil(
            (new Date(order.receivedDate).getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          );
          performance.averageDeliveryTime = 
            (performance.averageDeliveryTime * (performance.totalOrders - 1) + deliveryTime) / performance.totalOrders;

          // Check if delivered on time
          if (new Date(order.receivedDate) <= new Date(order.expectedDate)) {
            performance.onTimeDeliveryRate++;
          }
        }
      }
    });

    // Calculate final rates and sort by total value
    const result = Array.from(supplierMap.values())
      .map(performance => ({
        ...performance,
        onTimeDeliveryRate: performance.totalOrders > 0 
          ? (performance.onTimeDeliveryRate / performance.totalOrders) * 100 
          : 0,
        qualityRating: Math.min(100, Math.max(0, 100 - (performance.averageDeliveryTime * 2))) // Simple quality rating
      }))
      .filter(performance => performance.totalOrders > 0)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10); // Top 10 suppliers

    return result;
  }

  private generateAlerts(
    allOrders: PurchaseOrder[], 
    draftOrders: PurchaseOrder[], 
    sentOrders: PurchaseOrder[], 
    partialOrders: PurchaseOrder[]
  ): PurchasesAlert[] {
    const alerts: PurchasesAlert[] = [];
    const now = new Date();

    // Overdue orders alert
    const overdueOrders = sentOrders.filter(order => 
      order.expectedDate && new Date(order.expectedDate) < now
    );

    if (overdueOrders.length > 0) {
      alerts.push({
        id: 'overdue-orders',
        type: 'overdue',
        message: `${overdueOrders.length} purchase orders are overdue`,
        severity: overdueOrders.length > 5 ? 'critical' : overdueOrders.length > 2 ? 'high' : 'medium',
        count: overdueOrders.length,
        actionUrl: '/purchases?filter=overdue'
      });
    }

    // Pending approval alert
    if (draftOrders.length > 0) {
      alerts.push({
        id: 'pending-approval',
        type: 'pending_approval',
        message: `${draftOrders.length} purchase orders pending approval`,
        severity: draftOrders.length > 10 ? 'high' : 'medium',
        count: draftOrders.length,
        actionUrl: '/purchases?filter=draft'
      });
    }

    // Partial delivery alert
    if (partialOrders.length > 0) {
      alerts.push({
        id: 'partial-delivery',
        type: 'partial_delivery',
        message: `${partialOrders.length} orders have partial deliveries`,
        severity: 'medium',
        count: partialOrders.length,
        actionUrl: '/purchases?filter=partial'
      });
    }

    // Budget exceeded alert (simplified - based on monthly spending)
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyOrders = allOrders.filter(order => 
      new Date(order.createdAt) >= currentMonth && order.status !== 'cancelled'
    );
    const monthlySpending = monthlyOrders.reduce((sum, order) => sum + order.total, 0);
    const budgetLimit = 500000; // Example budget limit

    if (monthlySpending > budgetLimit) {
      alerts.push({
        id: 'budget-exceeded',
        type: 'budget_exceeded',
        message: `Monthly spending exceeded budget by ₱${(monthlySpending - budgetLimit).toLocaleString()}`,
        severity: 'critical',
        count: 1,
        actionUrl: '/purchases/reports'
      });
    }

    return alerts;
  }

  private calculateAnalytics(
    allOrders: PurchaseOrder[],
    draftOrders: PurchaseOrder[],
    sentOrders: PurchaseOrder[],
    partialOrders: PurchaseOrder[],
    receivedOrders: PurchaseOrder[]
  ): PurchasesAnalytics {
    // Monthly trends (last 6 months)
    const monthlyTrends = this.calculateMonthlyTrends(allOrders);

    // Status distribution
    const statusDistribution = this.calculateStatusDistribution(
      draftOrders, sentOrders, partialOrders, receivedOrders
    );

    // Category breakdown (simplified)
    const categoryBreakdown = this.calculateCategoryBreakdown(allOrders);

    // Year over year comparison
    const yearOverYearComparison = this.calculateYearOverYear(allOrders);

    return {
      monthlyTrends,
      statusDistribution,
      categoryBreakdown,
      yearOverYearComparison
    };
  }

  private calculateMonthlyTrends(orders: PurchaseOrder[]): MonthlyTrend[] {
    const trends: MonthlyTrend[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= monthDate && orderDate < nextMonth && order.status !== 'cancelled';
      });

      const monthValue = monthOrders.reduce((sum, order) => sum + order.total, 0);

      trends.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        value: monthValue,
        orders: monthOrders.length
      });
    }

    return trends;
  }

  private calculateStatusDistribution(
    draftOrders: PurchaseOrder[],
    sentOrders: PurchaseOrder[],
    partialOrders: PurchaseOrder[],
    receivedOrders: PurchaseOrder[]
  ): StatusDistribution[] {
    const totalOrders = draftOrders.length + sentOrders.length + partialOrders.length + receivedOrders.length;
    const totalValue = [
      ...draftOrders, ...sentOrders, ...partialOrders, ...receivedOrders
    ].reduce((sum, order) => sum + order.total, 0);

    const statuses: { status: PurchaseOrderStatus; orders: PurchaseOrder[] }[] = [
      { status: 'draft', orders: draftOrders },
      { status: 'sent', orders: sentOrders },
      { status: 'partial', orders: partialOrders },
      { status: 'received', orders: receivedOrders }
    ];

    return statuses.map(({ status, orders }) => {
      const statusValue = orders.reduce((sum, order) => sum + order.total, 0);
      return {
        status,
        count: orders.length,
        value: statusValue,
        percentage: totalOrders > 0 ? (orders.length / totalOrders) * 100 : 0
      };
    });
  }

  private calculateCategoryBreakdown(orders: PurchaseOrder[]): CategoryBreakdown[] {
    // Simplified category breakdown - in real implementation, this would use product categories
    const categories = new Map<string, number>();
    const totalValue = orders.reduce((sum, order) => sum + order.total, 0);

    // For now, categorize by supplier name as a proxy
    orders.forEach(order => {
      if (order.status !== 'cancelled') {
        const category = order.supplierName || 'Unknown';
        categories.set(category, (categories.get(category) || 0) + order.total);
      }
    });

    return Array.from(categories.entries())
      .map(([category, value]) => ({
        category,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10); // Top 10 categories
  }

  private calculateYearOverYear(orders: PurchaseOrder[]): YearOverYearData {
    const now = new Date();
    const currentYear = now.getFullYear();
    const previousYear = currentYear - 1;

    const currentYearOrders = orders.filter(order => 
      new Date(order.createdAt).getFullYear() === currentYear && order.status !== 'cancelled'
    );

    const previousYearOrders = orders.filter(order => 
      new Date(order.createdAt).getFullYear() === previousYear && order.status !== 'cancelled'
    );

    const currentYearValue = currentYearOrders.reduce((sum, order) => sum + order.total, 0);
    const previousYearValue = previousYearOrders.reduce((sum, order) => sum + order.total, 0);

    const change = currentYearValue - previousYearValue;
    const changePercentage = previousYearValue > 0 ? (change / previousYearValue) * 100 : 0;

    return {
      currentYear: currentYearValue,
      previousYear: previousYearValue,
      change,
      changePercentage
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const purchasesDashboardService = PurchasesDashboardService.getInstance();