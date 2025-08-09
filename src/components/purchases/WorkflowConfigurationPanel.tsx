import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  AlertTriangle, 
  Check, 
  Upload, 
  Download,
  RefreshCw,
  Mail,
  Shield,
  Package,
  Zap
} from 'lucide-react';
import {
  PurchaseOrderWorkflowConfig,
  ApprovalThreshold,
  NotificationTemplate,
  ReceivingToleranceSettings,
  AutomationRule,
  ValidationRule,
  BusinessRule,
  ConfigValidationResult
} from '../../types/purchaseOrderConfig';
import { UserRole } from '../../types/auth';
import { purchaseOrderWorkflowConfigService } from '../../services/purchaseOrderWorkflowConfigService';

interface WorkflowConfigurationPanelProps {
  onConfigChange?: (config: PurchaseOrderWorkflowConfig) => void;
}

type ConfigSection = 
  | 'approval-thresholds' 
  | 'notifications' 
  | 'receiving-tolerance' 
  | 'automation-rules'
  | 'validation-rules'
  | 'business-rules'
  | 'system-settings';

export const WorkflowConfigurationPanel: React.FC<WorkflowConfigurationPanelProps> = ({
  onConfigChange
}) => {
  const [config, setConfig] = useState<PurchaseOrderWorkflowConfig | null>(null);
  const [activeSection, setActiveSection] = useState<ConfigSection>('approval-thresholds');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [validationResult, setValidationResult] = useState<ConfigValidationResult | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState('');

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setIsLoading(true);
      const currentConfig = purchaseOrderWorkflowConfigService.getConfig();
      setConfig(currentConfig);
      onConfigChange?.(currentConfig);
    } catch (error) {
      console.error('Failed to load configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfiguration = async () => {
    if (!config) return;

    try {
      setIsSaving(true);
      const result = purchaseOrderWorkflowConfigService.updateConfig(config);
      setValidationResult(result);
      
      if (result.isValid) {
        onConfigChange?.(config);
        // Show success message
        console.log('Configuration saved successfully');
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      purchaseOrderWorkflowConfigService.resetToDefaults();
      loadConfiguration();
    }
  };

  const exportConfiguration = () => {
    if (!config) return;

    const exported = purchaseOrderWorkflowConfigService.exportConfig();
    const blob = new Blob([exported], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchase-order-workflow-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importConfiguration = () => {
    try {
      const result = purchaseOrderWorkflowConfigService.importConfig(importData);
      setValidationResult(result);
      
      if (result.isValid) {
        loadConfiguration();
        setShowImportDialog(false);
        setImportData('');
      }
    } catch (error) {
      console.error('Failed to import configuration:', error);
    }
  };

  const updateConfig = <K extends keyof PurchaseOrderWorkflowConfig>(
    key: K,
    value: PurchaseOrderWorkflowConfig[K]
  ) => {
    if (!config) return;
    
    setConfig({
      ...config,
      [key]: value
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading configuration...</span>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration Error</h3>
        <p className="text-gray-600 mb-4">Failed to load workflow configuration.</p>
        <button
          onClick={loadConfiguration}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const sectionTabs = [
    { id: 'approval-thresholds', name: 'Approval Thresholds', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Mail },
    { id: 'receiving-tolerance', name: 'Receiving Tolerance', icon: Package },
    { id: 'automation-rules', name: 'Automation', icon: Zap },
    { id: 'validation-rules', name: 'Validation', icon: Check },
    { id: 'business-rules', name: 'Business Rules', icon: Settings },
    { id: 'system-settings', name: 'System', icon: Settings }
  ] as const;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Settings className="h-6 w-6 text-gray-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900">
              Purchase Order Workflow Configuration
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportConfiguration}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </button>
            <button
              onClick={() => setShowImportDialog(true)}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Upload className="h-4 w-4 mr-1" />
              Import
            </button>
            <button
              onClick={resetToDefaults}
              className="flex items-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reset
            </button>
            <button
              onClick={saveConfiguration}
              disabled={isSaving}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Validation Messages */}
      {validationResult && (
        <div className="px-6 py-3 border-b border-gray-200">
          {validationResult.errors.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center text-red-700 mb-2">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="font-medium">Configuration Errors</span>
              </div>
              <ul className="text-sm text-red-600 space-y-1">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>• {error.message}</li>
                ))}
              </ul>
            </div>
          )}
          {validationResult.warnings.length > 0 && (
            <div>
              <div className="flex items-center text-yellow-700 mb-2">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="font-medium">Warnings</span>
              </div>
              <ul className="text-sm text-yellow-600 space-y-1">
                {validationResult.warnings.map((warning, index) => (
                  <li key={index}>• {warning.message}</li>
                ))}
              </ul>
            </div>
          )}
          {validationResult.isValid && (
            <div className="flex items-center text-green-700">
              <Check className="h-4 w-4 mr-2" />
              <span className="font-medium">Configuration is valid</span>
            </div>
          )}
        </div>
      )}

      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="w-64 border-r border-gray-200 bg-gray-50">
          <nav className="space-y-1 p-4">
            {sectionTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-3" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6">
          {activeSection === 'approval-thresholds' && (
            <ApprovalThresholdsSection
              thresholds={config.approvalThresholds}
              onChange={(thresholds) => updateConfig('approvalThresholds', thresholds)}
            />
          )}
          
          {activeSection === 'notifications' && (
            <NotificationsSection
              notifications={config.emailNotifications}
              onChange={(notifications) => updateConfig('emailNotifications', notifications)}
            />
          )}
          
          {activeSection === 'receiving-tolerance' && (
            <ReceivingToleranceSection
              settings={config.receivingSettings}
              onChange={(settings) => updateConfig('receivingSettings', settings)}
            />
          )}
          
          {activeSection === 'automation-rules' && (
            <AutomationRulesSection
              rules={config.workflowCustomization.automationRules}
              onChange={(rules) => {
                updateConfig('workflowCustomization', {
                  ...config.workflowCustomization,
                  automationRules: rules
                });
              }}
            />
          )}
          
          {activeSection === 'validation-rules' && (
            <ValidationRulesSection
              rules={config.workflowCustomization.validationRules}
              onChange={(rules) => {
                updateConfig('workflowCustomization', {
                  ...config.workflowCustomization,
                  validationRules: rules
                });
              }}
            />
          )}
          
          {activeSection === 'business-rules' && (
            <BusinessRulesSection
              rules={config.workflowCustomization.businessRules}
              onChange={(rules) => {
                updateConfig('workflowCustomization', {
                  ...config.workflowCustomization,
                  businessRules: rules
                });
              }}
            />
          )}
          
          {activeSection === 'system-settings' && (
            <SystemSettingsSection
              settings={config.systemSettings}
              onChange={(settings) => updateConfig('systemSettings', settings)}
            />
          )}
        </div>
      </div>

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-96">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">Import Configuration</h3>
              <button
                onClick={() => setShowImportDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste configuration JSON here..."
                className="w-full h-32 border border-gray-300 rounded-md p-2 text-sm font-mono"
              />
            </div>
            <div className="flex justify-end space-x-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowImportDialog(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={importConfiguration}
                disabled={!importData.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Individual section components would be implemented here
// For brevity, I'm including just the interfaces for now

interface ApprovalThresholdsSectionProps {
  thresholds: ApprovalThreshold[];
  onChange: (thresholds: ApprovalThreshold[]) => void;
}

const ApprovalThresholdsSection: React.FC<ApprovalThresholdsSectionProps> = ({
  thresholds,
  onChange
}) => {
  const [editingThreshold, setEditingThreshold] = useState<ApprovalThreshold | null>(null);

  const addThreshold = () => {
    const newThreshold: ApprovalThreshold = {
      id: `threshold_${Date.now()}`,
      name: 'New Threshold',
      minAmount: 0,
      maxAmount: null,
      requiredRoles: ['manager' as UserRole],
      requiredApprovers: 1,
      escalationTimeHours: 24,
      skipWeekends: true,
      skipHolidays: true,
      priority: 'medium',
      autoApprove: false,
      isActive: true
    };
    
    onChange([...thresholds, newThreshold]);
    setEditingThreshold(newThreshold);
  };

  const updateThreshold = (updatedThreshold: ApprovalThreshold) => {
    onChange(thresholds.map(t => t.id === updatedThreshold.id ? updatedThreshold : t));
    setEditingThreshold(null);
  };

  const deleteThreshold = (id: string) => {
    if (window.confirm('Are you sure you want to delete this threshold?')) {
      onChange(thresholds.filter(t => t.id !== id));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Approval Thresholds</h3>
        <button
          onClick={addThreshold}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Threshold
        </button>
      </div>

      <div className="space-y-4">
        {thresholds.map((threshold) => (
          <div key={threshold.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{threshold.name}</h4>
                <p className="text-sm text-gray-600">
                  {threshold.minAmount} - {threshold.maxAmount ?? '∞'} PHP
                  • {threshold.requiredApprovers} approver(s)
                  • {threshold.requiredRoles.join(', ')}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEditingThreshold(threshold)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteThreshold(threshold.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Threshold editing modal would go here */}
    </div>
  );
};

// Placeholder components for other sections
const NotificationsSection: React.FC<{
  notifications: any;
  onChange: (notifications: any) => void;
}> = () => <div>Notifications configuration coming soon...</div>;

const ReceivingToleranceSection: React.FC<{
  settings: ReceivingToleranceSettings;
  onChange: (settings: ReceivingToleranceSettings) => void;
}> = () => <div>Receiving tolerance configuration coming soon...</div>;

const AutomationRulesSection: React.FC<{
  rules: AutomationRule[];
  onChange: (rules: AutomationRule[]) => void;
}> = () => <div>Automation rules configuration coming soon...</div>;

const ValidationRulesSection: React.FC<{
  rules: ValidationRule[];
  onChange: (rules: ValidationRule[]) => void;
}> = () => <div>Validation rules configuration coming soon...</div>;

const BusinessRulesSection: React.FC<{
  rules: BusinessRule[];
  onChange: (rules: BusinessRule[]) => void;
}> = () => <div>Business rules configuration coming soon...</div>;

const SystemSettingsSection: React.FC<{
  settings: any;
  onChange: (settings: any) => void;
}> = () => <div>System settings configuration coming soon...</div>;

export default WorkflowConfigurationPanel;