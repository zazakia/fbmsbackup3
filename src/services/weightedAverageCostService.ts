import { Product, PurchaseOrderItem } from '../types/business';
import { supabase } from '../utils/supabase';

export interface CostCalculationInput {
  productId: string;
  currentStock: number;
  currentCost: number;
  incomingQuantity: number;
  incomingCost: number;
  referenceId?: string;
  referenceType?: 'purchase_order' | 'adjustment' | 'transfer';
}

export interface WeightedAverageCostResult {
  productId: string;
  currentStock: number;
  currentCost: number;
  currentTotalValue: number;
  incomingQuantity: number;
  incomingCost: number;
  incomingTotalValue: number;
  newStock: number;
  newWeightedAverageCost: number;
  newTotalValue: number;
  costVariance: number;
  costVariancePercentage: number;
  significantVariance: boolean;
}

export interface PriceVarianceRecord {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  referenceId: string;
  referenceType: string;
  expectedCost: number;
  actualCost: number;
  variance: number;
  variancePercentage: number;
  quantity: number;
  totalVarianceAmount: number;
  detectedAt: Date;
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
}

export interface InventoryValueAdjustment {
  productId: string;
  oldCost: number;
  newCost: number;
  stockQuantity: number;
  oldTotalValue: number;
  newTotalValue: number;
  adjustmentAmount: number;
  adjustmentType: 'increase' | 'decrease';
  glAccountDebit?: string;
  glAccountCredit?: string;
}

export interface CostUpdateTransaction {
  id: string;
  batchId: string;
  products: Array<{
    productId: string;
    oldCost: number;
    newCost: number;
    stockQuantity: number;
    valueAdjustment: number;
  }>;
  totalValueAdjustment: number;
  referenceId: string;
  referenceType: string;
  processedBy: string;
  processedAt: Date;
  status: 'pending' | 'completed' | 'failed' | 'rolled_back';
}

/**
 * Comprehensive weighted average cost calculation service that handles:
 * 1. Weighted average cost updates when goods are received
 * 2. Price variance detection and recording
 * 3. Inventory value adjustments for general ledger integration
 * 4. Audit trails for all cost changes
 */
export class WeightedAverageCostService {
  private readonly SIGNIFICANT_VARIANCE_THRESHOLD = 10; // 10% threshold for significant variance
  private readonly MINIMUM_STOCK_FOR_COSTING = 0.001; // Minimum stock to avoid division by zero

  /**
   * Calculate weighted average cost for a single product
   */
  calculateWeightedAverageCost(input: CostCalculationInput): WeightedAverageCostResult {
    const {
      productId,
      currentStock,
      currentCost,
      incomingQuantity,
      incomingCost
    } = input;

    // Handle edge cases
    if (currentStock < 0 || incomingQuantity <= 0) {
      throw new Error('Invalid stock quantities for weighted average cost calculation');
    }

    if (currentCost < 0 || incomingCost < 0) {
      throw new Error('Invalid cost values for weighted average cost calculation');
    }

    const currentTotalValue = currentStock * currentCost;
    const incomingTotalValue = incomingQuantity * incomingCost;
    const newStock = currentStock + incomingQuantity;
    const newTotalValue = currentTotalValue + incomingTotalValue;

    // Calculate new weighted average cost
    const newWeightedAverageCost = newStock > this.MINIMUM_STOCK_FOR_COSTING 
      ? newTotalValue / newStock 
      : incomingCost; // If no existing stock, use incoming cost

    // Calculate variance metrics
    const costVariance = newWeightedAverageCost - currentCost;
    const costVariancePercentage = currentCost > 0 
      ? (costVariance / currentCost) * 100 
      : 0;

    const significantVariance = Math.abs(costVariancePercentage) > this.SIGNIFICANT_VARIANCE_THRESHOLD;

    return {
      productId,
      currentStock,
      currentCost,
      currentTotalValue,
      incomingQuantity,
      incomingCost,
      incomingTotalValue,
      newStock,
      newWeightedAverageCost: Number(newWeightedAverageCost.toFixed(4)),
      newTotalValue,
      costVariance: Number(costVariance.toFixed(4)),
      costVariancePercentage: Number(costVariancePercentage.toFixed(2)),
      significantVariance
    };
  }

  /**
   * Process multiple products for weighted average cost updates
   */
  async calculateBatchWeightedAverageCosts(
    products: Array<{
      productId: string;
      incomingQuantity: number;
      incomingCost: number;
      referenceId?: string;
      referenceType?: string;
    }>
  ): Promise<WeightedAverageCostResult[]> {
    const results: WeightedAverageCostResult[] = [];

    for (const productInput of products) {
      try {
        // Get current product cost and stock
        const currentProduct = await this.getCurrentProductCostData(productInput.productId);
        
        if (!currentProduct) {
          throw new Error(`Product ${productInput.productId} not found`);
        }

        const result = this.calculateWeightedAverageCost({
          productId: productInput.productId,
          currentStock: currentProduct.stock,
          currentCost: currentProduct.cost,
          incomingQuantity: productInput.incomingQuantity,
          incomingCost: productInput.incomingCost,
          referenceId: productInput.referenceId,
          referenceType: productInput.referenceType
        });

        results.push(result);

      } catch (error) {
        console.error(`Error calculating weighted average cost for product ${productInput.productId}:`, error);
        // Continue processing other products even if one fails
      }
    }

    return results;
  }

  /**
   * Update product costs in the database based on weighted average calculations
   */
  async updateProductCosts(
    costResults: WeightedAverageCostResult[],
    referenceId: string,
    referenceType: string,
    processedBy: string
  ): Promise<CostUpdateTransaction> {
    const batchId = this.generateBatchId();
    const transaction: CostUpdateTransaction = {
      id: this.generateId(),
      batchId,
      products: [],
      totalValueAdjustment: 0,
      referenceId,
      referenceType,
      processedBy,
      processedAt: new Date(),
      status: 'pending'
    };

    try {
      // Begin database transaction
      const { data, error: rpcError } = await supabase.rpc('update_product_costs_batch', {
        cost_updates: costResults.map(result => ({
          product_id: result.productId,
          old_cost: result.currentCost,
          new_cost: result.newWeightedAverageCost,
          stock_quantity: result.newStock,
          value_adjustment: result.newTotalValue - result.currentTotalValue,
          reference_id: referenceId,
          reference_type: referenceType,
          processed_by: processedBy
        })),
        batch_id: batchId
      });

      if (rpcError) {
        throw new Error(`Failed to update product costs: ${rpcError.message}`);
      }

      // Update transaction record
      transaction.products = costResults.map(result => ({
        productId: result.productId,
        oldCost: result.currentCost,
        newCost: result.newWeightedAverageCost,
        stockQuantity: result.newStock,
        valueAdjustment: result.newTotalValue - result.currentTotalValue
      }));

      transaction.totalValueAdjustment = costResults.reduce(
        (sum, result) => sum + (result.newTotalValue - result.currentTotalValue), 
        0
      );
      
      transaction.status = 'completed';

      // Record the transaction
      await this.recordCostUpdateTransaction(transaction);

      return transaction;

    } catch (error) {
      transaction.status = 'failed';
      await this.recordCostUpdateTransaction(transaction);
      throw error;
    }
  }

  /**
   * Detect and record price variances
   */
  async detectPriceVariances(
    purchaseOrderItems: PurchaseOrderItem[],
    actualReceipts: Array<{ productId: string; actualCost: number; receivedQuantity: number }>,
    referenceId: string
  ): Promise<PriceVarianceRecord[]> {
    const variances: PriceVarianceRecord[] = [];

    for (const receipt of actualReceipts) {
      const poItem = purchaseOrderItems.find(item => item.productId === receipt.productId);
      
      if (!poItem) continue;

      const expectedCost = poItem.cost;
      const actualCost = receipt.actualCost;
      const variance = actualCost - expectedCost;
      const variancePercentage = expectedCost > 0 ? (variance / expectedCost) * 100 : 0;
      const totalVarianceAmount = variance * receipt.receivedQuantity;

      // Only record significant variances
      if (Math.abs(variancePercentage) > 5) { // 5% threshold for recording variances
        const varianceRecord: PriceVarianceRecord = {
          id: this.generateId(),
          productId: receipt.productId,
          productName: poItem.productName,
          productSku: poItem.productSku,
          referenceId,
          referenceType: 'purchase_order',
          expectedCost,
          actualCost,
          variance: Number(variance.toFixed(4)),
          variancePercentage: Number(variancePercentage.toFixed(2)),
          quantity: receipt.receivedQuantity,
          totalVarianceAmount: Number(totalVarianceAmount.toFixed(2)),
          detectedAt: new Date(),
          status: 'pending'
        };

        variances.push(varianceRecord);
      }
    }

    // Save variance records to database
    if (variances.length > 0) {
      await this.savePriceVariances(variances);
    }

    return variances;
  }

  /**
   * Generate inventory value adjustments for general ledger integration
   */
  generateInventoryValueAdjustments(costResults: WeightedAverageCostResult[]): InventoryValueAdjustment[] {
    return costResults.map(result => {
      const adjustmentAmount = result.newTotalValue - result.currentTotalValue;
      const adjustmentType: 'increase' | 'decrease' = adjustmentAmount >= 0 ? 'increase' : 'decrease';

      return {
        productId: result.productId,
        oldCost: result.currentCost,
        newCost: result.newWeightedAverageCost,
        stockQuantity: result.newStock,
        oldTotalValue: result.currentTotalValue,
        newTotalValue: result.newTotalValue,
        adjustmentAmount: Number(Math.abs(adjustmentAmount).toFixed(2)),
        adjustmentType,
        // Default GL accounts - should be configurable in production
        glAccountDebit: adjustmentType === 'increase' ? '1200' : '5000', // Inventory or COGS
        glAccountCredit: adjustmentType === 'increase' ? '2000' : '1200'  // Accounts Payable or Inventory
      };
    });
  }

  /**
   * Process complete purchase order receipt with cost updates
   */
  async processPurchaseOrderCostUpdates(
    purchaseOrderId: string,
    purchaseOrderItems: PurchaseOrderItem[],
    receipts: Array<{ 
      productId: string; 
      receivedQuantity: number; 
      actualCost: number; 
      batchNumber?: string;
    }>,
    processedBy: string
  ): Promise<{
    costCalculations: WeightedAverageCostResult[];
    priceVariances: PriceVarianceRecord[];
    valueAdjustments: InventoryValueAdjustment[];
    transaction: CostUpdateTransaction;
  }> {
    try {
      // 1. Calculate weighted average costs
      const costInputs = receipts.map(receipt => ({
        productId: receipt.productId,
        incomingQuantity: receipt.receivedQuantity,
        incomingCost: receipt.actualCost,
        referenceId: purchaseOrderId,
        referenceType: 'purchase_order' as const
      }));

      const costCalculations = await this.calculateBatchWeightedAverageCosts(costInputs);

      // 2. Detect price variances
      const priceVariances = await this.detectPriceVariances(
        purchaseOrderItems,
        receipts.map(r => ({ 
          productId: r.productId, 
          actualCost: r.actualCost, 
          receivedQuantity: r.receivedQuantity 
        })),
        purchaseOrderId
      );

      // 3. Update product costs
      const transaction = await this.updateProductCosts(
        costCalculations,
        purchaseOrderId,
        'purchase_order',
        processedBy
      );

      // 4. Generate GL adjustments
      const valueAdjustments = this.generateInventoryValueAdjustments(costCalculations);

      return {
        costCalculations,
        priceVariances,
        valueAdjustments,
        transaction
      };

    } catch (error) {
      console.error('Error processing purchase order cost updates:', error);
      throw new Error(`Failed to process cost updates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current product cost data from database
   */
  private async getCurrentProductCostData(productId: string): Promise<{ cost: number; stock: number } | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('cost, stock')
        .eq('id', productId)
        .single();

      if (error || !data) {
        console.warn(`Could not get cost data for product ${productId}:`, error);
        return null;
      }

      return {
        cost: data.cost || 0,
        stock: data.stock || 0
      };
    } catch (error) {
      console.error(`Error getting product cost data for ${productId}:`, error);
      return null;
    }
  }

  /**
   * Save price variance records to database
   */
  private async savePriceVariances(variances: PriceVarianceRecord[]): Promise<void> {
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
          status: variance.status
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
   * Record cost update transaction
   */
  private async recordCostUpdateTransaction(transaction: CostUpdateTransaction): Promise<void> {
    try {
      const { error } = await supabase
        .from('cost_update_transactions')
        .upsert({
          id: transaction.id,
          batch_id: transaction.batchId,
          products: JSON.stringify(transaction.products),
          total_value_adjustment: transaction.totalValueAdjustment,
          reference_id: transaction.referenceId,
          reference_type: transaction.referenceType,
          processed_by: transaction.processedBy,
          processed_at: transaction.processedAt.toISOString(),
          status: transaction.status
        });

      if (error) {
        throw new Error(`Failed to record cost update transaction: ${error.message}`);
      }
    } catch (error) {
      console.error('Error recording cost update transaction:', error);
      // Don't throw here as this is logging only
    }
  }

  /**
   * Generate unique batch ID
   */
  private generateBatchId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `batch_${timestamp}_${random}`;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `${timestamp}_${random}`;
  }
}

// Export singleton instance
export const weightedAverageCostService = new WeightedAverageCostService();