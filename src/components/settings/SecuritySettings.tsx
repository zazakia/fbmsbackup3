import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Key,
  Smartphone,
  Clock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Save,
  RefreshCw,
  Download,
  Trash2,
  Globe,
  Activity,
  RotateCcw
} from 'lucide-react';
import { settingsAPI } from '../../api/settings';
import { UserSettings, SecuritySettings as SecuritySettingsType } from '../../types/settings';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useToastStore } from '../../store/toastStore';
import { resetAllAuthTokens, resetPasswordTokens, resetSessionTokens, devResetAllTokens, checkTokenStatus } from '../../utils/tokenReset';

const SecuritySettings: React.FC = () => {
  const { user } = useSupabaseAuthStore();
  const { addToast } = useToastStore();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'password' | '2fa' | 'audit' | 'tokens'>('general');
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [newIpAddress, setNewIpAddress] = useState('');
  const [resetingTokens, setResetingTokens] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const result = await settingsAPI.getUserSettings(user.id);
      if (result.success && result.data) {
        setSettings(result.data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load security settings'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!user?.id || !settings) return;

    setSaving(true);
    try {
      const result = await settingsAPI.updateSettingsSection(user.id, {
        section: 'security',
        data: settings.security
      });

      if (result.success) {
        addToast({
          type: 'success',
          title: 'Saved',
          message: 'Security settings updated successfully'
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to save security settings'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSecuritySetting = <K extends keyof SecuritySettingsType>(
    key: K,
    value: SecuritySettingsType[K]
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      security: { ...settings.security, [key]: value }
    });
  };

  const generateBackupCodes = () => {
    const codes = Array.from({ length: 8 }, () => 
      Math.random().toString(36).substring(2, 8).toUpperCase()
    );
    
    updateSecuritySetting('twoFactorAuth', {
      ...settings!.security.twoFactorAuth,
      backupCodes: codes
    });

    addToast({
      type: 'success',
      title: 'Backup Codes Generated',
      message: 'New backup codes have been generated. Please save them securely.'
    });
  };

  const downloadBackupCodes = () => {
    if (!settings?.security.twoFactorAuth.backupCodes.length) return;

    const content = `FBMS Two-Factor Authentication Backup Codes
Generated: ${new Date().toLocaleString()}

${settings.security.twoFactorAuth.backupCodes.map((code, index) => 
  `${index + 1}. ${code}`
).join('\n')}

Important: 
- Keep these codes in a safe place
- Each code can only be used once
- Generate new codes if you lose these`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fbms-backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const changePassword = async () => {
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Please fill in all password fields'
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'New passwords do not match'
      });
      return;
    }

    if (passwordForm.newPassword.length < settings!.security.passwordPolicy.minLength) {
      addToast({
        type: 'error',
        title: 'Error',
        message: `Password must be at least ${settings!.security.passwordPolicy.minLength} characters long`
      });
      return;
    }

    // Validate password policy
    const { passwordPolicy } = settings!.security;
    const password = passwordForm.newPassword;
    
    if (passwordPolicy.requireUppercase && !/[A-Z]/.test(password)) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Password must contain at least one uppercase letter'
      });
      return;
    }

    if (passwordPolicy.requireLowercase && !/[a-z]/.test(password)) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Password must contain at least one lowercase letter'
      });
      return;
    }

    if (passwordPolicy.requireNumbers && !/\d/.test(password)) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Password must contain at least one number'
      });
      return;
    }

    if (passwordPolicy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Password must contain at least one special character'
      });
      return;
    }

    try {
      // In a real implementation, you would call an API to change the password
      // For now, we'll just simulate success
      addToast({
        type: 'success',
        title: 'Password Changed',
        message: 'Your password has been updated successfully'
      });
      
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to change password'
      });
    }
  };

  const addIpAddress = () => {
    if (!newIpAddress.trim()) return;

    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(newIpAddress.trim())) {
      addToast({
        type: 'error',
        title: 'Invalid IP',
        message: 'Please enter a valid IP address'
      });
      return;
    }

    const currentAddresses = settings!.security.ipWhitelist.addresses;
    if (currentAddresses.includes(newIpAddress.trim())) {
      addToast({
        type: 'error',
        title: 'Duplicate IP',
        message: 'This IP address is already in the whitelist'
      });
      return;
    }

    updateSecuritySetting('ipWhitelist', {
      ...settings!.security.ipWhitelist,
      addresses: [...currentAddresses, newIpAddress.trim()]
    });

    setNewIpAddress('');
    addToast({
      type: 'success',
      title: 'IP Added',
      message: 'IP address added to whitelist'
    });
  };

  const removeIpAddress = (index: number) => {
    const newAddresses = settings!.security.ipWhitelist.addresses.filter((_, i) => i !== index);
    updateSecuritySetting('ipWhitelist', {
      ...settings!.security.ipWhitelist,
      addresses: newAddresses
    });

    addToast({
      type: 'success',
      title: 'IP Removed',
      message: 'IP address removed from whitelist'
    });
  };

  // Token reset handlers
  const handlePasswordTokenReset = async () => {
    setResetingTokens(true);
    try {
      const result = resetPasswordTokens();
      addToast({
        type: result.success ? 'success' : 'error',
        title: result.success ? 'Tokens Reset' : 'Reset Failed',
        message: result.message
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Reset Failed',
        message: 'Failed to reset password tokens'
      });
    } finally {
      setResetingTokens(false);
    }
  };

  const handleAllTokenReset = async () => {
    if (!confirm('This will reset all authentication tokens and clear stored auth data. Are you sure?')) {
      return;
    }

    setResetingTokens(true);
    try {
      const result = resetAllAuthTokens();
      addToast({
        type: result.success ? 'success' : 'error',
        title: result.success ? 'All Tokens Reset' : 'Reset Failed',
        message: result.message
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Reset Failed',
        message: 'Failed to reset authentication tokens'
      });
    } finally {
      setResetingTokens(false);
    }
  };

  const handleSessionReset = async () => {
    if (!confirm('This will sign you out and reset all session tokens. You will need to log in again. Continue?')) {
      return;
    }

    setResetingTokens(true);
    try {
      const result = await resetSessionTokens();
      addToast({
        type: result.success ? 'success' : 'error',
        title: result.success ? 'Session Reset' : 'Reset Failed',
        message: result.message
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Reset Failed',
        message: 'Failed to reset session tokens'
      });
    } finally {
      setResetingTokens(false);
    }
  };

  const handleDevReset = async () => {
    if (!confirm('⚠️ DEVELOPMENT ONLY: This will completely reset the application and reload the page. Are you absolutely sure?')) {
      return;
    }

    setResetingTokens(true);
    try {
      const result = devResetAllTokens();
      addToast({
        type: result.success ? 'success' : 'error',
        title: result.success ? 'Complete Reset' : 'Reset Failed',
        message: result.message
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Reset Failed',
        message: 'Failed to reset application'
      });
    } finally {
      setResetingTokens(false);
    }
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
        <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Settings Found</h3>
        <p className="text-gray-600">Unable to load security settings.</p>
      </div>
    );
  }

  const { security } = settings;

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      {/* Session Timeout */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Session Timeout
        </label>
        <select
          value={security.sessionTimeout}
          onChange={(e) => updateSecuritySetting('sessionTimeout', parseInt(e.target.value) as 15 | 30 | 60 | 120 | 240)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
          <option value={120}>2 hours</option>
          <option value={240}>4 hours</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Automatically log out after this period of inactivity</p>
      </div>

      {/* Login Attempts */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Max Login Attempts
          </label>
          <input
            type="number"
            min="3"
            max="10"
            value={security.loginAttempts.maxAttempts}
            onChange={(e) => updateSecuritySetting('loginAttempts', {
              ...security.loginAttempts,
              maxAttempts: parseInt(e.target.value)
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Lockout Duration (minutes)
          </label>
          <input
            type="number"
            min="5"
            max="60"
            value={security.loginAttempts.lockoutDuration}
            onChange={(e) => updateSecuritySetting('loginAttempts', {
              ...security.loginAttempts,
              lockoutDuration: parseInt(e.target.value)
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      {/* Audit Log */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Enable Audit Logging
          </label>
          <p className="text-xs text-gray-500">Track all security-related activities</p>
        </div>
        <button
          onClick={() => updateSecuritySetting('auditLog', {
            ...security.auditLog,
            enabled: !security.auditLog.enabled
          })}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            security.auditLog.enabled ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              security.auditLog.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {security.auditLog.enabled && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Audit Log Retention (days)
          </label>
          <select
            value={security.auditLog.retention}
            onChange={(e) => updateSecuritySetting('auditLog', {
              ...security.auditLog,
              retention: parseInt(e.target.value) as 30 | 90 | 180 | 365
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
            <option value={365}>1 year</option>
          </select>
        </div>
      )}
    </div>
  );

  const renderPasswordSettings = () => (
    <div className="space-y-6">
      {/* Password Policy */}
      <div>
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Password Policy</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minimum Length
            </label>
            <input
              type="number"
              min="6"
              max="32"
              value={security.passwordPolicy.minLength}
              onChange={(e) => updateSecuritySetting('passwordPolicy', {
                ...security.passwordPolicy,
                minLength: parseInt(e.target.value)
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <div className="space-y-3">
            {[
              { key: 'requireUppercase', label: 'Require uppercase letters' },
              { key: 'requireLowercase', label: 'Require lowercase letters' },
              { key: 'requireNumbers', label: 'Require numbers' },
              { key: 'requireSpecialChars', label: 'Require special characters' }
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                <button
                  onClick={() => updateSecuritySetting('passwordPolicy', {
                    ...security.passwordPolicy,
                    [key]: !security.passwordPolicy[key as keyof typeof security.passwordPolicy]
                  })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    security.passwordPolicy[key as keyof typeof security.passwordPolicy] ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      security.passwordPolicy[key as keyof typeof security.passwordPolicy] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password Expiry (days)
            </label>
            <select
              value={security.passwordPolicy.expiryDays}
              onChange={(e) => updateSecuritySetting('passwordPolicy', {
                ...security.passwordPolicy,
                expiryDays: parseInt(e.target.value) as 30 | 60 | 90 | 365 | 0
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value={0}>Never</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={365}>1 year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Change Password</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <button
            onClick={changePassword}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Key className="h-4 w-4 mr-2" />
            Change Password
          </button>
        </div>
      </div>
    </div>
  );

  const render2FASettings = () => (
    <div className="space-y-6">
      {/* 2FA Enable/Disable */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Enable Two-Factor Authentication
          </label>
          <p className="text-xs text-gray-500">Add an extra layer of security to your account</p>
        </div>
        <button
          onClick={() => updateSecuritySetting('twoFactorAuth', {
            ...security.twoFactorAuth,
            enabled: !security.twoFactorAuth.enabled
          })}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            security.twoFactorAuth.enabled ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              security.twoFactorAuth.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {security.twoFactorAuth.enabled && (
        <>
          {/* 2FA Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Authentication Method
            </label>
            <select
              value={security.twoFactorAuth.method}
              onChange={(e) => updateSecuritySetting('twoFactorAuth', {
                ...security.twoFactorAuth,
                method: e.target.value as 'sms' | 'email' | 'app'
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="app">Authenticator App</option>
            </select>
          </div>

          {/* Backup Codes */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">Backup Codes</h4>
                <p className="text-xs text-gray-500">Use these codes if you lose access to your device</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={generateBackupCodes}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate
                </button>
                {security.twoFactorAuth.backupCodes.length > 0 && (
                  <button
                    onClick={downloadBackupCodes}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </button>
                )}
              </div>
            </div>

            {security.twoFactorAuth.backupCodes.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                  {security.twoFactorAuth.backupCodes.map((code, index) => (
                    <div key={index} className="text-gray-700 dark:text-gray-300">
                      {index + 1}. {code}
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded">
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  Save these codes in a secure location. Each code can only be used once.
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderTokenSettings = () => {
    const tokenStatus = checkTokenStatus();
    
    return (
      <div className="space-y-6">
        {/* Token Status Display */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white">Current Token Status</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Password Reset Token:</span>
              <span className={`px-2 py-1 rounded text-xs ${tokenStatus.hasPasswordReset ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                {tokenStatus.hasPasswordReset ? 'Active' : 'None'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Auth Session:</span>
              <span className={`px-2 py-1 rounded text-xs ${tokenStatus.hasAuthSession ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {tokenStatus.hasAuthSession ? 'Active' : 'None'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Stored Auth:</span>
              <span className={`px-2 py-1 rounded text-xs ${tokenStatus.hasStoredAuth ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                {tokenStatus.hasStoredAuth ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Storage Keys:</span>
              <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                {tokenStatus.localStorageKeys.length + tokenStatus.sessionStorageKeys.length}
              </span>
            </div>
          </div>
        </div>

        {/* Password Token Reset */}
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white">Password Reset Tokens</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Clear password reset tokens and pending password change requests.
              </p>
            </div>
            <button
              onClick={handlePasswordTokenReset}
              disabled={resetingTokens}
              className="inline-flex items-center px-3 py-2 bg-yellow-600 text-white text-sm font-medium rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Password Tokens
            </button>
          </div>
        </div>

        {/* All Auth Tokens Reset */}
        <div className="border border-orange-200 dark:border-orange-600 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white">Authentication Tokens</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Clear all authentication tokens, errors, and stored auth data (except current session).
              </p>
            </div>
            <button
              onClick={handleAllTokenReset}
              disabled={resetingTokens}
              className="inline-flex items-center px-3 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Auth Tokens
            </button>
          </div>
        </div>

        {/* Session Reset */}
        <div className="border border-red-200 dark:border-red-600 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white">Session Tokens</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Sign out and reset all session tokens. You will need to log in again.
              </p>
            </div>
            <button
              onClick={handleSessionReset}
              disabled={resetingTokens}
              className="inline-flex items-center px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Lock className="h-4 w-4 mr-2" />
              Reset Session
            </button>
          </div>
        </div>

        {/* Development Reset */}
        {import.meta.env.DEV && (
          <div className="border border-purple-200 dark:border-purple-600 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-purple-900 dark:text-purple-100">Complete Application Reset</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                  ⚠️ Development only: Reset everything and reload the page. Use with caution!
                </p>
              </div>
              <button
                onClick={handleDevReset}
                disabled={resetingTokens}
                className="inline-flex items-center px-3 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Complete Reset
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {resetingTokens && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-900 dark:text-white">Resetting tokens...</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderIPWhitelistSettings = () => (
    <div className="space-y-6">
      {/* IP Whitelist Enable/Disable */}
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Enable IP Whitelist
          </label>
          <p className="text-xs text-gray-500">Only allow access from specific IP addresses</p>
        </div>
        <button
          onClick={() => updateSecuritySetting('ipWhitelist', {
            ...security.ipWhitelist,
            enabled: !security.ipWhitelist.enabled
          })}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            security.ipWhitelist.enabled ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              security.ipWhitelist.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {security.ipWhitelist.enabled && (
        <>
          {/* Add IP Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add IP Address
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newIpAddress}
                onChange={(e) => setNewIpAddress(e.target.value)}
                placeholder="192.168.1.100"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <button
                onClick={addIpAddress}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* IP Address List */}
          {security.ipWhitelist.addresses.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Allowed IP Addresses</h4>
              <div className="space-y-2">
                {security.ipWhitelist.addresses.map((ip, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm font-mono text-gray-700 dark:text-gray-300">{ip}</span>
                    </div>
                    <button
                      onClick={() => removeIpAddress(index)}
                      className="text-red-600 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mr-2 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> Enabling IP whitelist will block access from all other IP addresses. 
                Make sure to add your current IP address before saving.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Security Settings</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage your account security and privacy</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'general', label: 'General', icon: Shield },
            { id: 'password', label: 'Password', icon: Lock },
            { id: '2fa', label: 'Two-Factor Auth', icon: Smartphone },
            { id: 'audit', label: 'IP Whitelist', icon: Globe },
            { id: 'tokens', label: 'Token Reset', icon: RotateCcw }
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
        {activeTab === 'general' && renderGeneralSettings()}
        {activeTab === 'password' && renderPasswordSettings()}
        {activeTab === '2fa' && render2FASettings()}
        {activeTab === 'audit' && renderIPWhitelistSettings()}
        {activeTab === 'tokens' && renderTokenSettings()}
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

export default SecuritySettings;