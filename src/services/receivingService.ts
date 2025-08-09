import {
  PurchaseOrder,
  PurchaseOrderItem,
  PartialReceiptItem,
  ReceivingRecord,
  ValidationError,
  ValidationErrorCode
} from '../types/business';
import { supabase } from '../utils/supabase';
import { PurchaseOrderStateMachine } from './purchaseOrderStateMachine';
import { updateStock } from '../api/products';
import { 
  weightedAverageCostService, 
  WeightedAverageCostResult,
  PriceVarianceRecord,
  CostUpdateTransaction 
} from './weightedAverageCostService';
import { 
  inventoryValueAdjustmentService, 
  InventoryValueAdjustment,
  InventoryValuationSummary 
} from './inventoryValueAdjustmentService';
import { priceVarianceService } from './priceVarianceService';

export interface ReceiptProcessingResult {
  success: boolean;
  receivingRecord?: ReceivingRecord;
  updatedPurchaseOrder?: PurchaseOrder;
  inventoryAdjustments?: InventoryAdjustment[];
  costCalculations?: WeightedAverageCostResult[];
  priceVariances?: PriceVarianceRecord[];
  valueAdjustments?: InventoryValueAdjustment[];
  costTransaction?: CostUpdateTransaction;
  valuationSummary?: InventoryValuationSummary;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

export interface InventoryAdjustment {
  productId: string;
  productName: string;
  productSku: string;
  quantityChange: number;
  unitCost: number;
  totalCost: number;
  movementType: 'purchase_receipt';
  referenceId: string;
  batchNumber?: string;
  expiryDate?: Date;
  previousStock: number;
  newStock: number;
}

export interface ReceiptValidationOptions {
  allowOverReceiving?: boolean;
  tolerancePercentage?: number;
  requireBatchTracking?: boolean;
  requireExpiryDates?: boolean;
}

export interface WeightedAverageCostCalculation {
  productId: string;
  currentStock: number;
  currentCost: number;
  currentValue: number;
  incomingQuantity: number;
  incomingCost: number;
  incomingValue: number;
  newStock: number;
  newWeightedAverageCost: number;
  newTotalValue: number;
  costVariance: number;
  costVariancePercentage: number;
}

export class ReceivingService {
  private stateMachine: PurchaseOrderStateMachine;
  private defaultOptions: ReceiptValidationOptions = {
    allowOverReceiving: false,
    tolerancePercentage: 5.0, // 5% tolerance for over-receiving
    requireBatchTracking: false,
    requireExpiryDates: false
  };

  constructor() {
    this.stateMachine = new PurchaseOrderStateMachine();
  }

  /**
   * Process goods receipt against a purchase order with comprehensive validation
   * and inventory adjustments
   */
  async processReceipt(
    purchaseOrderId: string,
    receipts: PartialReceiptItem[],
    receivedBy: string,
    receivedByName?: string,
    notes?: string,
    options: ReceiptValidationOptions = {}
  ): Promise<ReceiptProcessingResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    
    try {
      // 1. Load and validate purchase order
      const { data: purchaseOrder, error: loadError } = await this.loadPurchaseOrder(purchaseOrderId);
      if (loadError || !purchaseOrder) {
        errors.push({
          id: this.generateErrorId(),
          field: 'purchaseOrderId',
          message: 'Purchase order not found or could not be loaded',
          severity: 'error',
          code: ValidationErrorCode.REQUIRED_FIELD_MISSING,
          metadata: { purchaseOrderId, error: loadError?.message }
        });
        return { success: false, errors, warnings };
      }

      // 2. Validate receipt data
      const validationResult = this.validateReceipt(purchaseOrder, receipts, { ...this.defaultOptions, ...options });
      if (!validationResult.isValid) {
        return { success: false, errors: validationResult.errors, warnings: validationResult.warnings };
      }

      // 3. Check for duplicate receipts
      const duplicateCheck = await this.checkForDuplicateReceipts(purchaseOrderId, receipts);
      if (duplicateCheck.hasDuplicates) {
        errors.push(...duplicateCheck.errors);
        return { success: false, errors, warnings };
      }

      // 4. Calculate inventory adjustments with weighted average costing
      const inventoryAdjustments = await this.calculateInventoryAdjustments(purchaseOrder, receipts);
      
      // 5. Process weighted average cost calculations and price variances
      const costProcessingResult = await this.processCostCalculations(
        purchaseOrder,
        receipts,
        receivedBy
      );

      if (costProcessingResult.errors.length > 0) {
        errors.push(...costProcessingResult.errors);
      }
      
      warnings.push(...(costProcessingResult.warnings || []));
      
      // 6. Validate stock movements
      const stockValidation = await this.validateStockMovements(inventoryAdjustments);
      if (!stockValidation.isValid) {
        errors.push(...stockValidation.errors);
        warnings.push(...stockValidation.warnings);
      }

      // 7. Begin transaction for atomic operations
      const transactionResult = await this.executeReceivingTransaction({
        purchaseOrder,
        receipts,
        inventoryAdjustments,
        receivedBy,
        receivedByName,
        notes
      });

      if (!transactionResult.success) {
        return { 
          success: false, 
          errors: transactionResult.errors, 
          warnings: [...warnings, ...(transactionResult.warnings || [])] 
        };
      }

      return {
        success: true,
        receivingRecord: transactionResult.receivingRecord,
        updatedPurchaseOrder: transactionResult.updatedPurchaseOrder,
        inventoryAdjustments,
        costCalculations: costProcessingResult.costCalculations,
        priceVariances: costProcessingResult.priceVariances,
        valueAdjustments: costProcessingResult.valueAdjustments,
        costTransaction: costProcessingResult.costTransaction,
        valuationSummary: costProcessingResult.valuationSummary,
        errors: [],
        warnings
      };

    } catch (error) {
      errors.push({
        id: this.generateErrorId(),
        field: 'system',
        message: `Unexpected error during receipt processing: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        code: ValidationErrorCode.INVALID_FORMAT,
        metadata: { error: error instanceof Error ? error.stack : error }
      });

      return { success: false, errors, warnings };
    }
  }

  /**
   * Validate receipt items against purchase order with comprehensive business rules
   */
  validateReceipt(
    purchaseOrder: PurchaseOrder,
    receipts: PartialReceiptItem[],
    options: ReceiptValidationOptions = {}
  ): { isValid: boolean; errors: ValidationError[]; warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const opts = { ...this.defaultOptions, ...options };

    // Basic validation
    if (!receipts || receipts.length === 0) {
      errors.push({
        id: this.generateErrorId(),
        field: 'receipts',
        message: 'At least one receipt item is required',
        severity: 'error',
        code: ValidationErrorCode.REQUIRED_FIELD_MISSING
      });
      return { isValid: false, errors, warnings };
    }

    // Validate purchase order status
    const currentStatus = this.stateMachine.mapLegacyToEnhancedStatus(purchaseOrder.status);
    if (!['approved', 'sent_to_supplier', 'partially_received'].includes(currentStatus)) {
      errors.push({
        id: this.generateErrorId(),
        field: 'status',
        message: `Purchase order must be approved, sent to supplier, or partially received to accept receipts. Current status: ${currentStatus}`,
        severity: 'error',
        code: ValidationErrorCode.INVALID_STATUS_TRANSITION
      });
    }

    // Create lookup map for PO items
    const poItemsMap = new Map<string, PurchaseOrderItem>(
      purchaseOrder.items.map(item => [item.productId, item])
    );

    // Validate each receipt item
    receipts.forEach((receipt, index) => {
      this.validateReceiptItem(receipt, index, poItemsMap, opts, errors, warnings);
    });

    // Check for over-receiving at PO level
    this.validateOverReceiving(purchaseOrder, receipts, opts, errors, warnings);

    // Validate business rules
    this.validateBusinessRules(purchaseOrder, receipts, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Calculate inventory adjustments for weighted average costing
   */
  async calculateInventoryAdjustments(
    purchaseOrder: PurchaseOrder,
    receipts: PartialReceiptItem[]
  ): Promise<InventoryAdjustment[]> {
    const adjustments: InventoryAdjustment[] = [];

    for (const receipt of receipts) {
      if (receipt.receivedQuantity <= 0) continue;

      // Get current product stock
      const currentStock = await this.getCurrentProductStock(receipt.productId);
      
      const adjustment: InventoryAdjustment = {
        productId: receipt.productId,
        productName: receipt.productName,
        productSku: receipt.productSku,
        quantityChange: receipt.receivedQuantity,
        unitCost: receipt.unitCost,
        totalCost: receipt.totalCost,
        movementType: 'purchase_receipt',
        referenceId: purchaseOrder.id,
        batchNumber: receipt.batchNumber,
        expiryDate: receipt.expiryDate,
        previousStock: currentStock,
        newStock: currentStock + receipt.receivedQuantity
      };

      adjustments.push(adjustment);
    }

    return adjustments;
  }

  /**
   * Process comprehensive cost calculations including weighted average costing,
   * price variance detection, and general ledger adjustments
   */
  async processCostCalculations(
    purchaseOrder: PurchaseOrder,
    receipts: PartialReceiptItem[],
    processedBy: string
  ): Promise<{
    costCalculations: WeightedAverageCostResult[];
    priceVariances: PriceVarianceRecord[];
    valueAdjustments: InventoryValueAdjustment[];
    costTransaction?: CostUpdateTransaction;
    valuationSummary?: InventoryValuationSummary;
    errors: ValidationError[];
    warnings: ValidationError[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      // 1. Process weighted average cost calculations and updates
      const costResult = await weightedAverageCostService.processPurchaseOrderCostUpdates(
        purchaseOrder.id,
        purchaseOrder.items,
        receipts.map(r => ({
          productId: r.productId,
          receivedQuantity: r.receivedQuantity,
          actualCost: r.unitCost,
          batchNumber: r.batchNumber
        })),
        processedBy
      );

      // 2. Process general ledger adjustments
      let valuationSummary: InventoryValuationSummary | undefined;
      
      if (costResult.valueAdjustments.length > 0) {
        const glResult = await inventoryValueAdjustmentService.processInventoryValueAdjustments(
          costResult.valueAdjustments,
          purchaseOrder.id,
          'purchase_order',
          `Inventory cost adjustments from PO ${purchaseOrder.orderNumber || purchaseOrder.id}`,
          processedBy
        );
        
        valuationSummary = glResult.summary;
      }

      // 3. Log any cost-related warnings
      if (costResult.priceVariances.length > 0) {
        const significantVariances = costResult.priceVariances.filter(v => 
          Math.abs(v.variancePercentage) > 10
        );
        
        if (significantVariances.length > 0) {
          warnings.push({
            id: this.generateErrorId(),
            field: 'priceVariances',
            message: `${significantVariances.length} significant price variances detected (>10%). Review recommended.`,
            severity: 'warning',
            code: ValidationErrorCode.COST_VARIANCE_HIGH,
            metadata: { 
              variances: significantVariances.map(v => ({
                productId: v.productId,
                variancePercentage: v.variancePercentage,
                totalVarianceAmount: v.totalVarianceAmount
              }))
            }
          });
        }
      }

      return {
        costCalculations: costResult.costCalculations,
        priceVariances: costResult.priceVariances,
        valueAdjustments: costResult.valueAdjustments,
        costTransaction: costResult.transaction,
        valuationSummary,
        errors,
        warnings
      };

    } catch (error) {
      errors.push({
        id: this.generateErrorId(),
        field: 'costProcessing',
        message: `Error processing cost calculations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        code: ValidationErrorCode.INVALID_FORMAT,
        metadata: { error: error instanceof Error ? error.stack : error }
      });

      return {
        costCalculations: [],
        priceVariances: [],
        valueAdjustments: [],
        errors,
        warnings
      };
    }
  }

  /**
   * Calculate weighted average cost for a product
   * @deprecated Use weightedAverageCostService.calculateWeightedAverageCost instead
   */
  calculateWeightedAverageCost(
    currentStock: number,
    currentCost: number,
    incomingQuantity: number,
    incomingCost: number
  ): WeightedAverageCostCalculation {
    const currentValue = currentStock * currentCost;
    const incomingValue = incomingQuantity * incomingCost;
    const newStock = currentStock + incomingQuantity;
    const newTotalValue = currentValue + incomingValue;
    const newWeightedAverageCost = newStock > 0 ? newTotalValue / newStock : 0;
    const costVariance = newWeightedAverageCost - currentCost;
    const costVariancePercentage = currentCost > 0 ? (costVariance / currentCost) * 100 : 0;

    return {
      productId: '',
      currentStock,
      currentCost,
      currentValue,
      incomingQuantity,
      incomingCost,
      incomingValue,
      newStock,
      newWeightedAverageCost,
      newTotalValue,
      costVariance,
      costVariancePercentage
    };
  }

  /**
   * Apply inventory adjustments to the database
   */
  async applyInventoryAdjustments(adjustments: InventoryAdjustment[]): Promise<void> {
    for (const adjustment of adjustments) {
      const result = await updateStock(
        adjustment.productId,
        adjustment.quantityChange,
        'add',
        {
          referenceId: adjustment.referenceId,
          reason: 'Purchase Order Receipt',
          userId: 'system' // This should come from context
        }
      );

      if (result && 'error' in result && result.error) {
        throw new Error(`Failed to update stock for product ${adjustment.productId}: ${result.error.message}`);
      }
    }
  }

  /**
   * Check for duplicate receipts to prevent double processing
   */
  private async checkForDuplicateReceipts(
    purchaseOrderId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _receipts: PartialReceiptItem[]
  ): Promise<{ hasDuplicates: boolean; errors: ValidationError[] }> {
    const errors: ValidationError[] = [];

    try {
      // Query existing receiving records for this PO
      const { data: existingReceipts, error } = await supabase
        .from('receiving_records')
        .select('*')
        .eq('purchase_order_id', purchaseOrderId);

      if (error) {
        errors.push({
          id: this.generateErrorId(),
          field: 'database',
          message: 'Could not check for duplicate receipts',
          severity: 'error',
          code: ValidationErrorCode.INVALID_FORMAT,
          metadata: { error: error.message }
        });
        return { hasDuplicates: true, errors };
      }

      // Simple duplicate check - could be enhanced with more sophisticated logic
      const hasRecentDuplicates = existingReceipts?.some(existing => {
        const existingTime = new Date(existing.created_at).getTime();
        const now = Date.now();
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        
        return existingTime > fiveMinutesAgo;
      });

      if (hasRecentDuplicates) {
        errors.push({
          id: this.generateErrorId(),
          field: 'duplicate',
          message: 'Recent receipt found for this purchase order. Please wait before submitting another receipt.',
          severity: 'error',
          code: ValidationErrorCode.DUPLICATE_RECEIPT_DETECTED
        });
      }

      return { hasDuplicates: hasRecentDuplicates || false, errors };

    } catch (error) {
      errors.push({
        id: this.generateErrorId(),
        field: 'system',
        message: 'Error checking for duplicate receipts',
        severity: 'error',
        code: ValidationErrorCode.INVALID_FORMAT,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      return { hasDuplicates: true, errors };
    }
  }

  /**
   * Load purchase order with error handling
   */
  private async loadPurchaseOrder(purchaseOrderId: string): Promise<{ data: PurchaseOrder | null; error: Error | null }> {
    try {
      const { getPurchaseOrder } = await import('../api/purchases');
      return await getPurchaseOrder(purchaseOrderId);
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Failed to load purchase order') 
      };
    }
  }

  /**
   * Get current stock for a product
   */
  private async getCurrentProductStock(productId: string): Promise<number> {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select('stock')
        .eq('id', productId)
        .single();

      if (error) {
        console.warn(`Could not get current stock for product ${productId}:`, error);
        return 0;
      }

      return product?.stock || 0;
    } catch (error) {
      console.warn(`Error getting current stock for product ${productId}:`, error);
      return 0;
    }
  }

  /**
   * Validate individual receipt item
   */
  private validateReceiptItem(
    receipt: PartialReceiptItem,
    index: number,
    poItemsMap: Map<string, PurchaseOrderItem>,
    options: ReceiptValidationOptions,
    errors: ValidationError[],
    warnings: ValidationError[]
  ): void {
    const fieldPrefix = `receipts[${index}]`;
    
    // Required fields
    if (!receipt.productId) {
      errors.push({
        id: this.generateErrorId(),
        field: `${fieldPrefix}.productId`,
        message: 'Product ID is required',
        severity: 'error',
        code: ValidationErrorCode.REQUIRED_FIELD_MISSING
      });
      return;
    }

    if (!receipt.receivedQuantity || receipt.receivedQuantity <= 0) {
      errors.push({
        id: this.generateErrorId(),
        field: `${fieldPrefix}.receivedQuantity`,
        message: 'Received quantity must be greater than zero',
        severity: 'error',
        code: ValidationErrorCode.QUANTITY_ZERO
      });
    }

    if (!receipt.unitCost || receipt.unitCost < 0) {
      errors.push({
        id: this.generateErrorId(),
        field: `${fieldPrefix}.unitCost`,
        message: 'Unit cost must be greater than or equal to zero',
        severity: 'error',
        code: ValidationErrorCode.NEGATIVE_COST
      });
    }

    // Check if product exists in PO
    const poItem = poItemsMap.get(receipt.productId);
    if (!poItem) {
      errors.push({
        id: this.generateErrorId(),
        field: `${fieldPrefix}.productId`,
        message: `Product ${receipt.productId} is not in the original purchase order`,
        severity: 'error',
        code: ValidationErrorCode.PRODUCT_NOT_FOUND
      });
      return;
    }

    // Check quantity limits
    const totalReceived = receipt.totalReceived || receipt.receivedQuantity;
    const orderedQuantity = poItem.quantity;
    
    if (totalReceived > orderedQuantity) {
      if (options.allowOverReceiving) {
        const tolerance = options.tolerancePercentage || 0;
        const toleranceAmount = orderedQuantity * (tolerance / 100);
        
        if (totalReceived > orderedQuantity + toleranceAmount) {
          errors.push({
            id: this.generateErrorId(),
            field: `${fieldPrefix}.receivedQuantity`,
            message: `Received quantity ${totalReceived} exceeds ordered quantity ${orderedQuantity} plus tolerance ${tolerance}%`,
            severity: 'error',
            code: ValidationErrorCode.QUANTITY_EXCEEDS_ORDERED
          });
        } else {
          warnings.push({
            id: this.generateErrorId(),
            field: `${fieldPrefix}.receivedQuantity`,
            message: `Received quantity ${totalReceived} exceeds ordered quantity ${orderedQuantity} but is within tolerance`,
            severity: 'warning',
            code: ValidationErrorCode.QUANTITY_EXCEEDS_ORDERED
          });
        }
      } else {
        errors.push({
          id: this.generateErrorId(),
          field: `${fieldPrefix}.receivedQuantity`,
          message: `Received quantity ${totalReceived} exceeds ordered quantity ${orderedQuantity}`,
          severity: 'error',
          code: ValidationErrorCode.QUANTITY_EXCEEDS_ORDERED
        });
      }
    }

    // Cost variance validation
    const expectedCost = poItem.cost;
    const actualCost = receipt.unitCost;
    const costVariancePercentage = Math.abs((actualCost - expectedCost) / expectedCost) * 100;
    
    if (costVariancePercentage > 10) {
      warnings.push({
        id: this.generateErrorId(),
        field: `${fieldPrefix}.unitCost`,
        message: `Unit cost variance of ${costVariancePercentage.toFixed(1)}% detected. Expected: ${expectedCost}, Actual: ${actualCost}`,
        severity: 'warning',
        code: ValidationErrorCode.COST_VARIANCE_HIGH
      });
    }

    // Batch and expiry validation
    if (options.requireBatchTracking && !receipt.batchNumber) {
      errors.push({
        id: this.generateErrorId(),
        field: `${fieldPrefix}.batchNumber`,
        message: 'Batch number is required for this product',
        severity: 'error',
        code: ValidationErrorCode.REQUIRED_FIELD_MISSING
      });
    }

    if (options.requireExpiryDates && !receipt.expiryDate) {
      errors.push({
        id: this.generateErrorId(),
        field: `${fieldPrefix}.expiryDate`,
        message: 'Expiry date is required for this product',
        severity: 'error',
        code: ValidationErrorCode.REQUIRED_FIELD_MISSING
      });
    }
  }

  /**
   * Validate over-receiving at purchase order level
   */
  private validateOverReceiving(
    purchaseOrder: PurchaseOrder,
    receipts: PartialReceiptItem[],
    options: ReceiptValidationOptions,
    errors: ValidationError[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _warnings: ValidationError[]
  ): void {
    const receiptMap = new Map(receipts.map(r => [r.productId, r]));
    
    purchaseOrder.items.forEach(poItem => {
      const receipt = receiptMap.get(poItem.productId);
      if (!receipt) return;

      const extendedPoItem = poItem as PurchaseOrderItem & { receivedQuantity?: number };
      const currentlyReceived = extendedPoItem.receivedQuantity || 0;
      const newlyReceived = receipt.receivedQuantity;
      const totalReceived = currentlyReceived + newlyReceived;
      
      if (totalReceived > poItem.quantity && !options.allowOverReceiving) {
        errors.push({
          id: this.generateErrorId(),
          field: 'overReceiving',
          message: `Total received quantity ${totalReceived} for product ${poItem.productName} exceeds ordered quantity ${poItem.quantity}`,
          severity: 'error',
          code: ValidationErrorCode.QUANTITY_EXCEEDS_ORDERED,
          metadata: { 
            productId: poItem.productId,
            productName: poItem.productName,
            orderedQuantity: poItem.quantity,
            totalReceived
          }
        });
      }
    });
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(
    purchaseOrder: PurchaseOrder,
    receipts: PartialReceiptItem[],
    errors: ValidationError[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _warnings: ValidationError[]
  ): void {
    // Check if PO is already fully received
    const isFullyReceived = purchaseOrder.items.every(item => {
      const extendedItem = item as PurchaseOrderItem & { receivedQuantity?: number };
      const currentReceived = extendedItem.receivedQuantity || 0;
      return currentReceived >= item.quantity;
    });

    if (isFullyReceived) {
      errors.push({
        id: this.generateErrorId(),
        field: 'status',
        message: 'Purchase order is already fully received',
        severity: 'error',
        code: ValidationErrorCode.ALREADY_FULLY_RECEIVED
      });
    }

    // Validate condition codes
    receipts.forEach((receipt, index) => {
      if (receipt.condition && !['good', 'damaged', 'expired', 'returned'].includes(receipt.condition)) {
        errors.push({
          id: this.generateErrorId(),
          field: `receipts[${index}].condition`,
          message: `Invalid condition code: ${receipt.condition}`,
          severity: 'error',
          code: ValidationErrorCode.INVALID_FORMAT
        });
      }
    });
  }

  /**
   * Validate stock movements before applying them
   */
  private async validateStockMovements(
    adjustments: InventoryAdjustment[]
  ): Promise<{ isValid: boolean; errors: ValidationError[]; warnings: ValidationError[] }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    for (const adjustment of adjustments) {
      // Check if product exists and is active
      try {
        const { data: product, error } = await supabase
          .from('products')
          .select('id, name, is_active, stock')
          .eq('id', adjustment.productId)
          .single();

        if (error || !product) {
          errors.push({
            id: this.generateErrorId(),
            field: 'productId',
            message: `Product ${adjustment.productId} not found`,
            severity: 'error',
            code: ValidationErrorCode.PRODUCT_NOT_FOUND,
            metadata: { productId: adjustment.productId }
          });
          continue;
        }

        if (!product.is_active) {
          warnings.push({
            id: this.generateErrorId(),
            field: 'productActive',
            message: `Product ${product.name} is inactive`,
            severity: 'warning',
            code: ValidationErrorCode.PRODUCT_INACTIVE,
            metadata: { productId: adjustment.productId, productName: product.name }
          });
        }

        // Validate stock calculation matches
        if (Math.abs(product.stock - adjustment.previousStock) > 0.01) {
          warnings.push({
            id: this.generateErrorId(),
            field: 'stockMismatch',
            message: `Stock mismatch for product ${product.name}. Expected: ${adjustment.previousStock}, Actual: ${product.stock}`,
            severity: 'warning',
            code: ValidationErrorCode.INVALID_FORMAT,
            metadata: { 
              productId: adjustment.productId, 
              expectedStock: adjustment.previousStock,
              actualStock: product.stock
            }
          });
        }

      } catch (error) {
        errors.push({
          id: this.generateErrorId(),
          field: 'database',
          message: `Error validating product ${adjustment.productId}`,
          severity: 'error',
          code: ValidationErrorCode.INVALID_FORMAT,
          metadata: { productId: adjustment.productId, error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Execute the complete receiving transaction atomically
   */
  private async executeReceivingTransaction(params: {
    purchaseOrder: PurchaseOrder;
    receipts: PartialReceiptItem[];
    inventoryAdjustments: InventoryAdjustment[];
    receivedBy: string;
    receivedByName?: string;
    notes?: string;
  }): Promise<{
    success: boolean;
    receivingRecord?: ReceivingRecord;
    updatedPurchaseOrder?: PurchaseOrder;
    errors: ValidationError[];
    warnings?: ValidationError[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    try {
      // Begin Supabase transaction (using RPC for atomic operations)
      const { error: transactionError } = await supabase.rpc(
        'process_purchase_order_receipt',
        {
          po_id: params.purchaseOrder.id,
          receipt_items: params.receipts,
          received_by: params.receivedBy,
          received_by_name: params.receivedByName || params.receivedBy,
          notes: params.notes || null
        }
      );

      if (transactionError) {
        errors.push({
          id: this.generateErrorId(),
          field: 'transaction',
          message: `Transaction failed: ${transactionError.message}`,
          severity: 'error',
          code: ValidationErrorCode.INVALID_FORMAT,
          metadata: { error: transactionError }
        });
        return { success: false, errors, warnings };
      }

      // Apply inventory adjustments
      await this.applyInventoryAdjustments(params.inventoryAdjustments);

      // Create receiving record
      const receivingRecord: ReceivingRecord = {
        id: this.generateId(),
        receivedDate: new Date(),
        receivedBy: params.receivedBy,
        receivedByName: params.receivedByName,
        items: params.receipts,
        notes: params.notes,
        totalItems: params.receipts.length,
        totalQuantity: params.receipts.reduce((sum, item) => sum + item.receivedQuantity, 0),
        totalValue: params.receipts.reduce((sum, item) => sum + item.totalCost, 0)
      };

      // Update purchase order status based on receipt
      const updatedStatus = this.determineUpdatedStatus(params.purchaseOrder, params.receipts);
      
      const updatedPurchaseOrder: PurchaseOrder = {
        ...params.purchaseOrder,
        status: updatedStatus,
        receivedDate: updatedStatus === 'received' ? new Date() : params.purchaseOrder.receivedDate
      };

      return {
        success: true,
        receivingRecord,
        updatedPurchaseOrder,
        errors: [],
        warnings
      };

    } catch (error) {
      errors.push({
        id: this.generateErrorId(),
        field: 'transaction',
        message: `Transaction execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
        code: ValidationErrorCode.INVALID_FORMAT,
        metadata: { error: error instanceof Error ? error.stack : error }
      });

      return { success: false, errors, warnings };
    }
  }

  /**
   * Determine updated purchase order status based on receipts
   */
  private determineUpdatedStatus(purchaseOrder: PurchaseOrder, receipts: PartialReceiptItem[]): string {
    const receiptMap = new Map(receipts.map(r => [r.productId, r]));
    
    const allItemsFullyReceived = purchaseOrder.items.every(item => {
      const extendedItem = item as PurchaseOrderItem & { receivedQuantity?: number };
      const currentReceived = extendedItem.receivedQuantity || 0;
      const newlyReceived = receiptMap.get(item.productId)?.receivedQuantity || 0;
      const totalReceived = currentReceived + newlyReceived;
      
      return totalReceived >= item.quantity;
    });

    return allItemsFullyReceived ? 'received' : 'partial';
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const receivingService = new ReceivingService();