import { 
  PurchaseOrderWorkflowConfig,
  ApprovalThreshold,
  NotificationTemplate,
  NotificationEvent,
  ReceivingToleranceSettings,
  AutomationRule,
  ValidationRule,
  BusinessRule,
  ConfigValidationResult,
  ConfigValidationError,
  defaultPurchaseOrderWorkflowConfig
} from '../types/purchaseOrderConfig';
import { UserRole } from '../types/auth';
import { PurchaseOrder } from '../types/business';

export class PurchaseOrderWorkflowConfigService {
  private config: PurchaseOrderWorkflowConfig;
  private configKey = 'fbms-purchase-order-workflow-config';
  private listeners: Set<(config: PurchaseOrderWorkflowConfig) => void> = new Set();

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from localStorage with fallback to defaults
   */
  private loadConfig(): PurchaseOrderWorkflowConfig {
    try {
      const stored = localStorage.getItem(this.configKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new configuration properties
        return {
          ...defaultPurchaseOrderWorkflowConfig,
          ...parsed,
          createdAt: new Date(parsed.createdAt || Date.now()),
          updatedAt: new Date(parsed.updatedAt || Date.now())
        };
      }
    } catch (error) {
      console.error('Failed to load purchase order workflow config:', error);
    }

    return {
      ...defaultPurchaseOrderWorkflowConfig,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    try {
      this.config.updatedAt = new Date();
      localStorage.setItem(this.configKey, JSON.stringify(this.config));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save purchase order workflow config:', error);
      throw new Error('Failed to save configuration');
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): PurchaseOrderWorkflowConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<PurchaseOrderWorkflowConfig>): ConfigValidationResult {
    const validation = this.validateConfig({ ...this.config, ...updates });
    
    if (!validation.isValid) {
      return validation;
    }

    this.config = { ...this.config, ...updates };
    this.saveConfig();

    return validation;
  }

  /**
   * Get approval threshold for a purchase order amount
   */
  getApprovalThreshold(amount: number, conditions?: Record<string, any>): ApprovalThreshold | null {
    const activeThresholds = this.config.approvalThresholds
      .filter(threshold => threshold.isActive)
      .sort((a, b) => a.minAmount - b.minAmount);

    for (const threshold of activeThresholds) {
      if (amount >= threshold.minAmount && 
          (threshold.maxAmount === null || amount <= threshold.maxAmount)) {
        
        // Check additional conditions if provided
        if (threshold.conditions && conditions) {
          const meetsConditions = threshold.conditions.every(condition => 
            this.evaluateCondition(condition, conditions)
          );
          if (!meetsConditions) continue;
        }

        return threshold;
      }
    }

    return null;
  }

  /**
   * Get required approvers for a purchase order
   */
  getRequiredApprovers(purchaseOrder: PurchaseOrder): UserRole[] {
    const threshold = this.getApprovalThreshold(purchaseOrder.total, {
      supplierCategory: purchaseOrder.supplierCategory,
      productCategory: purchaseOrder.items[0]?.category,
      paymentTerms: purchaseOrder.paymentTerms,
      currency: purchaseOrder.currency
    });

    return threshold?.requiredRoles || [];
  }

  /**
   * Check if purchase order can be auto-approved
   */
  canAutoApprove(purchaseOrder: PurchaseOrder): boolean {
    const threshold = this.getApprovalThreshold(purchaseOrder.total);
    return threshold?.autoApprove || false;
  }

  /**
   * Get notification template by event
   */
  getNotificationTemplate(event: NotificationEvent): NotificationTemplate | null {
    return this.config.emailNotifications.templates.find(
      template => template.event === event && template.isActive
    ) || null;
  }

  /**
   * Get receiving tolerance for over/under receiving
   */
  getReceivingTolerance(type: 'over' | 'under'): any {
    const settings = this.config.receivingSettings;
    return type === 'over' ? settings.overReceiving : settings.underReceiving;
  }

  /**
   * Check if partial receiving is allowed
   */
  isPartialReceivingAllowed(): boolean {
    return this.config.receivingSettings.partialReceiving.enabled &&
           this.config.receivingSettings.partialReceiving.allowPartialReceipts;
  }

  /**
   * Get maximum allowed partial receipts
   */
  getMaxPartialReceipts(): number {
    return this.config.receivingSettings.partialReceiving.maxPartialReceipts;
  }

  /**
   * Check if quality checks are required
   */
  requiresQualityCheck(): boolean {
    return this.config.receivingSettings.qualityChecks.enabled &&
           this.config.receivingSettings.qualityChecks.requireQualityCheck;
  }

  /**
   * Get automation rules for a specific trigger
   */
  getAutomationRules(trigger: string): AutomationRule[] {
    return this.config.workflowCustomization.automationRules.filter(
      rule => rule.isActive && rule.trigger.type === trigger
    );
  }

  /**
   * Get validation rules for a specific operation
   */
  getValidationRules(operation: 'create' | 'update' | 'approve' | 'receive'): ValidationRule[] {
    return this.config.workflowCustomization.validationRules.filter(
      rule => rule.isActive && rule.appliesTo.includes(operation)
    );
  }

  /**
   * Get business rules by category
   */
  getBusinessRules(category?: string): BusinessRule[] {
    let rules = this.config.workflowCustomization.businessRules.filter(rule => rule.isActive);
    
    if (category) {
      rules = rules.filter(rule => rule.category === category);
    }

    return rules.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Add approval threshold
   */
  addApprovalThreshold(threshold: Omit<ApprovalThreshold, 'id'>): string {
    const id = this.generateId();
    const newThreshold: ApprovalThreshold = {
      ...threshold,
      id
    };

    this.config.approvalThresholds.push(newThreshold);
    this.saveConfig();

    return id;
  }

  /**
   * Update approval threshold
   */
  updateApprovalThreshold(id: string, updates: Partial<ApprovalThreshold>): boolean {
    const index = this.config.approvalThresholds.findIndex(t => t.id === id);
    
    if (index === -1) return false;

    this.config.approvalThresholds[index] = {
      ...this.config.approvalThresholds[index],
      ...updates
    };
    
    this.saveConfig();
    return true;
  }

  /**
   * Remove approval threshold
   */
  removeApprovalThreshold(id: string): boolean {
    const initialLength = this.config.approvalThresholds.length;
    this.config.approvalThresholds = this.config.approvalThresholds.filter(t => t.id !== id);
    
    if (this.config.approvalThresholds.length < initialLength) {
      this.saveConfig();
      return true;
    }
    
    return false;
  }

  /**
   * Add notification template
   */
  addNotificationTemplate(template: Omit<NotificationTemplate, 'id'>): string {
    const id = this.generateId();
    const newTemplate: NotificationTemplate = {
      ...template,
      id
    };

    this.config.emailNotifications.templates.push(newTemplate);
    this.saveConfig();

    return id;
  }

  /**
   * Update notification template
   */
  updateNotificationTemplate(id: string, updates: Partial<NotificationTemplate>): boolean {
    const index = this.config.emailNotifications.templates.findIndex(t => t.id === id);
    
    if (index === -1) return false;

    this.config.emailNotifications.templates[index] = {
      ...this.config.emailNotifications.templates[index],
      ...updates
    };
    
    this.saveConfig();
    return true;
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): void {
    this.config = {
      ...defaultPurchaseOrderWorkflowConfig,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.saveConfig();
  }

  /**
   * Export configuration
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration
   */
  importConfig(configJson: string): ConfigValidationResult {
    try {
      const imported = JSON.parse(configJson);
      const validation = this.validateConfig(imported);
      
      if (validation.isValid) {
        this.config = {
          ...imported,
          createdAt: new Date(imported.createdAt || Date.now()),
          updatedAt: new Date()
        };
        this.saveConfig();
      }
      
      return validation;
    } catch (error) {
      return {
        isValid: false,
        errors: [{ field: 'config', message: 'Invalid JSON format', severity: 'error' }],
        warnings: []
      };
    }
  }

  /**
   * Validate configuration
   */
  validateConfig(config: any): ConfigValidationResult {
    const errors: ConfigValidationError[] = [];
    const warnings: ConfigValidationError[] = [];

    // Validate approval thresholds
    if (!config.approvalThresholds || !Array.isArray(config.approvalThresholds)) {
      errors.push({ field: 'approvalThresholds', message: 'Approval thresholds must be an array', severity: 'error' });
    } else {
      // Check for overlapping thresholds
      const sortedThresholds = config.approvalThresholds
        .filter(t => t.isActive)
        .sort((a, b) => a.minAmount - b.minAmount);

      for (let i = 0; i < sortedThresholds.length - 1; i++) {
        const current = sortedThresholds[i];
        const next = sortedThresholds[i + 1];
        
        if (current.maxAmount && next.minAmount <= current.maxAmount) {
          errors.push({
            field: 'approvalThresholds',
            message: `Overlapping thresholds: ${current.name} and ${next.name}`,
            severity: 'error'
          });
        }
      }

      // Validate required fields
      config.approvalThresholds.forEach((threshold, index) => {
        if (!threshold.name) {
          errors.push({ field: `approvalThresholds[${index}].name`, message: 'Threshold name is required', severity: 'error' });
        }
        if (typeof threshold.minAmount !== 'number' || threshold.minAmount < 0) {
          errors.push({ field: `approvalThresholds[${index}].minAmount`, message: 'Invalid minimum amount', severity: 'error' });
        }
        if (!threshold.requiredRoles || threshold.requiredRoles.length === 0) {
          errors.push({ field: `approvalThresholds[${index}].requiredRoles`, message: 'At least one required role must be specified', severity: 'error' });
        }
      });
    }

    // Validate email notifications
    if (!config.emailNotifications) {
      errors.push({ field: 'emailNotifications', message: 'Email notifications configuration is required', severity: 'error' });
    } else {
      if (!config.emailNotifications.defaultSender?.email) {
        errors.push({ field: 'emailNotifications.defaultSender.email', message: 'Default sender email is required', severity: 'error' });
      }

      // Validate notification templates
      if (config.emailNotifications.templates) {
        config.emailNotifications.templates.forEach((template, index) => {
          if (!template.name) {
            errors.push({ field: `emailNotifications.templates[${index}].name`, message: 'Template name is required', severity: 'error' });
          }
          if (!template.subject) {
            errors.push({ field: `emailNotifications.templates[${index}].subject`, message: 'Template subject is required', severity: 'error' });
          }
          if (!template.htmlBody && !template.textBody) {
            errors.push({ field: `emailNotifications.templates[${index}].body`, message: 'Template must have either HTML or text body', severity: 'error' });
          }
        });
      }
    }

    // Validate receiving settings
    if (!config.receivingSettings) {
      errors.push({ field: 'receivingSettings', message: 'Receiving settings configuration is required', severity: 'error' });
    } else {
      // Validate tolerance settings
      ['overReceiving', 'underReceiving'].forEach(type => {
        const setting = config.receivingSettings[type];
        if (setting?.enabled) {
          if (typeof setting.toleranceValue !== 'number' || setting.toleranceValue < 0) {
            errors.push({ field: `receivingSettings.${type}.toleranceValue`, message: 'Invalid tolerance value', severity: 'error' });
          }
          if (setting.toleranceType === 'percentage' && setting.toleranceValue > 100) {
            warnings.push({ field: `receivingSettings.${type}.toleranceValue`, message: 'Percentage tolerance over 100% may cause issues', severity: 'warning' });
          }
        }
      });
    }

    // Validate system settings
    if (config.systemSettings) {
      if (config.systemSettings.numbering) {
        const numbering = config.systemSettings.numbering;
        if (!numbering.format) {
          errors.push({ field: 'systemSettings.numbering.format', message: 'Numbering format is required', severity: 'error' });
        }
        if (typeof numbering.startNumber !== 'number' || numbering.startNumber < 1) {
          errors.push({ field: 'systemSettings.numbering.startNumber', message: 'Start number must be a positive integer', severity: 'error' });
        }
      }

      if (config.systemSettings.currencies) {
        const currencies = config.systemSettings.currencies;
        if (!currencies.baseCurrency) {
          errors.push({ field: 'systemSettings.currencies.baseCurrency', message: 'Base currency is required', severity: 'error' });
        }
        if (!currencies.supportedCurrencies?.includes(currencies.baseCurrency)) {
          warnings.push({ field: 'systemSettings.currencies', message: 'Base currency should be included in supported currencies', severity: 'warning' });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Subscribe to configuration changes
   */
  subscribe(callback: (config: PurchaseOrderWorkflowConfig) => void): () => void {
    this.listeners.add(callback);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of configuration changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.config);
      } catch (error) {
        console.error('Error in configuration change listener:', error);
      }
    });
  }

  /**
   * Evaluate condition against provided values
   */
  private evaluateCondition(condition: any, values: Record<string, any>): boolean {
    const fieldValue = values[condition.field];
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get configuration summary for display
   */
  getConfigSummary(): {
    approvalThresholds: number;
    activeTemplates: number;
    automationRules: number;
    validationRules: number;
    lastUpdated: Date;
  } {
    return {
      approvalThresholds: this.config.approvalThresholds.filter(t => t.isActive).length,
      activeTemplates: this.config.emailNotifications.templates.filter(t => t.isActive).length,
      automationRules: this.config.workflowCustomization.automationRules.filter(r => r.isActive).length,
      validationRules: this.config.workflowCustomization.validationRules.filter(r => r.isActive).length,
      lastUpdated: this.config.updatedAt
    };
  }

  /**
   * Generate purchase order number based on configuration
   */
  generatePurchaseOrderNumber(): string {
    const numbering = this.config.systemSettings.numbering;
    let format = numbering.format;
    
    const now = new Date();
    const replacements = {
      '{YYYY}': now.getFullYear().toString(),
      '{YY}': now.getFullYear().toString().slice(-2),
      '{MM}': (now.getMonth() + 1).toString().padStart(2, '0'),
      '{DD}': now.getDate().toString().padStart(2, '0'),
      '{####}': '0001' // This should be replaced with actual sequence number from database
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      format = format.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    return format;
  }

  /**
   * Check if high-value approval is required
   */
  requiresHighValueApproval(amount: number): boolean {
    return this.config.systemSettings.securitySettings.twoFactorForHighValue &&
           amount >= this.config.systemSettings.securitySettings.highValueThreshold;
  }
}

// Export singleton instance
export const purchaseOrderWorkflowConfigService = new PurchaseOrderWorkflowConfigService();
export default purchaseOrderWorkflowConfigService;