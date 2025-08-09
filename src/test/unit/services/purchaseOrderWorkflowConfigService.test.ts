import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  PurchaseOrderWorkflowConfigService,
  purchaseOrderWorkflowConfigService
} from '../../../services/purchaseOrderWorkflowConfigService';
import {
  PurchaseOrderWorkflowConfig,
  ApprovalThreshold,
  NotificationTemplate,
  defaultPurchaseOrderWorkflowConfig
} from '../../../types/purchaseOrderConfig';
import { PurchaseOrder } from '../../../types/business';
import { UserRole } from '../../../types/auth';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('PurchaseOrderWorkflowConfigService', () => {
  let service: PurchaseOrderWorkflowConfigService;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    service = new PurchaseOrderWorkflowConfigService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Configuration Loading and Saving', () => {
    it('should load default configuration when no stored config exists', () => {
      const config = service.getConfig();
      
      expect(config).toBeDefined();
      expect(config.approvalThresholds).toHaveLength(3);
      expect(config.emailNotifications.enabled).toBe(true);
      expect(config.receivingSettings.overReceiving.enabled).toBe(true);
    });

    it('should merge stored configuration with defaults', () => {
      const storedConfig = {
        approvalThresholds: [{
          id: 'custom-threshold',
          name: 'Custom Threshold',
          minAmount: 5000,
          maxAmount: 15000,
          requiredRoles: ['manager' as UserRole],
          requiredApprovers: 1,
          escalationTimeHours: 48,
          skipWeekends: true,
          skipHolidays: true,
          priority: 'high' as const,
          autoApprove: false,
          isActive: true
        }],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedConfig));
      service = new PurchaseOrderWorkflowConfigService();
      
      const config = service.getConfig();
      expect(config.approvalThresholds).toHaveLength(1);
      expect(config.approvalThresholds[0].id).toBe('custom-threshold');
      expect(config.emailNotifications).toBeDefined(); // Should be merged from defaults
    });

    it('should save configuration to localStorage', () => {
      const updates = {
        emailNotifications: {
          ...defaultPurchaseOrderWorkflowConfig.emailNotifications,
          enabled: false
        }
      };

      const result = service.updateConfig(updates);
      
      expect(result.isValid).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(service.getConfig().emailNotifications.enabled).toBe(false);
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => {
        service.updateConfig({ emailNotifications: { ...defaultPurchaseOrderWorkflowConfig.emailNotifications, enabled: false } });
      }).toThrow('Failed to save configuration');
    });
  });

  describe('Approval Threshold Management', () => {
    it('should get correct approval threshold for purchase amount', () => {
      const threshold = service.getApprovalThreshold(25000);
      
      expect(threshold).toBeDefined();
      expect(threshold!.name).toBe('Medium Purchase');
      expect(threshold!.minAmount).toBeLessThanOrEqual(25000);
      expect(threshold!.maxAmount).toBeGreaterThanOrEqual(25000);
    });

    it('should return null for amounts outside all thresholds', () => {
      // Create service with custom thresholds
      service.updateConfig({
        approvalThresholds: [{
          id: 'low-only',
          name: 'Low Only',
          minAmount: 0,
          maxAmount: 1000,
          requiredRoles: ['employee' as UserRole],
          requiredApprovers: 1,
          escalationTimeHours: 24,
          skipWeekends: true,
          skipHolidays: true,
          priority: 'low',
          autoApprove: true,
          isActive: true
        }]
      });

      const threshold = service.getApprovalThreshold(5000);
      expect(threshold).toBeNull();
    });

    it('should consider approval conditions when finding threshold', () => {
      const testThreshold: ApprovalThreshold = {
        id: 'conditional-threshold',
        name: 'Conditional Threshold',
        minAmount: 0,
        maxAmount: 50000,
        requiredRoles: ['manager' as UserRole],
        requiredApprovers: 1,
        escalationTimeHours: 24,
        skipWeekends: true,
        skipHolidays: true,
        priority: 'medium',
        autoApprove: false,
        isActive: true,
        conditions: [{
          field: 'supplierCategory',
          operator: 'equals',
          value: 'preferred'
        }]
      };

      service.updateConfig({
        approvalThresholds: [testThreshold]
      });

      // Should match with correct condition
      const threshold1 = service.getApprovalThreshold(10000, { supplierCategory: 'preferred' });
      expect(threshold1).toBeDefined();
      expect(threshold1!.id).toBe('conditional-threshold');

      // Should not match with incorrect condition
      const threshold2 = service.getApprovalThreshold(10000, { supplierCategory: 'standard' });
      expect(threshold2).toBeNull();
    });

    it('should get required approvers for purchase order', () => {
      const mockPO: Partial<PurchaseOrder> = {
        id: '1',
        total: 25000,
        supplierCategory: 'standard',
        items: [{ category: 'office-supplies' } as any]
      };

      const approvers = service.getRequiredApprovers(mockPO as PurchaseOrder);
      expect(approvers).toContain('manager');
      expect(approvers).toContain('admin');
    });

    it('should determine if purchase order can be auto-approved', () => {
      // Create auto-approve threshold
      service.updateConfig({
        approvalThresholds: [{
          id: 'auto-approve',
          name: 'Auto Approve',
          minAmount: 0,
          maxAmount: 100,
          requiredRoles: [],
          requiredApprovers: 0,
          escalationTimeHours: 0,
          skipWeekends: false,
          skipHolidays: false,
          priority: 'low',
          autoApprove: true,
          isActive: true
        }]
      });

      const mockPO: Partial<PurchaseOrder> = {
        id: '1',
        total: 50,
        items: []
      };

      const canAutoApprove = service.canAutoApprove(mockPO as PurchaseOrder);
      expect(canAutoApprove).toBe(true);
    });

    it('should add approval threshold', () => {
      const newThreshold = {
        name: 'Test Threshold',
        minAmount: 1000,
        maxAmount: 5000,
        requiredRoles: ['manager' as UserRole],
        requiredApprovers: 1,
        escalationTimeHours: 24,
        skipWeekends: true,
        skipHolidays: true,
        priority: 'medium' as const,
        autoApprove: false,
        isActive: true
      };

      const id = service.addApprovalThreshold(newThreshold);
      expect(id).toBeDefined();
      
      const config = service.getConfig();
      const addedThreshold = config.approvalThresholds.find(t => t.id === id);
      expect(addedThreshold).toBeDefined();
      expect(addedThreshold!.name).toBe('Test Threshold');
    });

    it('should update approval threshold', () => {
      const config = service.getConfig();
      const firstThreshold = config.approvalThresholds[0];
      
      const updated = service.updateApprovalThreshold(firstThreshold.id, {
        name: 'Updated Threshold Name'
      });

      expect(updated).toBe(true);
      
      const updatedConfig = service.getConfig();
      const updatedThreshold = updatedConfig.approvalThresholds.find(t => t.id === firstThreshold.id);
      expect(updatedThreshold!.name).toBe('Updated Threshold Name');
    });

    it('should remove approval threshold', () => {
      const config = service.getConfig();
      const firstThreshold = config.approvalThresholds[0];
      const initialCount = config.approvalThresholds.length;
      
      const removed = service.removeApprovalThreshold(firstThreshold.id);
      expect(removed).toBe(true);
      
      const updatedConfig = service.getConfig();
      expect(updatedConfig.approvalThresholds.length).toBe(initialCount - 1);
      expect(updatedConfig.approvalThresholds.find(t => t.id === firstThreshold.id)).toBeUndefined();
    });
  });

  describe('Notification Template Management', () => {
    it('should get notification template by event', () => {
      const template = service.getNotificationTemplate('approval_request');
      expect(template).toBeDefined();
      expect(template!.event).toBe('approval_request');
      expect(template!.isActive).toBe(true);
    });

    it('should return null for inactive templates', () => {
      // Add inactive template
      const inactiveTemplate: NotificationTemplate = {
        id: 'inactive-template',
        name: 'Inactive Template',
        event: 'approval_granted',
        subject: 'Test',
        htmlBody: 'Test',
        textBody: 'Test',
        variables: [],
        isActive: false,
        priority: 'normal'
      };

      service.addNotificationTemplate(inactiveTemplate);
      
      const template = service.getNotificationTemplate('approval_granted');
      expect(template).toBeNull(); // Should not return inactive template
    });

    it('should add notification template', () => {
      const newTemplate = {
        name: 'Test Template',
        event: 'po_cancelled' as const,
        subject: 'Test Subject',
        htmlBody: '<p>Test HTML</p>',
        textBody: 'Test Text',
        variables: ['poNumber', 'reason'],
        isActive: true,
        priority: 'normal' as const
      };

      const id = service.addNotificationTemplate(newTemplate);
      expect(id).toBeDefined();
      
      const template = service.getNotificationTemplate('po_cancelled');
      expect(template).toBeDefined();
      expect(template!.name).toBe('Test Template');
    });

    it('should update notification template', () => {
      // First add a template
      const templateId = service.addNotificationTemplate({
        name: 'Original Template',
        event: 'po_closed',
        subject: 'Original Subject',
        htmlBody: '<p>Original</p>',
        textBody: 'Original',
        variables: [],
        isActive: true,
        priority: 'normal'
      });

      const updated = service.updateNotificationTemplate(templateId, {
        name: 'Updated Template',
        subject: 'Updated Subject'
      });

      expect(updated).toBe(true);
      
      const template = service.getNotificationTemplate('po_closed');
      expect(template!.name).toBe('Updated Template');
      expect(template!.subject).toBe('Updated Subject');
    });
  });

  describe('Receiving Configuration', () => {
    it('should get receiving tolerance for over/under receiving', () => {
      const overTolerance = service.getReceivingTolerance('over');
      expect(overTolerance).toBeDefined();
      expect(overTolerance.enabled).toBe(true);
      expect(overTolerance.toleranceValue).toBe(5);

      const underTolerance = service.getReceivingTolerance('under');
      expect(underTolerance).toBeDefined();
      expect(underTolerance.enabled).toBe(true);
      expect(underTolerance.toleranceValue).toBe(10);
    });

    it('should check if partial receiving is allowed', () => {
      const allowed = service.isPartialReceivingAllowed();
      expect(allowed).toBe(true);
    });

    it('should get maximum partial receipts', () => {
      const maxReceipts = service.getMaxPartialReceipts();
      expect(maxReceipts).toBe(5);
    });

    it('should check if quality checks are required', () => {
      const required = service.requiresQualityCheck();
      expect(required).toBe(false); // Default is enabled but not required
    });
  });

  describe('Automation and Validation Rules', () => {
    it('should get automation rules by trigger', () => {
      // Add test automation rule
      const config = service.getConfig();
      service.updateConfig({
        workflowCustomization: {
          ...config.workflowCustomization,
          automationRules: [{
            id: 'test-rule',
            name: 'Test Rule',
            trigger: { type: 'status_change', value: 'approved' },
            conditions: [],
            actions: [],
            isActive: true,
            priority: 1,
            executionCount: 0
          }]
        }
      });

      const rules = service.getAutomationRules('status_change');
      expect(rules).toHaveLength(1);
      expect(rules[0].name).toBe('Test Rule');
    });

    it('should get validation rules by operation', () => {
      // Add test validation rule
      const config = service.getConfig();
      service.updateConfig({
        workflowCustomization: {
          ...config.workflowCustomization,
          validationRules: [{
            id: 'test-validation',
            name: 'Test Validation',
            field: 'total',
            ruleType: 'min_value',
            value: 100,
            errorMessage: 'Minimum order amount is 100',
            isActive: true,
            appliesTo: ['create', 'update']
          }]
        }
      });

      const createRules = service.getValidationRules('create');
      expect(createRules).toHaveLength(1);
      expect(createRules[0].name).toBe('Test Validation');

      const approveRules = service.getValidationRules('approve');
      expect(approveRules).toHaveLength(0);
    });

    it('should get business rules by category', () => {
      // Add test business rule
      const config = service.getConfig();
      service.updateConfig({
        workflowCustomization: {
          ...config.workflowCustomization,
          businessRules: [{
            id: 'financial-rule',
            name: 'Financial Rule',
            description: 'Test financial rule',
            ruleExpression: 'total > 1000',
            errorMessage: 'Financial approval required',
            isActive: true,
            priority: 1,
            category: 'financial'
          }]
        }
      });

      const financialRules = service.getBusinessRules('financial');
      expect(financialRules).toHaveLength(1);
      expect(financialRules[0].category).toBe('financial');

      const allRules = service.getBusinessRules();
      expect(allRules).toHaveLength(1);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate valid configuration', () => {
      const config = service.getConfig();
      const result = service['validateConfig'](config);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect overlapping approval thresholds', () => {
      const invalidConfig = {
        ...service.getConfig(),
        approvalThresholds: [
          {
            id: '1',
            name: 'First',
            minAmount: 0,
            maxAmount: 1000,
            requiredRoles: ['manager' as UserRole],
            requiredApprovers: 1,
            escalationTimeHours: 24,
            skipWeekends: true,
            skipHolidays: true,
            priority: 'low' as const,
            autoApprove: false,
            isActive: true
          },
          {
            id: '2',
            name: 'Second',
            minAmount: 500,
            maxAmount: 2000,
            requiredRoles: ['manager' as UserRole],
            requiredApprovers: 1,
            escalationTimeHours: 24,
            skipWeekends: true,
            skipHolidays: true,
            priority: 'medium' as const,
            autoApprove: false,
            isActive: true
          }
        ]
      };

      const result = service['validateConfig'](invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'approvalThresholds')).toBe(true);
    });

    it('should detect missing required fields', () => {
      const invalidConfig = {
        ...service.getConfig(),
        approvalThresholds: [{
          id: 'invalid',
          name: '', // Missing name
          minAmount: -100, // Invalid amount
          maxAmount: null,
          requiredRoles: [], // No required roles
          requiredApprovers: 1,
          escalationTimeHours: 24,
          skipWeekends: true,
          skipHolidays: true,
          priority: 'low' as const,
          autoApprove: false,
          isActive: true
        }]
      };

      const result = service['validateConfig'](invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid email notification configuration', () => {
      const invalidConfig = {
        ...service.getConfig(),
        emailNotifications: {
          ...service.getConfig().emailNotifications,
          defaultSender: {
            email: '', // Missing email
            name: 'Test'
          }
        }
      };

      const result = service['validateConfig'](invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field?.includes('defaultSender.email'))).toBe(true);
    });
  });

  describe('Import/Export', () => {
    it('should export configuration as JSON', () => {
      const exported = service.exportConfig();
      const parsed = JSON.parse(exported);
      
      expect(parsed).toBeDefined();
      expect(parsed.approvalThresholds).toBeDefined();
      expect(parsed.emailNotifications).toBeDefined();
    });

    it('should import valid configuration', () => {
      const testConfig = {
        ...defaultPurchaseOrderWorkflowConfig,
        emailNotifications: {
          ...defaultPurchaseOrderWorkflowConfig.emailNotifications,
          enabled: false
        }
      };

      const result = service.importConfig(JSON.stringify(testConfig));
      
      expect(result.isValid).toBe(true);
      expect(service.getConfig().emailNotifications.enabled).toBe(false);
    });

    it('should reject invalid JSON', () => {
      const result = service.importConfig('invalid json');
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('Invalid JSON format');
    });

    it('should reject invalid configuration structure', () => {
      const invalidConfig = {
        approvalThresholds: 'not an array'
      };

      const result = service.importConfig(JSON.stringify(invalidConfig));
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Summary and Utilities', () => {
    it('should provide configuration summary', () => {
      const summary = service.getConfigSummary();
      
      expect(summary.approvalThresholds).toBeGreaterThan(0);
      expect(summary.lastUpdated).toBeInstanceOf(Date);
    });

    it('should generate purchase order number', () => {
      const poNumber = service.generatePurchaseOrderNumber();
      
      expect(poNumber).toMatch(/^PO-\d{4}-\d{2}-\d{4}$/);
    });

    it('should check high-value approval requirement', () => {
      const config = service.getConfig();
      config.systemSettings.securitySettings.highValueThreshold = 50000;
      config.systemSettings.securitySettings.twoFactorForHighValue = true;
      
      service.updateConfig({ systemSettings: config.systemSettings });

      const requiresHighValue1 = service.requiresHighValueApproval(75000);
      expect(requiresHighValue1).toBe(true);

      const requiresHighValue2 = service.requiresHighValueApproval(25000);
      expect(requiresHighValue2).toBe(false);
    });

    it('should handle configuration change subscriptions', () => {
      const mockCallback = vi.fn();
      const unsubscribe = service.subscribe(mockCallback);

      service.updateConfig({
        emailNotifications: {
          ...service.getConfig().emailNotifications,
          enabled: false
        }
      });

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          emailNotifications: expect.objectContaining({
            enabled: false
          })
        })
      );

      unsubscribe();
      
      service.updateConfig({
        emailNotifications: {
          ...service.getConfig().emailNotifications,
          enabled: true
        }
      });

      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Reset to Defaults', () => {
    it('should reset configuration to defaults', () => {
      // Modify configuration
      service.updateConfig({
        emailNotifications: {
          ...service.getConfig().emailNotifications,
          enabled: false
        }
      });

      expect(service.getConfig().emailNotifications.enabled).toBe(false);

      // Reset to defaults
      service.resetToDefaults();

      expect(service.getConfig().emailNotifications.enabled).toBe(true);
      expect(service.getConfig().approvalThresholds).toHaveLength(3);
    });
  });
});

describe('PurchaseOrderWorkflowConfigService Integration', () => {
  it('should work with singleton instance', () => {
    const config1 = purchaseOrderWorkflowConfigService.getConfig();
    const config2 = purchaseOrderWorkflowConfigService.getConfig();

    expect(config1).toEqual(config2);
  });

  it('should persist changes across service instances', () => {
    const service1 = new PurchaseOrderWorkflowConfigService();
    service1.updateConfig({
      emailNotifications: {
        ...service1.getConfig().emailNotifications,
        enabled: false
      }
    });

    const service2 = new PurchaseOrderWorkflowConfigService();
    expect(service2.getConfig().emailNotifications.enabled).toBe(false);
  });
});