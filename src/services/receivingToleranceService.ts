import {
  ReceivingToleranceSettings,
  ToleranceConfig,
  PartialReceivingConfig,
  QualityCheckConfig,
  ExpiryHandlingConfig,
  DamageHandlingConfig
} from '../types/purchaseOrderConfig';
import { purchaseOrderWorkflowConfigService } from './purchaseOrderWorkflowConfigService';
import { PurchaseOrder, PurchaseOrderItem } from '../types/business';
import { UserRole } from '../types/auth';

export interface ReceivingValidationResult {
  isValid: boolean;
  canProceed: boolean;
  requiresApproval: boolean;
  requiredRoles: UserRole[];
  errors: ReceivingValidationError[];
  warnings: ReceivingValidationWarning[];
  adjustments?: ReceivingAdjustment[];
}

export interface ReceivingValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning' | 'info';
  blockingError: boolean;
}

export interface ReceivingValidationWarning {
  code: string;
  message: string;
  field?: string;
  recommendation?: string;
}

export interface ReceivingAdjustment {
  type: 'quantity' | 'quality' | 'expiry' | 'damage';
  description: string;
  originalValue: any;
  adjustedValue: any;
  reason: string;
  requiresApproval: boolean;
}

export interface ReceiptItem {
  purchaseOrderItemId: string;
  productId: string;
  productName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  previouslyReceivedQuantity: number;
  condition: 'good' | 'damaged' | 'expired' | 'rejected';
  qualityStatus?: 'pending' | 'approved' | 'rejected';
  expiryDate?: Date;
  batchNumber?: string;
  damageReport?: DamageReport;
  notes?: string;
}

export interface DamageReport {
  id: string;
  category: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe';
  affectedQuantity: number;
  photographs?: string[];
  reportedBy: string;
  reportDate: Date;
  estimatedLoss?: number;
  supplierNotified: boolean;
}

export interface QualityCheckResult {
  id: string;
  itemId: string;
  status: 'passed' | 'failed' | 'conditional';
  checkedBy: string;
  checkDate: Date;
  criteria: QualityCheckCriterion[];
  overallScore: number;
  notes?: string;
  photographs?: string[];
}

export interface QualityCheckCriterion {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  score: number;
  notes?: string;
}

export interface ReceivingContext {
  purchaseOrder: PurchaseOrder;
  receivingUser: {
    userId: string;
    name: string;
    role: UserRole;
  };
  receiptDate: Date;
  isPartialReceipt: boolean;
  previousReceiptsCount: number;
  metadata?: Record<string, any>;
}

export class ReceivingToleranceService {
  constructor() {}

  /**
   * Validate receiving against configured tolerance settings
   */
  validateReceiving(
    receiptItems: ReceiptItem[],
    context: ReceivingContext
  ): ReceivingValidationResult {
    const settings = purchaseOrderWorkflowConfigService.getConfig().receivingSettings;
    const result: ReceivingValidationResult = {
      isValid: true,
      canProceed: true,
      requiresApproval: false,
      requiredRoles: [],
      errors: [],
      warnings: [],
      adjustments: []
    };

    // Validate each receipt item
    for (const item of receiptItems) {
      this.validateReceiptItem(item, context, settings, result);
    }

    // Validate partial receiving rules
    if (context.isPartialReceipt) {
      this.validatePartialReceiving(receiptItems, context, settings, result);
    }

    // Validate overall receiving constraints
    this.validateReceivingConstraints(receiptItems, context, settings, result);

    // Determine final validation status
    result.isValid = result.errors.filter(e => e.blockingError).length === 0;
    result.canProceed = result.isValid || result.requiresApproval;

    return result;
  }

  /**
   * Validate individual receipt item
   */
  private validateReceiptItem(
    item: ReceiptItem,
    context: ReceivingContext,
    settings: ReceivingToleranceSettings,
    result: ReceivingValidationResult
  ): void {
    const totalReceived = item.previouslyReceivedQuantity + item.receivedQuantity;
    const quantityVariance = totalReceived - item.orderedQuantity;
    const variancePercentage = Math.abs(quantityVariance / item.orderedQuantity) * 100;

    // Check over-receiving tolerance
    if (quantityVariance > 0) {
      this.validateOverReceiving(item, quantityVariance, variancePercentage, settings.overReceiving, result);
    }

    // Check under-receiving tolerance (only for final receipts)
    if (quantityVariance < 0 && !context.isPartialReceipt) {
      this.validateUnderReceiving(item, Math.abs(quantityVariance), variancePercentage, settings.underReceiving, result);
    }

    // Validate quality checks
    if (settings.qualityChecks.enabled) {
      this.validateQualityChecks(item, context, settings.qualityChecks, result);
    }

    // Validate expiry handling
    if (settings.expiryHandling.enabled && item.expiryDate) {
      this.validateExpiryHandling(item, settings.expiryHandling, result);
    }

    // Validate damage handling
    if (item.condition === 'damaged' && settings.damageHandling.enabled) {
      this.validateDamageHandling(item, settings.damageHandling, result);
    }
  }

  /**
   * Validate over-receiving tolerance
   */
  private validateOverReceiving(
    item: ReceiptItem,
    quantityVariance: number,
    variancePercentage: number,
    config: ToleranceConfig,
    result: ReceivingValidationResult
  ): void {
    if (!config.enabled) return;

    const toleranceValue = config.toleranceType === 'percentage' 
      ? (item.orderedQuantity * config.toleranceValue / 100)
      : config.toleranceValue;

    const warningThreshold = config.toleranceType === 'percentage'
      ? (item.orderedQuantity * config.warningThreshold / 100)
      : config.warningThreshold;

    const blockThreshold = config.blockThreshold !== undefined
      ? (config.toleranceType === 'percentage'
          ? (item.orderedQuantity * config.blockThreshold / 100)
          : config.blockThreshold)
      : null;

    if (blockThreshold !== null && quantityVariance > blockThreshold) {
      result.errors.push({
        code: 'OVER_RECEIVING_BLOCKED',
        message: `Over-receiving blocked: Received ${quantityVariance} units over ordered quantity for ${item.productName}`,
        field: `items.${item.purchaseOrderItemId}.receivedQuantity`,
        severity: 'error',
        blockingError: true
      });
    } else if (quantityVariance > toleranceValue) {
      if (config.requireApproval) {
        result.requiresApproval = true;
        result.requiredRoles = [...result.requiredRoles, ...config.approvalRoles];
        result.warnings.push({
          code: 'OVER_RECEIVING_APPROVAL_REQUIRED',
          message: `Over-receiving requires approval: ${quantityVariance} units over tolerance for ${item.productName}`,
          field: `items.${item.purchaseOrderItemId}.receivedQuantity`,
          recommendation: 'Obtain approval from authorized personnel before proceeding'
        });
      } else if (!config.autoAccept) {
        result.errors.push({
          code: 'OVER_RECEIVING_NOT_ALLOWED',
          message: `Over-receiving not allowed: ${quantityVariance} units over tolerance for ${item.productName}`,
          field: `items.${item.purchaseOrderItemId}.receivedQuantity`,
          severity: 'error',
          blockingError: true
        });
      }
    } else if (quantityVariance > warningThreshold) {
      result.warnings.push({
        code: 'OVER_RECEIVING_WARNING',
        message: `Over-receiving warning: ${quantityVariance} units over warning threshold for ${item.productName}`,
        field: `items.${item.purchaseOrderItemId}.receivedQuantity`,
        recommendation: 'Verify the received quantity is correct'
      });
    }

    if (config.notifyOnVariance && quantityVariance > warningThreshold) {
      // Add notification flag to metadata
      result.adjustments = result.adjustments || [];
      result.adjustments.push({
        type: 'quantity',
        description: 'Over-receiving variance detected',
        originalValue: item.orderedQuantity,
        adjustedValue: item.receivedQuantity,
        reason: `Received ${quantityVariance} units more than ordered`,
        requiresApproval: config.requireApproval
      });
    }
  }

  /**
   * Validate under-receiving tolerance
   */
  private validateUnderReceiving(
    item: ReceiptItem,
    quantityVariance: number,
    variancePercentage: number,
    config: ToleranceConfig,
    result: ReceivingValidationResult
  ): void {
    if (!config.enabled) return;

    const toleranceValue = config.toleranceType === 'percentage' 
      ? (item.orderedQuantity * config.toleranceValue / 100)
      : config.toleranceValue;

    const warningThreshold = config.toleranceType === 'percentage'
      ? (item.orderedQuantity * config.warningThreshold / 100)
      : config.warningThreshold;

    if (quantityVariance > toleranceValue) {
      if (config.requireApproval) {
        result.requiresApproval = true;
        result.requiredRoles = [...result.requiredRoles, ...config.approvalRoles];
        result.warnings.push({
          code: 'UNDER_RECEIVING_APPROVAL_REQUIRED',
          message: `Under-receiving requires approval: ${quantityVariance} units under tolerance for ${item.productName}`,
          field: `items.${item.purchaseOrderItemId}.receivedQuantity`,
          recommendation: 'Obtain approval to close order with shortage'
        });
      } else if (!config.autoAccept) {
        result.warnings.push({
          code: 'UNDER_RECEIVING_SIGNIFICANT',
          message: `Significant under-receiving: ${quantityVariance} units short for ${item.productName}`,
          field: `items.${item.purchaseOrderItemId}.receivedQuantity`,
          recommendation: 'Consider contacting supplier about shortage'
        });
      }
    } else if (quantityVariance > warningThreshold) {
      result.warnings.push({
        code: 'UNDER_RECEIVING_WARNING',
        message: `Under-receiving warning: ${quantityVariance} units under warning threshold for ${item.productName}`,
        field: `items.${item.purchaseOrderItemId}.receivedQuantity`,
        recommendation: 'Verify if remaining items are expected'
      });
    }
  }

  /**
   * Validate quality checks
   */
  private validateQualityChecks(
    item: ReceiptItem,
    context: ReceivingContext,
    config: QualityCheckConfig,
    result: ReceivingValidationResult
  ): void {
    if (config.requireQualityCheck) {
      if (!item.qualityStatus || item.qualityStatus === 'pending') {
        if (config.qualityCheckRoles.includes(context.receivingUser.role)) {
          result.warnings.push({
            code: 'QUALITY_CHECK_REQUIRED',
            message: `Quality check required for ${item.productName}`,
            field: `items.${item.purchaseOrderItemId}.qualityStatus`,
            recommendation: 'Perform quality check before accepting items'
          });
        } else {
          result.errors.push({
            code: 'QUALITY_CHECK_UNAUTHORIZED',
            message: `User not authorized to perform quality check for ${item.productName}`,
            field: `items.${item.purchaseOrderItemId}.qualityStatus`,
            severity: 'error',
            blockingError: true
          });
        }
      } else if (item.qualityStatus === 'rejected') {
        if (config.damagedItemHandling === 'reject') {
          result.errors.push({
            code: 'QUALITY_CHECK_FAILED',
            message: `Quality check failed for ${item.productName}`,
            field: `items.${item.purchaseOrderItemId}.qualityStatus`,
            severity: 'error',
            blockingError: true
          });
        } else {
          result.warnings.push({
            code: 'QUALITY_CHECK_CONDITIONAL',
            message: `Quality check failed but items accepted conditionally for ${item.productName}`,
            field: `items.${item.purchaseOrderItemId}.qualityStatus`,
            recommendation: 'Document the condition and consider supplier feedback'
          });
        }
      }
    }
  }

  /**
   * Validate expiry handling
   */
  private validateExpiryHandling(
    item: ReceiptItem,
    config: ExpiryHandlingConfig,
    result: ReceivingValidationResult
  ): void {
    if (!config.checkExpiryOnReceipt || !item.expiryDate) return;

    const now = new Date();
    const daysToExpiry = Math.ceil((item.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysToExpiry < 0 && config.rejectExpiredItems) {
      result.errors.push({
        code: 'EXPIRED_ITEMS_REJECTED',
        message: `Expired items rejected for ${item.productName} (expired ${Math.abs(daysToExpiry)} days ago)`,
        field: `items.${item.purchaseOrderItemId}.expiryDate`,
        severity: 'error',
        blockingError: true
      });
    } else if (daysToExpiry <= config.nearExpiryThresholdDays) {
      if (config.acceptNearExpiryWithApproval) {
        result.requiresApproval = true;
        result.warnings.push({
          code: 'NEAR_EXPIRY_APPROVAL_REQUIRED',
          message: `Near-expiry items require approval for ${item.productName} (expires in ${daysToExpiry} days)`,
          field: `items.${item.purchaseOrderItemId}.expiryDate`,
          recommendation: 'Obtain approval to accept near-expiry items'
        });
      } else {
        result.warnings.push({
          code: 'NEAR_EXPIRY_WARNING',
          message: `Near-expiry warning for ${item.productName} (expires in ${daysToExpiry} days)`,
          field: `items.${item.purchaseOrderItemId}.expiryDate`,
          recommendation: 'Plan for quick turnover of these items'
        });
      }
    } else if (daysToExpiry <= config.warnBeforeExpiryDays) {
      result.warnings.push({
        code: 'EXPIRY_WARNING',
        message: `Expiry warning for ${item.productName} (expires in ${daysToExpiry} days)`,
        field: `items.${item.purchaseOrderItemId}.expiryDate`,
        recommendation: 'Monitor expiry date and prioritize usage'
      });
    }
  }

  /**
   * Validate damage handling
   */
  private validateDamageHandling(
    item: ReceiptItem,
    config: DamageHandlingConfig,
    result: ReceivingValidationResult
  ): void {
    if (config.requireDamageReport && !item.damageReport) {
      result.errors.push({
        code: 'DAMAGE_REPORT_REQUIRED',
        message: `Damage report required for damaged ${item.productName}`,
        field: `items.${item.purchaseOrderItemId}.damageReport`,
        severity: 'error',
        blockingError: true
      });
    }

    if (config.photographRequired && item.damageReport && (!item.damageReport.photographs || item.damageReport.photographs.length === 0)) {
      result.errors.push({
        code: 'DAMAGE_PHOTOS_REQUIRED',
        message: `Damage photographs required for damaged ${item.productName}`,
        field: `items.${item.purchaseOrderItemId}.damageReport.photographs`,
        severity: 'error',
        blockingError: true
      });
    }

    if (item.damageReport && !config.damageCategories.includes(item.damageReport.category)) {
      result.warnings.push({
        code: 'INVALID_DAMAGE_CATEGORY',
        message: `Invalid damage category for ${item.productName}`,
        field: `items.${item.purchaseOrderItemId}.damageReport.category`,
        recommendation: `Use one of: ${config.damageCategories.join(', ')}`
      });
    }

    if (config.notifySupplierOnDamage && item.damageReport) {
      result.adjustments = result.adjustments || [];
      result.adjustments.push({
        type: 'damage',
        description: 'Supplier notification required for damaged items',
        originalValue: 'good',
        adjustedValue: 'damaged',
        reason: item.damageReport.description,
        requiresApproval: false
      });
    }
  }

  /**
   * Validate partial receiving rules
   */
  private validatePartialReceiving(
    receiptItems: ReceiptItem[],
    context: ReceivingContext,
    settings: ReceivingToleranceSettings,
    result: ReceivingValidationResult
  ): void {
    const config = settings.partialReceiving;

    if (!config.enabled || !config.allowPartialReceipts) {
      result.errors.push({
        code: 'PARTIAL_RECEIVING_NOT_ALLOWED',
        message: 'Partial receiving is not allowed',
        severity: 'error',
        blockingError: true
      });
      return;
    }

    if (context.previousReceiptsCount >= config.maxPartialReceipts) {
      result.errors.push({
        code: 'MAX_PARTIAL_RECEIPTS_EXCEEDED',
        message: `Maximum partial receipts exceeded (${config.maxPartialReceipts})`,
        severity: 'error',
        blockingError: true
      });
    }

    if (config.requireReasonForPartial && !context.metadata?.partialReason) {
      result.errors.push({
        code: 'PARTIAL_REASON_REQUIRED',
        message: 'Reason required for partial receipt',
        field: 'partialReason',
        severity: 'error',
        blockingError: true
      });
    }

    if (config.notifyOnPartialReceipt) {
      result.adjustments = result.adjustments || [];
      result.adjustments.push({
        type: 'quantity',
        description: 'Partial receipt notification required',
        originalValue: 'full',
        adjustedValue: 'partial',
        reason: context.metadata?.partialReason || 'Partial delivery',
        requiresApproval: false
      });
    }
  }

  /**
   * Validate overall receiving constraints
   */
  private validateReceivingConstraints(
    receiptItems: ReceiptItem[],
    context: ReceivingContext,
    settings: ReceivingToleranceSettings,
    result: ReceivingValidationResult
  ): void {
    // Check if any items are being received
    const totalReceived = receiptItems.reduce((sum, item) => sum + item.receivedQuantity, 0);
    
    if (totalReceived === 0) {
      result.errors.push({
        code: 'NO_ITEMS_RECEIVED',
        message: 'No items are being received',
        severity: 'error',
        blockingError: true
      });
    }

    // Check for duplicate items
    const itemIds = receiptItems.map(item => item.purchaseOrderItemId);
    const duplicates = itemIds.filter((id, index) => itemIds.indexOf(id) !== index);
    
    if (duplicates.length > 0) {
      result.errors.push({
        code: 'DUPLICATE_RECEIPT_ITEMS',
        message: 'Duplicate items in receipt',
        severity: 'error',
        blockingError: true
      });
    }

    // Validate user permissions for receiving
    // This would be expanded based on the actual permission system
    if (!['employee', 'manager', 'admin'].includes(context.receivingUser.role)) {
      result.errors.push({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'User does not have permission to receive goods',
        severity: 'error',
        blockingError: true
      });
    }
  }

  /**
   * Get tolerance configuration for display
   */
  getToleranceConfiguration(): {
    overReceiving: ToleranceConfig;
    underReceiving: ToleranceConfig;
    partialReceiving: PartialReceivingConfig;
    qualityChecks: QualityCheckConfig;
    expiryHandling: ExpiryHandlingConfig;
    damageHandling: DamageHandlingConfig;
  } {
    return purchaseOrderWorkflowConfigService.getConfig().receivingSettings;
  }

  /**
   * Update tolerance configuration
   */
  updateToleranceConfiguration(updates: Partial<ReceivingToleranceSettings>): boolean {
    const currentConfig = purchaseOrderWorkflowConfigService.getConfig();
    const result = purchaseOrderWorkflowConfigService.updateConfig({
      receivingSettings: {
        ...currentConfig.receivingSettings,
        ...updates
      }
    });

    return result.isValid;
  }

  /**
   * Calculate receiving statistics
   */
  calculateReceivingStatistics(receiptItems: ReceiptItem[]): {
    totalItems: number;
    fullyReceivedItems: number;
    partiallyReceivedItems: number;
    damagedItems: number;
    expiredItems: number;
    completionPercentage: number;
    totalVariance: number;
    averageVariancePercentage: number;
  } {
    const totalItems = receiptItems.length;
    let fullyReceivedItems = 0;
    let partiallyReceivedItems = 0;
    let damagedItems = 0;
    let expiredItems = 0;
    let totalVariance = 0;
    let totalVariancePercentage = 0;

    for (const item of receiptItems) {
      const totalReceived = item.previouslyReceivedQuantity + item.receivedQuantity;
      const variance = totalReceived - item.orderedQuantity;
      const variancePercentage = Math.abs(variance / item.orderedQuantity) * 100;

      totalVariance += variance;
      totalVariancePercentage += variancePercentage;

      if (totalReceived >= item.orderedQuantity) {
        fullyReceivedItems++;
      } else if (totalReceived > 0) {
        partiallyReceivedItems++;
      }

      if (item.condition === 'damaged') {
        damagedItems++;
      }

      if (item.condition === 'expired' || (item.expiryDate && item.expiryDate < new Date())) {
        expiredItems++;
      }
    }

    const completionPercentage = totalItems > 0 
      ? ((fullyReceivedItems + partiallyReceivedItems) / totalItems) * 100 
      : 0;

    const averageVariancePercentage = totalItems > 0 
      ? totalVariancePercentage / totalItems 
      : 0;

    return {
      totalItems,
      fullyReceivedItems,
      partiallyReceivedItems,
      damagedItems,
      expiredItems,
      completionPercentage,
      totalVariance,
      averageVariancePercentage
    };
  }

  /**
   * Generate receiving recommendations
   */
  generateReceivingRecommendations(
    validation: ReceivingValidationResult,
    receiptItems: ReceiptItem[]
  ): string[] {
    const recommendations: string[] = [];

    if (validation.warnings.length > 0) {
      recommendations.push('Review warning messages before proceeding');
    }

    if (validation.requiresApproval) {
      recommendations.push('Obtain required approvals before completing receipt');
    }

    const damagedItems = receiptItems.filter(item => item.condition === 'damaged');
    if (damagedItems.length > 0) {
      recommendations.push('Document all damaged items with photos and detailed descriptions');
      recommendations.push('Contact supplier about damaged goods for credit or replacement');
    }

    const nearExpiryItems = receiptItems.filter(item => 
      item.expiryDate && 
      (item.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 30
    );
    if (nearExpiryItems.length > 0) {
      recommendations.push('Prioritize usage of near-expiry items');
      recommendations.push('Update inventory system with expiry dates');
    }

    const overReceivedItems = receiptItems.filter(item => 
      (item.previouslyReceivedQuantity + item.receivedQuantity) > item.orderedQuantity
    );
    if (overReceivedItems.length > 0) {
      recommendations.push('Verify over-received quantities with delivery documentation');
      recommendations.push('Consider updating purchase order if acceptable');
    }

    return recommendations;
  }
}

// Export singleton instance
export const receivingToleranceService = new ReceivingToleranceService();
export default receivingToleranceService;