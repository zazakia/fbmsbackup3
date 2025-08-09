# Purchase Order Workflow Configuration API

This document describes the purchase order workflow configuration system that provides comprehensive control over approval processes, notification templates, receiving tolerances, and business rules.

## Overview

The Purchase Order Workflow Configuration system allows businesses to customize their purchase order processes according to their specific requirements. It includes:

- **Configurable Approval Thresholds**: Set up approval requirements based on purchase amounts and user roles
- **Email Notification Templates**: Customize notification content for various workflow events
- **Receiving Tolerance Settings**: Control over/under delivery handling policies
- **Workflow Customization**: Define automation rules, validation rules, and business rules
- **System Integration**: Configure ERP, accounting, and supplier integrations

## Core Services

### PurchaseOrderWorkflowConfigService

Main service for managing workflow configuration.

#### Methods

```typescript
// Get current configuration
getConfig(): PurchaseOrderWorkflowConfig

// Update configuration
updateConfig(updates: Partial<PurchaseOrderWorkflowConfig>): ConfigValidationResult

// Get approval threshold for amount
getApprovalThreshold(amount: number, conditions?: Record<string, any>): ApprovalThreshold | null

// Get required approvers for purchase order
getRequiredApprovers(purchaseOrder: PurchaseOrder): UserRole[]

// Check if auto-approval is allowed
canAutoApprove(purchaseOrder: PurchaseOrder): boolean

// Template management
getNotificationTemplate(event: NotificationEvent): NotificationTemplate | null
addNotificationTemplate(template: Omit<NotificationTemplate, 'id'>): string
updateNotificationTemplate(id: string, updates: Partial<NotificationTemplate>): boolean

// Approval threshold management
addApprovalThreshold(threshold: Omit<ApprovalThreshold, 'id'>): string
updateApprovalThreshold(id: string, updates: Partial<ApprovalThreshold>): boolean
removeApprovalThreshold(id: string): boolean

// Configuration import/export
exportConfig(): string
importConfig(configJson: string): ConfigValidationResult
resetToDefaults(): void

// Utilities
getConfigSummary(): ConfigurationSummary
generatePurchaseOrderNumber(): string
requiresHighValueApproval(amount: number): boolean

// Subscriptions
subscribe(callback: (config: PurchaseOrderWorkflowConfig) => void): () => void
```

### ApprovalThresholdService

Service for managing approval requests and decisions.

#### Methods

```typescript
// Create approval request
createApprovalRequest(
  purchaseOrder: PurchaseOrder,
  initiator: { userId: string; name: string; role: UserRole }
): Promise<ApprovalRequest | null>

// Submit approval decision
submitApproval(
  requestId: string,
  decision: {
    approved: boolean;
    approver: { userId: string; name: string; role: UserRole; email: string };
    reason?: string;
    comments?: string;
  }
): Promise<{ success: boolean; message: string; finalStatus?: string }>

// Retrieve approval requests
getApprovalRequest(requestId: string): ApprovalRequest | null
getApprovalRequestsForPO(purchaseOrderId: string): ApprovalRequest[]
getPendingApprovalsByRole(role: UserRole): ApprovalRequest[]

// Escalation management
getOverdueApprovals(): ApprovalRequest[]
processEscalations(): Promise<ApprovalEscalation[]>

// Bulk operations
bulkApprove(
  requestIds: string[],
  approver: { userId: string; name: string; role: UserRole; email: string },
  reason?: string
): Promise<{ successful: string[]; failed: { id: string; error: string }[] }>

// Statistics and maintenance
getApprovalStatistics(): ApprovalStatistics
cleanupOldRequests(olderThanDays?: number): number
subscribeToApprovals(callback: (request: ApprovalRequest) => void): () => void
```

### ReceivingToleranceService

Service for validating goods receiving against configured tolerances.

#### Methods

```typescript
// Main validation method
validateReceiving(
  receiptItems: ReceiptItem[],
  context: ReceivingContext
): ReceivingValidationResult

// Configuration management
getToleranceConfiguration(): ReceivingToleranceSettings
updateToleranceConfiguration(updates: Partial<ReceivingToleranceSettings>): boolean

// Statistics and recommendations
calculateReceivingStatistics(receiptItems: ReceiptItem[]): ReceivingStatistics
generateReceivingRecommendations(
  validation: ReceivingValidationResult,
  receiptItems: ReceiptItem[]
): string[]
```

### WorkflowNotificationService

Service for sending workflow-related notifications.

#### Methods

```typescript
// Send notification
sendWorkflowNotification(
  context: WorkflowNotificationContext,
  recipients: NotificationRecipient[]
): Promise<NotificationResult>
```

## Configuration Structure

### Main Configuration Object

```typescript
interface PurchaseOrderWorkflowConfig {
  approvalThresholds: ApprovalThreshold[];
  emailNotifications: EmailNotificationConfig;
  receivingSettings: ReceivingToleranceSettings;
  workflowCustomization: WorkflowCustomizationSettings;
  auditSettings: AuditConfiguration;
  systemSettings: PurchaseOrderSystemSettings;
  createdAt: Date;
  updatedAt: Date;
}
```

### Approval Thresholds

Define approval requirements based on purchase amount and conditions:

```typescript
interface ApprovalThreshold {
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
```

Example configuration:
```typescript
{
  id: 'medium-purchases',
  name: 'Medium Purchase Orders',
  minAmount: 10000,
  maxAmount: 50000,
  requiredRoles: ['manager', 'admin'],
  requiredApprovers: 2,
  escalationTimeHours: 48,
  skipWeekends: true,
  skipHolidays: true,
  priority: 'medium',
  autoApprove: false,
  isActive: true
}
```

### Email Notification Templates

Customize email content for different workflow events:

```typescript
interface NotificationTemplate {
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
```

Available events:
- `approval_request`
- `approval_granted`
- `approval_rejected`
- `approval_overdue`
- `status_change`
- `receiving_reminder`
- `receiving_overdue`
- `bulk_approval`
- `partial_receipt`
- `full_receipt`
- `po_cancelled`
- `po_closed`
- `price_variance_alert`
- `over_receipt_warning`
- `under_receipt_warning`

### Receiving Tolerance Settings

Control how over/under deliveries are handled:

```typescript
interface ToleranceConfig {
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
```

## Usage Examples

### Setting Up Approval Thresholds

```typescript
import { purchaseOrderWorkflowConfigService } from './services/purchaseOrderWorkflowConfigService';

// Add a new approval threshold
const thresholdId = purchaseOrderWorkflowConfigService.addApprovalThreshold({
  name: 'High Value Purchases',
  minAmount: 100000,
  maxAmount: null,
  requiredRoles: ['admin'],
  requiredApprovers: 2,
  escalationTimeHours: 72,
  skipWeekends: true,
  skipHolidays: true,
  priority: 'urgent',
  autoApprove: false,
  isActive: true
});

// Update existing threshold
purchaseOrderWorkflowConfigService.updateApprovalThreshold(thresholdId, {
  requiredApprovers: 3
});
```

### Creating Approval Request

```typescript
import { approvalThresholdService } from './services/approvalThresholdService';

const purchaseOrder: PurchaseOrder = {
  id: 'po-001',
  total: 25000,
  // ... other properties
};

const initiator = {
  userId: 'user-123',
  name: 'John Smith',
  role: 'employee' as UserRole
};

const request = await approvalThresholdService.createApprovalRequest(purchaseOrder, initiator);

if (request) {
  console.log(`Approval request created: ${request.id}`);
  console.log(`Required approvals: ${request.requiredApprovals}`);
}
```

### Submitting Approval Decision

```typescript
const decision = {
  approved: true,
  approver: {
    userId: 'mgr-001',
    name: 'Purchase Manager',
    role: 'manager' as UserRole,
    email: 'manager@company.com'
  },
  reason: 'Approved for operational necessity',
  comments: 'Verified budget availability'
};

const result = await approvalThresholdService.submitApproval(request.id, decision);

if (result.success) {
  console.log(result.message);
  if (result.finalStatus) {
    console.log(`Final status: ${result.finalStatus}`);
  }
}
```

### Validating Goods Receipt

```typescript
import { receivingToleranceService } from './services/receivingToleranceService';

const receiptItems: ReceiptItem[] = [
  {
    purchaseOrderItemId: 'item-1',
    productId: 'product-1',
    productName: 'Office Chairs',
    orderedQuantity: 100,
    receivedQuantity: 105, // 5% over-received
    previouslyReceivedQuantity: 0,
    condition: 'good'
  }
];

const context: ReceivingContext = {
  purchaseOrder,
  receivingUser: {
    userId: 'receiver-1',
    name: 'John Receiver',
    role: 'employee'
  },
  receiptDate: new Date(),
  isPartialReceipt: false,
  previousReceiptsCount: 0
};

const validation = receivingToleranceService.validateReceiving(receiptItems, context);

if (!validation.isValid) {
  console.log('Validation failed:');
  validation.errors.forEach(error => console.log(`- ${error.message}`));
} else if (validation.requiresApproval) {
  console.log('Receipt requires approval from:', validation.requiredRoles);
}
```

### Sending Workflow Notifications

```typescript
import { workflowNotificationService } from './services/workflowNotificationService';

const context: WorkflowNotificationContext = {
  purchaseOrder,
  event: 'approval_request',
  actor: {
    userId: 'user-123',
    name: 'John Smith',
    email: 'john@company.com',
    role: 'employee'
  }
};

const recipients: NotificationRecipient[] = [
  {
    email: 'manager@company.com',
    name: 'Purchase Manager',
    role: 'manager'
  }
];

const result = await workflowNotificationService.sendWorkflowNotification(context, recipients);

if (result.success) {
  console.log(`Notification sent to ${result.recipients.length} recipients`);
} else {
  console.error('Notification failed:', result.error);
}
```

## Configuration Management

### Exporting Configuration

```typescript
const configJson = purchaseOrderWorkflowConfigService.exportConfig();
// Save to file or send to another system
```

### Importing Configuration

```typescript
const configJson = '{"approvalThresholds": [...], ...}';
const result = purchaseOrderWorkflowConfigService.importConfig(configJson);

if (!result.isValid) {
  console.log('Import failed:');
  result.errors.forEach(error => console.log(`- ${error.message}`));
}
```

### Resetting to Defaults

```typescript
purchaseOrderWorkflowConfigService.resetToDefaults();
```

## React Component Integration

### Workflow Configuration Panel

```typescript
import { WorkflowConfigurationPanel } from './components/purchases/WorkflowConfigurationPanel';

function PurchaseOrderSettings() {
  const handleConfigChange = (config: PurchaseOrderWorkflowConfig) => {
    console.log('Configuration updated:', config);
  };

  return (
    <div>
      <h1>Purchase Order Workflow Settings</h1>
      <WorkflowConfigurationPanel onConfigChange={handleConfigChange} />
    </div>
  );
}
```

## Error Handling

All services return structured error information:

```typescript
interface ConfigValidationResult {
  isValid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationWarning[];
}

interface ReceivingValidationResult {
  isValid: boolean;
  canProceed: boolean;
  requiresApproval: boolean;
  requiredRoles: UserRole[];
  errors: ReceivingValidationError[];
  warnings: ReceivingValidationWarning[];
  adjustments?: ReceivingAdjustment[];
}
```

## Performance Considerations

- Configuration data is cached in localStorage for fast access
- Validation operations are performed client-side to minimize server requests
- Batch operations are available for processing multiple approvals
- Cleanup methods are provided for removing old data

## Security Features

- Role-based access control for all operations
- Audit logging for sensitive actions
- Data encryption for sensitive configuration values
- IP whitelisting support
- Session timeout controls

## Testing

Comprehensive test suites are provided for all services:

```bash
# Run all workflow configuration tests
npm test src/test/unit/services/purchaseOrderWorkflowConfigService.test.ts
npm test src/test/unit/services/approvalThresholdService.test.ts
npm test src/test/unit/services/receivingToleranceService.test.ts
npm test src/test/unit/services/workflowNotificationService.test.ts
```

## Migration Guide

When upgrading from older versions:

1. Export existing configuration before upgrade
2. Run database migrations to add new fields
3. Import configuration and validate against new schema
4. Test approval workflows with sample data
5. Train users on new configuration interface

## Troubleshooting

Common issues and solutions:

**Configuration not saving:**
- Check localStorage quota
- Verify configuration validation passes
- Check browser console for errors

**Approvals not working:**
- Verify approval thresholds are properly configured
- Check user roles and permissions
- Review escalation settings

**Notifications not sending:**
- Verify templates are active
- Check notification configuration
- Review recipient email addresses

**Receiving validation failing:**
- Check tolerance settings
- Verify quality check configuration
- Review damage handling settings

For more detailed troubleshooting, check the service-specific error messages and validation results.