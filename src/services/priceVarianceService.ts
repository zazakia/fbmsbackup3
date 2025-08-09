import { PriceVarianceRecord } from './weightedAverageCostService';
import { PurchaseOrderItem } from '../types/business';
import { supabase } from '../utils/supabase';

export interface PriceVarianceAnalysis {
  totalVariances: number;
  significantVariances: number;
  favorableVariances: number;
  unfavorableVariances: number;
  totalVarianceAmount: number;
  averageVariancePercentage: number;
  topVariancesByAmount: PriceVarianceRecord[];
  topVariancesByPercentage: PriceVarianceRecord[];
}

export interface VarianceThresholds {
  minimumPercentage: number; // Minimum variance percentage to record (default: 5%)
  significantPercentage: number; // Percentage threshold for significant variances (default: 10%)
  criticalPercentage: number; // Percentage threshold for critical variances (default: 25%)
  minimumAmount: number; // Minimum absolute amount to record (default: 10.00)
}

export interface VarianceApprovalRule {
  id: string;
  name: string;
  description: string;
  conditions: {
    maxPercentage?: number;
    maxAmount?: number;
    productCategories?: string[];
    supplierIds?: string[];
  };
  approvalRequired: boolean;
  autoApprove: boolean;
  escalationLevel: 'none' | 'supervisor' | 'manager' | 'director';
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

export interface VarianceAlert {
  id: string;
  priceVarianceId: string;
  alertType: 'significant_variance' | 'critical_variance' | 'pattern_detected' | 'approval_required';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recipientRoles: string[];
  sentAt?: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export interface VarianceReportData {
  period: { from: Date; to: Date };
  summary: PriceVarianceAnalysis;
  variancesBySupplier: Array<{
    supplierId: string;
    supplierName: string;
    totalVariances: number;
    totalAmount: number;
    averagePercentage: number;
  }>;
  variancesByProduct: Array<{
    productId: string;
    productName: string;
    totalVariances: number;
    totalAmount: number;
    averagePercentage: number;
  }>;
  variancesByCategory: Array<{
    category: string;
    totalVariances: number;
    totalAmount: number;
    averagePercentage: number;
  }>;
  trends: Array<{
    date: Date;
    varianceCount: number;
    totalAmount: number;
    averagePercentage: number;
  }>;
}

/**
 * Comprehensive service for detecting, recording, and managing price variances.
 * Provides variance analysis, approval workflows, and reporting capabilities.
 */
export class PriceVarianceService {
  private readonly defaultThresholds: VarianceThresholds = {
    minimumPercentage: 5.0,
    significantPercentage: 10.0,
    criticalPercentage: 25.0,
    minimumAmount: 10.00
  };

  /**
   * Detect and record price variances with enhanced analysis
   */
  async detectAndRecordVariances(
    purchaseOrderItems: PurchaseOrderItem[],
    actualReceipts: Array<{
      productId: string;
      actualCost: number;
      receivedQuantity: number;
      supplierId?: string;
      supplierName?: string;
    }>,
    referenceId: string,
    referenceType: 'purchase_order' | 'invoice' | 'receipt',
    thresholds?: Partial<VarianceThresholds>
  ): Promise<{
    variances: PriceVarianceRecord[];
    analysis: PriceVarianceAnalysis;
    alerts: VarianceAlert[];
  }> {
    const activeThresholds = { ...this.defaultThresholds, ...thresholds };
    const variances: PriceVarianceRecord[] = [];
    const alerts: VarianceAlert[] = [];

    try {
      // Process each receipt and detect variances
      for (const receipt of actualReceipts) {
        const poItem = purchaseOrderItems.find(item => item.productId === receipt.productId);
        
        if (!poItem) continue;

        const variance = await this.calculateVariance(
          poItem,
          receipt,
          referenceId,
          referenceType,
          activeThresholds
        );

        if (variance) {
          variances.push(variance);

          // Check if variance requires alerts
          const varianceAlerts = await this.generateVarianceAlerts(variance);
          alerts.push(...varianceAlerts);
        }
      }

      // Save variances to database
      if (variances.length > 0) {
        await this.saveVariances(variances);
      }

      // Generate analysis
      const analysis = this.analyzeVariances(variances);

      // Send alerts if any
      if (alerts.length > 0) {
        await this.processAlerts(alerts);
      }

      return { variances, analysis, alerts };

    } catch (error) {
      console.error('Error detecting price variances:', error);
      throw new Error(`Failed to detect price variances: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate individual price variance
   */
  private async calculateVariance(
    poItem: PurchaseOrderItem,
    receipt: {
      productId: string;
      actualCost: number;
      receivedQuantity: number;
      supplierId?: string;
      supplierName?: string;
    },
    referenceId: string,
    referenceType: string,
    thresholds: VarianceThresholds
  ): Promise<PriceVarianceRecord | null> {
    const expectedCost = poItem.cost;
    const actualCost = receipt.actualCost;
    const variance = actualCost - expectedCost;
    const variancePercentage = expectedCost > 0 ? (variance / expectedCost) * 100 : 0;
    const totalVarianceAmount = variance * receipt.receivedQuantity;

    // Check if variance meets recording thresholds
    const meetsPercentageThreshold = Math.abs(variancePercentage) >= thresholds.minimumPercentage;
    const meetsAmountThreshold = Math.abs(totalVarianceAmount) >= thresholds.minimumAmount;

    if (!meetsPercentageThreshold && !meetsAmountThreshold) {
      return null; // Variance too small to record
    }

    // Get product details for context
    const productDetails = await this.getProductDetails(receipt.productId);

    const varianceRecord: PriceVarianceRecord = {
      id: this.generateId(),
      productId: receipt.productId,
      productName: productDetails?.name || poItem.productName,
      productSku: productDetails?.sku || poItem.productSku,
      referenceId,
      referenceType,
      expectedCost,
      actualCost,
      variance: Number(variance.toFixed(4)),
      variancePercentage: Number(variancePercentage.toFixed(2)),
      quantity: receipt.receivedQuantity,
      totalVarianceAmount: Number(totalVarianceAmount.toFixed(2)),
      detectedAt: new Date(),
      status: this.determineInitialStatus(variancePercentage, totalVarianceAmount, thresholds),
      notes: `Variance detected: ${variance >= 0 ? 'Unfavorable' : 'Favorable'} ${Math.abs(variancePercentage).toFixed(1)}%`
    };

    return varianceRecord;
  }

  /**
   * Determine initial status based on variance magnitude and approval rules
   */
  private determineInitialStatus(
    variancePercentage: number,
    totalVarianceAmount: number,
    thresholds: VarianceThresholds
  ): 'pending' | 'reviewed' | 'approved' | 'rejected' {
    const absPercentage = Math.abs(variancePercentage);
    const absAmount = Math.abs(totalVarianceAmount);

    // Auto-approve small favorable variances
    if (variancePercentage < 0 && absPercentage < thresholds.significantPercentage && absAmount < 100) {
      return 'approved';
    }

    // Large or unfavorable variances require review
    if (absPercentage > thresholds.significantPercentage || absAmount > 500) {
      return 'pending';
    }

    // Default status for moderate variances
    return 'pending';
  }

  /**
   * Generate alerts for significant variances
   */
  private async generateVarianceAlerts(variance: PriceVarianceRecord): Promise<VarianceAlert[]> {
    const alerts: VarianceAlert[] = [];
    const absPercentage = Math.abs(variance.variancePercentage);
    const absAmount = Math.abs(variance.totalVarianceAmount);

    // Critical variance alert
    if (absPercentage > this.defaultThresholds.criticalPercentage || absAmount > 1000) {
      alerts.push({
        id: this.generateId(),
        priceVarianceId: variance.id,
        alertType: 'critical_variance',
        title: 'Critical Price Variance Detected',
        message: `Critical price variance detected for ${variance.productName}: ${variance.variancePercentage}% (${variance.variance >= 0 ? '+' : ''}$${variance.variance.toFixed(2)})`,
        severity: 'critical',
        recipientRoles: ['procurement_manager', 'finance_manager', 'operations_manager'],
        resolved: false
      });
    }
    
    // Significant variance alert
    else if (absPercentage > this.defaultThresholds.significantPercentage || absAmount > 500) {
      alerts.push({
        id: this.generateId(),
        priceVarianceId: variance.id,
        alertType: 'significant_variance',
        title: 'Significant Price Variance Detected',
        message: `Significant price variance for ${variance.productName}: ${variance.variancePercentage}% (${variance.variance >= 0 ? '+' : ''}$${variance.variance.toFixed(2)})`,
        severity: 'high',
        recipientRoles: ['procurement_manager', 'warehouse_supervisor'],
        resolved: false
      });
    }

    // Approval required alert
    if (variance.status === 'pending' && (absPercentage > 15 || absAmount > 300)) {
      alerts.push({
        id: this.generateId(),
        priceVarianceId: variance.id,
        alertType: 'approval_required',
        title: 'Price Variance Approval Required',
        message: `Price variance requires approval: ${variance.productName} - ${variance.variancePercentage}%`,
        severity: 'medium',
        recipientRoles: ['procurement_manager'],
        resolved: false
      });
    }

    return alerts;
  }

  /**
   * Analyze collection of variances for reporting
   */
  private analyzeVariances(variances: PriceVarianceRecord[]): PriceVarianceAnalysis {
    if (variances.length === 0) {
      return {
        totalVariances: 0,
        significantVariances: 0,
        favorableVariances: 0,
        unfavorableVariances: 0,
        totalVarianceAmount: 0,
        averageVariancePercentage: 0,
        topVariancesByAmount: [],
        topVariancesByPercentage: []
      };
    }

    const significantVariances = variances.filter(v => 
      Math.abs(v.variancePercentage) > this.defaultThresholds.significantPercentage
    );

    const favorableVariances = variances.filter(v => v.variance < 0);
    const unfavorableVariances = variances.filter(v => v.variance > 0);

    const totalVarianceAmount = variances.reduce((sum, v) => sum + v.totalVarianceAmount, 0);
    const averageVariancePercentage = variances.reduce((sum, v) => sum + Math.abs(v.variancePercentage), 0) / variances.length;

    const topVariancesByAmount = [...variances]
      .sort((a, b) => Math.abs(b.totalVarianceAmount) - Math.abs(a.totalVarianceAmount))
      .slice(0, 10);

    const topVariancesByPercentage = [...variances]
      .sort((a, b) => Math.abs(b.variancePercentage) - Math.abs(a.variancePercentage))
      .slice(0, 10);

    return {
      totalVariances: variances.length,
      significantVariances: significantVariances.length,
      favorableVariances: favorableVariances.length,
      unfavorableVariances: unfavorableVariances.length,
      totalVarianceAmount: Number(totalVarianceAmount.toFixed(2)),
      averageVariancePercentage: Number(averageVariancePercentage.toFixed(2)),
      topVariancesByAmount,
      topVariancesByPercentage
    };
  }

  /**
   * Save variances to database
   */
  private async saveVariances(variances: PriceVarianceRecord[]): Promise<void> {
    try {
      const { error } = await supabase
        .from('price_variances')
        .insert(variances.map(variance => ({
          id: variance.id,
          product_id: variance.productId,
          product_name: variance.productName,
          product_sku: variance.productSku,
          reference_id: variance.referenceId,
          reference_type: variance.referenceType,
          expected_cost: variance.expectedCost,
          actual_cost: variance.actualCost,
          variance: variance.variance,
          variance_percentage: variance.variancePercentage,
          quantity: variance.quantity,
          total_variance_amount: variance.totalVarianceAmount,
          detected_at: variance.detectedAt.toISOString(),
          status: variance.status,
          notes: variance.notes
        })));

      if (error) {
        throw new Error(`Failed to save price variances: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving price variances:', error);
      throw error;
    }
  }

  /**
   * Process and send alerts
   */
  private async processAlerts(alerts: VarianceAlert[]): Promise<void> {
    try {
      // Save alerts to database
      const { error } = await supabase
        .from('variance_alerts')
        .insert(alerts.map(alert => ({
          id: alert.id,
          price_variance_id: alert.priceVarianceId,
          alert_type: alert.alertType,
          title: alert.title,
          message: alert.message,
          severity: alert.severity,
          recipient_roles: JSON.stringify(alert.recipientRoles),
          resolved: alert.resolved
        })));

      if (error) {
        throw new Error(`Failed to save variance alerts: ${error.message}`);
      }

      // In a real implementation, you would also send notifications here
      // (email, push notifications, etc.)
      console.info(`Generated ${alerts.length} variance alerts`);

    } catch (error) {
      console.error('Error processing variance alerts:', error);
      // Don't throw here as alerts are secondary to variance recording
    }
  }

  /**
   * Approve or reject price variance
   */
  async reviewVariance(
    varianceId: string,
    action: 'approve' | 'reject',
    reviewedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      const status = action === 'approve' ? 'approved' : 'rejected';
      const reviewNotes = notes || `Variance ${action}d by ${reviewedBy}`;

      const { error } = await supabase
        .from('price_variances')
        .update({
          status,
          reviewed_by: reviewedBy,
          reviewed_at: new Date().toISOString(),
          notes: reviewNotes
        })
        .eq('id', varianceId);

      if (error) {
        throw new Error(`Failed to update variance status: ${error.message}`);
      }

      // Mark related alerts as resolved
      await supabase
        .from('variance_alerts')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString()
        })
        .eq('price_variance_id', varianceId);

    } catch (error) {
      console.error('Error reviewing price variance:', error);
      throw error;
    }
  }

  /**
   * Generate variance report for a specific period
   */
  async generateVarianceReport(
    dateFrom: Date,
    dateTo: Date,
    filters?: {
      supplierIds?: string[];
      productIds?: string[];
      categories?: string[];
      minVariancePercentage?: number;
    }
  ): Promise<VarianceReportData> {
    try {
      // Build query with filters
      let query = supabase
        .from('price_variances')
        .select(`
          *,
          products!inner(name, sku, category)
        `)
        .gte('detected_at', dateFrom.toISOString())
        .lte('detected_at', dateTo.toISOString());

      if (filters?.productIds?.length) {
        query = query.in('product_id', filters.productIds);
      }

      if (filters?.minVariancePercentage) {
        query = query.or(`variance_percentage.gte.${filters.minVariancePercentage},variance_percentage.lte.${-filters.minVariancePercentage}`);
      }

      const { data: variances, error } = await query.order('detected_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch variances for report: ${error.message}`);
      }

      if (!variances || variances.length === 0) {
        return this.createEmptyReport(dateFrom, dateTo);
      }

      // Convert to PriceVarianceRecord format
      const varianceRecords: PriceVarianceRecord[] = variances.map(v => ({
        id: v.id,
        productId: v.product_id,
        productName: v.product_name,
        productSku: v.product_sku,
        referenceId: v.reference_id,
        referenceType: v.reference_type,
        expectedCost: v.expected_cost,
        actualCost: v.actual_cost,
        variance: v.variance,
        variancePercentage: v.variance_percentage,
        quantity: v.quantity,
        totalVarianceAmount: v.total_variance_amount,
        detectedAt: new Date(v.detected_at),
        status: v.status,
        reviewedBy: v.reviewed_by,
        reviewedAt: v.reviewed_at ? new Date(v.reviewed_at) : undefined,
        notes: v.notes
      }));

      // Generate comprehensive analysis
      const summary = this.analyzeVariances(varianceRecords);

      // Group by supplier (would need supplier data joined)
      const variancesBySupplier: any[] = []; // Placeholder

      // Group by product
      const variancesByProduct = this.groupVariancesByProduct(varianceRecords);

      // Group by category
      const variancesByCategory = this.groupVariancesByCategory(varianceRecords, variances);

      // Generate trends
      const trends = this.generateVarianceTrends(varianceRecords, dateFrom, dateTo);

      return {
        period: { from: dateFrom, to: dateTo },
        summary,
        variancesBySupplier,
        variancesByProduct,
        variancesByCategory,
        trends
      };

    } catch (error) {
      console.error('Error generating variance report:', error);
      throw error;
    }
  }

  /**
   * Get product details for variance context
   */
  private async getProductDetails(productId: string): Promise<{ name: string; sku: string } | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('name, sku')
        .eq('id', productId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        name: data.name,
        sku: data.sku
      };
    } catch (error) {
      console.warn(`Could not get product details for ${productId}:`, error);
      return null;
    }
  }

  /**
   * Group variances by product for reporting
   */
  private groupVariancesByProduct(variances: PriceVarianceRecord[]) {
    const grouped = new Map<string, {
      productId: string;
      productName: string;
      variances: PriceVarianceRecord[];
    }>();

    variances.forEach(variance => {
      const key = variance.productId;
      if (!grouped.has(key)) {
        grouped.set(key, {
          productId: variance.productId,
          productName: variance.productName,
          variances: []
        });
      }
      grouped.get(key)!.variances.push(variance);
    });

    return Array.from(grouped.values()).map(group => ({
      productId: group.productId,
      productName: group.productName,
      totalVariances: group.variances.length,
      totalAmount: group.variances.reduce((sum, v) => sum + v.totalVarianceAmount, 0),
      averagePercentage: group.variances.reduce((sum, v) => sum + Math.abs(v.variancePercentage), 0) / group.variances.length
    }));
  }

  /**
   * Group variances by category for reporting
   */
  private groupVariancesByCategory(variances: PriceVarianceRecord[], rawData: any[]) {
    const categoryMap = new Map<string, { variances: PriceVarianceRecord[] }>();

    rawData.forEach((raw, index) => {
      const category = raw.products?.category || 'Unknown';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { variances: [] });
      }
      if (variances[index]) {
        categoryMap.get(category)!.variances.push(variances[index]);
      }
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      totalVariances: data.variances.length,
      totalAmount: data.variances.reduce((sum, v) => sum + v.totalVarianceAmount, 0),
      averagePercentage: data.variances.length > 0 ? data.variances.reduce((sum, v) => sum + Math.abs(v.variancePercentage), 0) / data.variances.length : 0
    }));
  }

  /**
   * Generate variance trends over time
   */
  private generateVarianceTrends(variances: PriceVarianceRecord[], dateFrom: Date, dateTo: Date) {
    // Group by day
    const dailyData = new Map<string, PriceVarianceRecord[]>();
    const currentDate = new Date(dateFrom);

    // Initialize all days in range
    while (currentDate <= dateTo) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyData.set(dateKey, []);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Group variances by date
    variances.forEach(variance => {
      const dateKey = variance.detectedAt.toISOString().split('T')[0];
      if (dailyData.has(dateKey)) {
        dailyData.get(dateKey)!.push(variance);
      }
    });

    // Convert to trend data
    return Array.from(dailyData.entries()).map(([dateStr, dayVariances]) => ({
      date: new Date(dateStr),
      varianceCount: dayVariances.length,
      totalAmount: dayVariances.reduce((sum, v) => sum + v.totalVarianceAmount, 0),
      averagePercentage: dayVariances.length > 0 ? dayVariances.reduce((sum, v) => sum + Math.abs(v.variancePercentage), 0) / dayVariances.length : 0
    }));
  }

  /**
   * Create empty report structure
   */
  private createEmptyReport(dateFrom: Date, dateTo: Date): VarianceReportData {
    return {
      period: { from: dateFrom, to: dateTo },
      summary: {
        totalVariances: 0,
        significantVariances: 0,
        favorableVariances: 0,
        unfavorableVariances: 0,
        totalVarianceAmount: 0,
        averageVariancePercentage: 0,
        topVariancesByAmount: [],
        topVariancesByPercentage: []
      },
      variancesBySupplier: [],
      variancesByProduct: [],
      variancesByCategory: [],
      trends: []
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `pv_${timestamp}_${random}`;
  }
}

// Export singleton instance
export const priceVarianceService = new PriceVarianceService();