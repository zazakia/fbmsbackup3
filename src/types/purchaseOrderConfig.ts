import { UserRole } from './auth';

export interface PurchaseOrderWorkflowConfig {
  approvalThresholds: ApprovalThreshold[];
  emailNotifications: EmailNotificationConfig;
  receivingSettings: ReceivingToleranceSettings;
  workflowCustomization: WorkflowCustomizationSettings;
  auditSettings: AuditConfiguration;
  systemSettings: PurchaseOrderSystemSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalThreshold {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number | null;
  requiredRoles: UserRole[];
  requiredApprovers: number;
  escalationTimeHours?: number;
  skipWeekends: boolean;
  skipHolidays: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  autoApprove: boolean;
  conditions?: ApprovalCondition[];
  isActive: boolean;
}

export interface ApprovalCondition {
  field: 'supplierCategory' | 'productCategory' | 'department' | 'paymentTerms' | 'currency';
  operator: 'equals' | 'contains' | 'in' | 'not_in';
  value: string | string[];
}

export interface EmailNotificationConfig {
  enabled: boolean;
  templates: NotificationTemplate[];
  defaultSender: {
    email: string;
    name: string;
  };
  escalationSettings: EscalationSettings;
  batchingSettings: BatchNotificationSettings;
  retrySettings: RetrySettings;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  event: NotificationEvent;
  subject: string;
  htmlBody: string;
  textBody: string;
  variables: string[];
  isActive: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  delayMinutes?: number;
  conditions?: NotificationCondition[];
}

export type NotificationEvent = 
  | 'approval_request'
  | 'approval_granted'
  | 'approval_rejected'
  | 'approval_overdue'
  | 'status_change'
  | 'receiving_reminder'
  | 'receiving_overdue'
  | 'bulk_approval'
  | 'partial_receipt'
  | 'full_receipt'
  | 'po_cancelled'
  | 'po_closed'
  | 'price_variance_alert'
  | 'over_receipt_warning'
  | 'under_receipt_warning';

export interface NotificationCondition {
  field: 'amount' | 'status' | 'supplier' | 'category' | 'department';
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
  value: string | number;
}

export interface EscalationSettings {
  enabled: boolean;
  levels: EscalationLevel[];
  skipWeekends: boolean;
  skipHolidays: boolean;
}

export interface EscalationLevel {
  level: number;
  afterHours: number;
  recipients: EscalationRecipient[];
  template?: string;
  priority: 'normal' | 'high' | 'urgent';
}

export interface EscalationRecipient {
  type: 'role' | 'user' | 'email';
  value: string;
  name?: string;
}

export interface BatchNotificationSettings {
  enabled: boolean;
  batchSize: number;
  intervalMinutes: number;
  maxWaitHours: number;
}

export interface RetrySettings {
  maxAttempts: number;
  initialDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

export interface ReceivingToleranceSettings {
  overReceiving: ToleranceConfig;
  underReceiving: ToleranceConfig;
  partialReceiving: PartialReceivingConfig;
  qualityChecks: QualityCheckConfig;
  expiryHandling: ExpiryHandlingConfig;
  damageHandling: DamageHandlingConfig;
}

export interface ToleranceConfig {
  enabled: boolean;
  toleranceType: 'percentage' | 'fixed';
  toleranceValue: number;
  requireApproval: boolean;
  approvalRoles: UserRole[];
  autoAccept: boolean;
  warningThreshold: number;
  blockThreshold?: number;
  notifyOnVariance: boolean;
}

export interface PartialReceivingConfig {
  enabled: boolean;
  allowPartialReceipts: boolean;
  maxPartialReceipts: number;
  closeOnPartialAfterDays?: number;
  requireReasonForPartial: boolean;
  notifyOnPartialReceipt: boolean;
}

export interface QualityCheckConfig {
  enabled: boolean;
  requireQualityCheck: boolean;
  qualityCheckRoles: UserRole[];
  rejectionReasons: string[];
  damagedItemHandling: 'reject' | 'partial_accept' | 'full_accept';
  qualityHoldDays: number;
}

export interface ExpiryHandlingConfig {
  enabled: boolean;
  checkExpiryOnReceipt: boolean;
  warnBeforeExpiryDays: number;
  rejectExpiredItems: boolean;
  acceptNearExpiryWithApproval: boolean;
  nearExpiryThresholdDays: number;
}

export interface DamageHandlingConfig {
  enabled: boolean;
  requireDamageReport: boolean;
  photographRequired: boolean;
  damageCategories: string[];
  autoCreateCreditNote: boolean;
  notifySupplierOnDamage: boolean;
}

export interface WorkflowCustomizationSettings {
  statusTransitions: StatusTransitionRule[];
  automationRules: AutomationRule[];
  validationRules: ValidationRule[];
  businessRules: BusinessRule[];
  integrationSettings: IntegrationSettings;
}

export interface StatusTransitionRule {
  fromStatus: string;
  toStatus: string;
  requiredRoles: UserRole[];
  conditions?: TransitionCondition[];
  automationTriggers?: AutomationTrigger[];
  requiresApproval: boolean;
  requiresReason: boolean;
  notifyOnTransition: boolean;
  isActive: boolean;
}

export interface TransitionCondition {
  field: 'amount' | 'items_received' | 'days_since_created' | 'supplier_rating' | 'payment_terms';
  operator: 'equals' | 'greater_than' | 'less_than' | 'between';
  value: string | number | [number, number];
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  isActive: boolean;
  priority: number;
  lastExecuted?: Date;
  executionCount: number;
}

export interface AutomationTrigger {
  type: 'status_change' | 'time_based' | 'amount_threshold' | 'receipt_complete' | 'overdue';
  value?: string | number;
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: string | number | boolean;
}

export interface AutomationAction {
  type: 'send_notification' | 'change_status' | 'assign_approver' | 'create_task' | 'update_field' | 'webhook';
  parameters: Record<string, any>;
}

export interface ValidationRule {
  id: string;
  name: string;
  field: string;
  ruleType: 'required' | 'min_value' | 'max_value' | 'pattern' | 'custom';
  value?: string | number;
  errorMessage: string;
  isActive: boolean;
  appliesTo: ('create' | 'update' | 'approve' | 'receive')[];
}

export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  ruleExpression: string;
  errorMessage: string;
  warningMessage?: string;
  isActive: boolean;
  priority: number;
  category: 'financial' | 'operational' | 'compliance' | 'quality';
}

export interface IntegrationSettings {
  erp: ERPIntegrationConfig;
  accounting: AccountingIntegrationConfig;
  suppliers: SupplierIntegrationConfig;
  notifications: ExternalNotificationConfig;
}

export interface ERPIntegrationConfig {
  enabled: boolean;
  provider: string;
  syncSettings: {
    autoSync: boolean;
    syncIntervalMinutes: number;
    syncOnStatusChange: boolean;
    syncFields: string[];
  };
  authentication: Record<string, string>;
}

export interface AccountingIntegrationConfig {
  enabled: boolean;
  provider: 'quickbooks' | 'xero' | 'sage' | 'custom';
  autoCreateEntries: boolean;
  accountMappings: Record<string, string>;
  taxHandling: 'inclusive' | 'exclusive' | 'mixed';
}

export interface SupplierIntegrationConfig {
  enabled: boolean;
  autoNotifyOnApproval: boolean;
  autoSendPO: boolean;
  ediSettings?: EDISettings;
  portalSettings?: SupplierPortalSettings;
}

export interface EDISettings {
  enabled: boolean;
  protocol: 'AS2' | 'SFTP' | 'HTTP';
  endpoint: string;
  credentials: Record<string, string>;
}

export interface SupplierPortalSettings {
  enabled: boolean;
  portalUrl: string;
  allowStatusUpdates: boolean;
  allowShippingUpdates: boolean;
}

export interface ExternalNotificationConfig {
  webhooks: WebhookConfig[];
  slackIntegration?: SlackIntegrationConfig;
  teamsIntegration?: TeamsIntegrationConfig;
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: NotificationEvent[];
  headers?: Record<string, string>;
  isActive: boolean;
}

export interface SlackIntegrationConfig {
  enabled: boolean;
  webhookUrl: string;
  channels: Record<NotificationEvent, string>;
}

export interface TeamsIntegrationConfig {
  enabled: boolean;
  webhookUrl: string;
  channels: Record<NotificationEvent, string>;
}

export interface AuditConfiguration {
  enabled: boolean;
  logLevel: 'minimal' | 'standard' | 'detailed' | 'verbose';
  retentionDays: number;
  encryptSensitiveData: boolean;
  auditEvents: AuditEventConfig[];
  complianceReporting: ComplianceReportingConfig;
}

export interface AuditEventConfig {
  event: string;
  enabled: boolean;
  logData: boolean;
  logUserInfo: boolean;
  logTimestamp: boolean;
  customFields?: string[];
}

export interface ComplianceReportingConfig {
  enabled: boolean;
  reportingStandards: ('SOX' | 'GDPR' | 'ISO27001' | 'custom')[];
  autoGenerateReports: boolean;
  reportFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

export interface PurchaseOrderSystemSettings {
  numbering: NumberingConfig;
  currencies: CurrencyConfig;
  taxSettings: TaxConfiguration;
  performanceSettings: PerformanceConfig;
  securitySettings: SecurityConfig;
}

export interface NumberingConfig {
  format: string; // e.g., "PO-{YYYY}-{MM}-{####}"
  prefix: string;
  startNumber: number;
  resetFrequency: 'never' | 'yearly' | 'monthly' | 'daily';
  padLength: number;
}

export interface CurrencyConfig {
  baseCurrency: string;
  supportedCurrencies: string[];
  autoConversion: boolean;
  conversionProvider?: 'openexchangerates' | 'fixer' | 'currencylayer' | 'manual';
  rateUpdateFrequency: 'realtime' | 'daily' | 'weekly' | 'manual';
}

export interface TaxConfiguration {
  defaultTaxRate: number;
  taxInclusive: boolean;
  multiTaxSupport: boolean;
  taxCategories: TaxCategory[];
  regionSettings: RegionTaxSettings[];
}

export interface TaxCategory {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
  applicableProducts?: string[];
}

export interface RegionTaxSettings {
  region: string;
  taxRules: TaxRule[];
}

export interface TaxRule {
  productCategory?: string;
  supplierLocation?: string;
  deliveryLocation?: string;
  taxRate: number;
}

export interface PerformanceConfig {
  batchProcessingSize: number;
  maxConcurrentOperations: number;
  cacheSettings: CacheConfiguration;
  queryOptimizations: QueryOptimization[];
}

export interface CacheConfiguration {
  enabled: boolean;
  ttlSeconds: number;
  maxItems: number;
  cacheKeys: string[];
}

export interface QueryOptimization {
  query: string;
  optimization: 'index' | 'partition' | 'materialized_view';
  parameters?: Record<string, any>;
}

export interface SecurityConfig {
  encryptSensitiveData: boolean;
  twoFactorForHighValue: boolean;
  highValueThreshold: number;
  ipWhitelist?: string[];
  sessionTimeout: number;
  auditSensitiveActions: boolean;
  dataRetentionDays: number;
}

// Default configuration values
export const defaultPurchaseOrderWorkflowConfig: Omit<PurchaseOrderWorkflowConfig, 'createdAt' | 'updatedAt'> = {
  approvalThresholds: [
    {
      id: 'threshold-1',
      name: 'Small Purchase',
      minAmount: 0,
      maxAmount: 10000,
      requiredRoles: ['manager' as UserRole],
      requiredApprovers: 1,
      escalationTimeHours: 24,
      skipWeekends: true,
      skipHolidays: true,
      priority: 'low',
      autoApprove: false,
      isActive: true
    },
    {
      id: 'threshold-2',
      name: 'Medium Purchase',
      minAmount: 10001,
      maxAmount: 50000,
      requiredRoles: ['manager' as UserRole, 'admin' as UserRole],
      requiredApprovers: 2,
      escalationTimeHours: 48,
      skipWeekends: true,
      skipHolidays: true,
      priority: 'medium',
      autoApprove: false,
      isActive: true
    },
    {
      id: 'threshold-3',
      name: 'Large Purchase',
      minAmount: 50001,
      maxAmount: null,
      requiredRoles: ['admin' as UserRole],
      requiredApprovers: 2,
      escalationTimeHours: 72,
      skipWeekends: true,
      skipHolidays: true,
      priority: 'high',
      autoApprove: false,
      isActive: true
    }
  ],
  emailNotifications: {
    enabled: true,
    templates: [], // Will be populated with default templates
    defaultSender: {
      email: 'noreply@fbms.com',
      name: 'FBMS Purchase System'
    },
    escalationSettings: {
      enabled: true,
      levels: [
        {
          level: 1,
          afterHours: 24,
          recipients: [{ type: 'role', value: 'manager' }],
          priority: 'normal'
        },
        {
          level: 2,
          afterHours: 48,
          recipients: [{ type: 'role', value: 'admin' }],
          priority: 'high'
        }
      ],
      skipWeekends: true,
      skipHolidays: true
    },
    batchingSettings: {
      enabled: false,
      batchSize: 10,
      intervalMinutes: 15,
      maxWaitHours: 2
    },
    retrySettings: {
      maxAttempts: 3,
      initialDelayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: 30000
    }
  },
  receivingSettings: {
    overReceiving: {
      enabled: true,
      toleranceType: 'percentage',
      toleranceValue: 5,
      requireApproval: true,
      approvalRoles: ['manager' as UserRole],
      autoAccept: false,
      warningThreshold: 3,
      blockThreshold: 10,
      notifyOnVariance: true
    },
    underReceiving: {
      enabled: true,
      toleranceType: 'percentage',
      toleranceValue: 10,
      requireApproval: false,
      approvalRoles: ['employee' as UserRole],
      autoAccept: true,
      warningThreshold: 5,
      notifyOnVariance: true
    },
    partialReceiving: {
      enabled: true,
      allowPartialReceipts: true,
      maxPartialReceipts: 5,
      closeOnPartialAfterDays: 30,
      requireReasonForPartial: true,
      notifyOnPartialReceipt: true
    },
    qualityChecks: {
      enabled: true,
      requireQualityCheck: false,
      qualityCheckRoles: ['employee' as UserRole],
      rejectionReasons: ['Damaged', 'Wrong Item', 'Poor Quality', 'Expired'],
      damagedItemHandling: 'partial_accept',
      qualityHoldDays: 3
    },
    expiryHandling: {
      enabled: true,
      checkExpiryOnReceipt: true,
      warnBeforeExpiryDays: 30,
      rejectExpiredItems: true,
      acceptNearExpiryWithApproval: true,
      nearExpiryThresholdDays: 7
    },
    damageHandling: {
      enabled: true,
      requireDamageReport: true,
      photographRequired: false,
      damageCategories: ['Physical Damage', 'Water Damage', 'Contamination', 'Packaging Issue'],
      autoCreateCreditNote: false,
      notifySupplierOnDamage: true
    }
  },
  workflowCustomization: {
    statusTransitions: [
      {
        fromStatus: 'draft',
        toStatus: 'pending_approval',
        requiredRoles: ['employee' as UserRole],
        requiresApproval: false,
        requiresReason: false,
        notifyOnTransition: true,
        isActive: true
      },
      {
        fromStatus: 'pending_approval',
        toStatus: 'approved',
        requiredRoles: ['manager' as UserRole],
        requiresApproval: true,
        requiresReason: false,
        notifyOnTransition: true,
        isActive: true
      },
      {
        fromStatus: 'approved',
        toStatus: 'partially_received',
        requiredRoles: ['employee' as UserRole],
        requiresApproval: false,
        requiresReason: false,
        notifyOnTransition: true,
        isActive: true
      }
    ],
    automationRules: [],
    validationRules: [],
    businessRules: [],
    integrationSettings: {
      erp: {
        enabled: false,
        provider: '',
        syncSettings: {
          autoSync: false,
          syncIntervalMinutes: 30,
          syncOnStatusChange: false,
          syncFields: []
        },
        authentication: {}
      },
      accounting: {
        enabled: false,
        provider: 'custom',
        autoCreateEntries: false,
        accountMappings: {},
        taxHandling: 'exclusive'
      },
      suppliers: {
        enabled: false,
        autoNotifyOnApproval: false,
        autoSendPO: false
      },
      notifications: {
        webhooks: []
      }
    }
  },
  auditSettings: {
    enabled: true,
    logLevel: 'standard',
    retentionDays: 365,
    encryptSensitiveData: true,
    auditEvents: [
      { event: 'po_created', enabled: true, logData: true, logUserInfo: true, logTimestamp: true },
      { event: 'po_approved', enabled: true, logData: true, logUserInfo: true, logTimestamp: true },
      { event: 'po_rejected', enabled: true, logData: true, logUserInfo: true, logTimestamp: true },
      { event: 'po_received', enabled: true, logData: true, logUserInfo: true, logTimestamp: true }
    ],
    complianceReporting: {
      enabled: false,
      reportingStandards: [],
      autoGenerateReports: false,
      reportFrequency: 'monthly'
    }
  },
  systemSettings: {
    numbering: {
      format: 'PO-{YYYY}-{MM}-{####}',
      prefix: 'PO',
      startNumber: 1,
      resetFrequency: 'yearly',
      padLength: 4
    },
    currencies: {
      baseCurrency: 'PHP',
      supportedCurrencies: ['PHP', 'USD', 'EUR'],
      autoConversion: false,
      rateUpdateFrequency: 'daily'
    },
    taxSettings: {
      defaultTaxRate: 12,
      taxInclusive: false,
      multiTaxSupport: false,
      taxCategories: [
        { id: 'vat', name: 'VAT', rate: 12, isDefault: true }
      ],
      regionSettings: []
    },
    performanceSettings: {
      batchProcessingSize: 100,
      maxConcurrentOperations: 5,
      cacheSettings: {
        enabled: true,
        ttlSeconds: 300,
        maxItems: 1000,
        cacheKeys: ['suppliers', 'products', 'approvers']
      },
      queryOptimizations: []
    },
    securitySettings: {
      encryptSensitiveData: true,
      twoFactorForHighValue: false,
      highValueThreshold: 100000,
      sessionTimeout: 3600,
      auditSensitiveActions: true,
      dataRetentionDays: 2555 // 7 years
    }
  }
};

// Configuration validation types
export interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}

export interface ConfigValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ConfigValidationWarning {
  field: string;
  message: string;
  recommendation?: string;
}