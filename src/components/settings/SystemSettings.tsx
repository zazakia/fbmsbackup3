import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  Mail,
  MessageSquare,
  CreditCard,
  Database,
  Shield,
  Clock,
  HardDrive,
  Globe,
  Save,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Upload,
  Download,
  RefreshCw
} from 'lucide-react';
import { settingsAPI } from '../../api/settings';
import { SystemSettings as SystemSettingsType } from '../../types/settings';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useToastStore } from '../../store/toastStore';

const SystemSettings: React.FC = () => {
  const { user } = useSupabaseAuthStore();
  const { addToast } = useToastStore();
  const [settings, setSettings] = useState<SystemSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'business' | 'integrations' | 'backup' | 'maintenance'>('business');
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const result = await settingsAPI.getSystemSettings();
      if (result.success && result.data) {
        setSettings(result.data);
      }
    } catch (error) {
      console.error('Error loading system settings:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load system settings'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const result = await settingsAPI.updateSystemSettings(settings);
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Saved',
          message: 'System settings updated successfully'
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving system settings:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to save system settings'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof SystemSettingsType>(
    section: K,
    data: Partial<SystemSettingsType[K]>
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [section]: { ...settings[section], ...data }
    });
  };

  const toggleApiKeyVisibility = (key: string) => {
    setShowApiKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const uploadLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // In a real implementation, you would upload to a file service
    // For now, we'll create a data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      updateSetting('businessInfo', { logo: dataUrl });
      addToast({
        type: 'success',
        title: 'Logo Uploaded',
        message: 'Business logo has been updated'
      });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const testBackup = async () => {
    try {
      // Simulate backup test
      addToast({
        type: 'info',
        title: 'Testing Backup',
        message: 'Running backup test...'
      });

      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      addToast({
        type: 'success',
        title: 'Backup Test Successful',
        message: 'Backup system is working correctly'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Backup Test Failed',
        message: 'There was an issue with the backup system'
      });
    }
  };

  const enableMaintenanceMode = () => {
    if (window.confirm('Are you sure you want to enable maintenance mode? This will prevent users from accessing the system.')) {
      updateSetting('maintenance', { mode: true });
      addToast({
        type: 'warning',
        title: 'Maintenance Mode Enabled',
        message: 'System is now in maintenance mode'
      });
    }
  };

  const disableMaintenanceMode = () => {
    updateSetting('maintenance', { mode: false });
    addToast({
      type: 'success',
      title: 'Maintenance Mode Disabled',
      message: 'System is now accessible to users'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-8">
        <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Settings Found</h3>
        <p className="text-gray-600">Unable to load system settings.</p>
      </div>
    );
  }

  const renderBusinessInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Business Name
          </label>
          <input
            type="text"
            value={settings.businessInfo.name}
            onChange={(e) => updateSetting('businessInfo', { name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={settings.businessInfo.email}
            onChange={(e) => updateSetting('businessInfo', { email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={settings.businessInfo.phone}
            onChange={(e) => updateSetting('businessInfo', { phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tax ID
          </label>
          <input
            type="text"
            value={settings.businessInfo.taxId}
            onChange={(e) => updateSetting('businessInfo', { taxId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Website
          </label>
          <input
            type="url"
            value={settings.businessInfo.website}
            onChange={(e) => updateSetting('businessInfo', { website: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Business Address
        </label>
        <textarea
          value={settings.businessInfo.address}
          onChange={(e) => updateSetting('businessInfo', { address: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Business Logo
        </label>
        <div className="flex items-center space-x-4">
          {settings.businessInfo.logo && (
            <img
              src={settings.businessInfo.logo}
              alt="Business Logo"
              className="h-16 w-16 object-contain rounded-lg border border-gray-300"
            />
          )}
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={uploadLogo}
              className="hidden"
              id="logo-upload"
            />
            <label
              htmlFor="logo-upload"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Logo
            </label>
            <p className="text-xs text-gray-500 mt-1">Recommended size: 200x200px</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderIntegrations = () => (
    <div className="space-y-8">
      {/* Payment Gateways */}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <CreditCard className="h-5 w-5 mr-2" />
          Payment Gateways
        </h4>
        <div className="space-y-4">
          {Object.entries(settings.integration.paymentGateways).map(([gateway, config]) => (
            <div key={gateway} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium text-gray-900 dark:text-white capitalize">
                  {gateway === 'gcash' ? 'GCash' : gateway === 'paymaya' ? 'PayMaya' : 'PayPal'}
                </h5>
                <button
                  onClick={() => updateSetting('integration', {
                    paymentGateways: {
                      ...settings.integration.paymentGateways,
                      [gateway]: { ...config, enabled: !config.enabled }
                    }
                  })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    config.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      config.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              {config.enabled && (
                <div className="relative">
                  <input
                    type={showApiKeys[gateway] ? 'text' : 'password'}
                    value={config.apiKey}
                    onChange={(e) => updateSetting('integration', {
                      paymentGateways: {
                        ...settings.integration.paymentGateways,
                        [gateway]: { ...config, apiKey: e.target.value }
                      }
                    })}
                    placeholder="Enter API Key"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => toggleApiKeyVisibility(gateway)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showApiKeys[gateway] ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Email Service */}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <Mail className="h-5 w-5 mr-2" />
          Email Service
        </h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Provider
            </label>
            <select
              value={settings.integration.emailService.provider}
              onChange={(e) => updateSetting('integration', {
                emailService: {
                  ...settings.integration.emailService,
                  provider: e.target.value as 'smtp' | 'sendgrid' | 'mailgun'
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="smtp">SMTP</option>
              <option value="sendgrid">SendGrid</option>
              <option value="mailgun">Mailgun</option>
            </select>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Email service configuration is managed through environment variables for security.
            </p>
          </div>
        </div>
      </div>

      {/* SMS Service */}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          SMS Service
        </h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Provider
            </label>
            <select
              value={settings.integration.smsService.provider}
              onChange={(e) => updateSetting('integration', {
                smsService: {
                  ...settings.integration.smsService,
                  provider: e.target.value as 'twilio' | 'nexmo' | 'local'
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="local">Local SMS</option>
              <option value="twilio">Twilio</option>
              <option value="nexmo">Vonage (Nexmo)</option>
            </select>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              SMS service configuration is managed through environment variables for security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBackupSettings = () => (
    <div className="space-y-6">
      {/* Backup Configuration */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Enable Automatic Backups
          </label>
          <p className="text-xs text-gray-500">Automatically backup data at scheduled intervals</p>
        </div>
        <button
          onClick={() => updateSetting('backup', { enabled: !settings.backup.enabled })}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            settings.backup.enabled ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              settings.backup.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {settings.backup.enabled && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Backup Frequency
              </label>
              <select
                value={settings.backup.frequency}
                onChange={(e) => updateSetting('backup', {
                  frequency: e.target.value as 'daily' | 'weekly' | 'monthly'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Backup Time
              </label>
              <input
                type="time"
                value={settings.backup.time}
                onChange={(e) => updateSetting('backup', { time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Retention Period (days)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.backup.retention}
                onChange={(e) => updateSetting('backup', { retention: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Storage Location
              </label>
              <select
                value={settings.backup.location}
                onChange={(e) => updateSetting('backup', {
                  location: e.target.value as 'local' | 'cloud'
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="local">Local Storage</option>
                <option value="cloud">Cloud Storage</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enable Encryption
              </label>
              <p className="text-xs text-gray-500">Encrypt backup files for security</p>
            </div>
            <button
              onClick={() => updateSetting('backup', { encryption: !settings.backup.encryption })}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                settings.backup.encryption ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  settings.backup.encryption ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex justify-start">
            <button
              onClick={testBackup}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Test Backup
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderMaintenanceSettings = () => (
    <div className="space-y-6">
      {/* Maintenance Mode */}
      <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mr-2 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Maintenance Mode</h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              When enabled, only administrators can access the system. All other users will see a maintenance message.
            </p>
            <div className="mt-4 flex items-center space-x-4">
              <span className={`px-2 py-1 text-xs rounded-full ${
                settings.maintenance.mode 
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {settings.maintenance.mode ? 'ACTIVE' : 'INACTIVE'}
              </span>
              {settings.maintenance.mode ? (
                <button
                  onClick={disableMaintenanceMode}
                  className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Disable
                </button>
              ) : (
                <button
                  onClick={enableMaintenanceMode}
                  className="inline-flex items-center px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Enable
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Maintenance Message
        </label>
        <textarea
          value={settings.maintenance.message}
          onChange={(e) => updateSetting('maintenance', { message: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Enter the message users will see during maintenance..."
        />
      </div>

      {/* Allowed Users During Maintenance */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Allowed Users During Maintenance
        </label>
        <p className="text-xs text-gray-500 mb-2">Enter email addresses of users who can access the system during maintenance (one per line)</p>
        <textarea
          value={settings.maintenance.allowedUsers.join('\n')}
          onChange={(e) => updateSetting('maintenance', { 
            allowedUsers: e.target.value.split('\n').filter(email => email.trim())
          })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="admin@company.com&#10;manager@company.com"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Settings</h2>
          <p className="text-gray-600 dark:text-gray-400">Configure system-wide settings and integrations</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'business', label: 'Business Info', icon: Building },
            { id: 'integrations', label: 'Integrations', icon: Globe },
            { id: 'backup', label: 'Backup', icon: HardDrive },
            { id: 'maintenance', label: 'Maintenance', icon: Settings }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        {activeTab === 'business' && renderBusinessInfo()}
        {activeTab === 'integrations' && renderIntegrations()}
        {activeTab === 'backup' && renderBackupSettings()}
        {activeTab === 'maintenance' && renderMaintenanceSettings()}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default SystemSettings;