import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Clock,
  Volume2,
  VolumeX,
  Settings,
  TestTube,
  Save,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { settingsAPI } from '../../api/settings';
import { UserSettings, NotificationSettings as NotificationSettingsType } from '../../types/settings';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useToastStore } from '../../store/toastStore';

const NotificationSettings: React.FC = () => {
  const { user } = useSupabaseAuthStore();
  const { addToast } = useToastStore();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testNotificationSent, setTestNotificationSent] = useState(false);

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
        message: 'Failed to load notification settings'
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
        section: 'notifications',
        data: settings.notifications
      });

      if (result.success) {
        addToast({
          type: 'success',
          title: 'Saved',
          message: 'Notification settings updated successfully'
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to save notification settings'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateNotificationSetting = <K extends keyof NotificationSettingsType>(
    key: K,
    value: NotificationSettingsType[K]
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      notifications: { ...settings.notifications, [key]: value }
    });
  };

  const updateCategorySetting = (category: keyof NotificationSettingsType['categories'], enabled: boolean) => {
    if (!settings) return;
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        categories: {
          ...settings.notifications.categories,
          [category]: enabled
        }
      }
    });
  };

  const updateChannelSetting = (
    type: keyof NotificationSettingsType['channels'],
    channels: ('email' | 'push' | 'sms')[]
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        channels: {
          ...settings.notifications.channels,
          [type]: channels
        }
      }
    });
  };

  const sendTestNotification = () => {
    setTestNotificationSent(true);
    addToast({
      type: 'info',
      title: 'Test Notification',
      message: 'This is a test notification to verify your settings are working correctly.'
    });
    
    setTimeout(() => setTestNotificationSent(false), 3000);
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
        <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Settings Found</h3>
        <p className="text-gray-600">Unable to load notification settings.</p>
      </div>
    );
  }

  const { notifications } = settings;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Settings</h2>
          <p className="text-gray-600 dark:text-gray-400">Configure when and how you receive notifications</p>
        </div>
        <button
          onClick={sendTestNotification}
          disabled={testNotificationSent}
          className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium transition-colors ${
            testNotificationSent
              ? 'bg-green-100 text-green-700 border-green-300'
              : 'text-gray-700 bg-white hover:bg-gray-50'
          }`}
        >
          {testNotificationSent ? (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Test Sent
            </>
          ) : (
            <>
              <TestTube className="h-4 w-4 mr-2" />
              Send Test
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* General Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            General Settings
          </h3>

          <div className="space-y-6">
            {/* Master Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable All Notifications
                </label>
                <p className="text-xs text-gray-500">Master switch for all notifications</p>
              </div>
              <button
                onClick={() => updateNotificationSetting('enabled', !notifications.enabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  notifications.enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    notifications.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Delivery Methods */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Delivery Methods</h4>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Email Notifications</span>
                </div>
                <button
                  onClick={() => updateNotificationSetting('email', !notifications.email)}
                  disabled={!notifications.enabled}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    notifications.email && notifications.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  } ${!notifications.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      notifications.email && notifications.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Smartphone className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Push Notifications</span>
                </div>
                <button
                  onClick={() => updateNotificationSetting('push', !notifications.push)}
                  disabled={!notifications.enabled}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    notifications.push && notifications.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  } ${!notifications.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      notifications.push && notifications.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <MessageSquare className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">SMS Notifications</span>
                </div>
                <button
                  onClick={() => updateNotificationSetting('sms', !notifications.sms)}
                  disabled={!notifications.enabled}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    notifications.sms && notifications.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  } ${!notifications.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      notifications.sms && notifications.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notification Frequency
              </label>
              <select
                value={notifications.frequency}
                onChange={(e) => updateNotificationSetting('frequency', e.target.value as 'immediate' | 'hourly' | 'daily' | 'weekly')}
                disabled={!notifications.enabled}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                  !notifications.enabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <option value="immediate">Immediate</option>
                <option value="hourly">Hourly Summary</option>
                <option value="daily">Daily Summary</option>
                <option value="weekly">Weekly Summary</option>
              </select>
            </div>

            {/* Quiet Hours */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quiet Hours
                  </label>
                  <p className="text-xs text-gray-500">Suppress notifications during these hours</p>
                </div>
                <button
                  onClick={() => updateNotificationSetting('quietHours', {
                    ...notifications.quietHours,
                    enabled: !notifications.quietHours.enabled
                  })}
                  disabled={!notifications.enabled}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    notifications.quietHours.enabled && notifications.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  } ${!notifications.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      notifications.quietHours.enabled && notifications.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {notifications.quietHours.enabled && notifications.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={notifications.quietHours.start}
                      onChange={(e) => updateNotificationSetting('quietHours', {
                        ...notifications.quietHours,
                        start: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                    <input
                      type="time"
                      value={notifications.quietHours.end}
                      onChange={(e) => updateNotificationSetting('quietHours', {
                        ...notifications.quietHours,
                        end: e.target.value
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notification Categories */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notification Categories
          </h3>

          <div className="space-y-4">
            {Object.entries(notifications.categories).map(([category, enabled]) => (
              <div key={category} className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                    {category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </label>
                  <p className="text-xs text-gray-500">
                    {category === 'system' && 'System updates and maintenance alerts'}
                    {category === 'inventory' && 'Stock levels and inventory changes'}
                    {category === 'sales' && 'New sales and transaction updates'}
                    {category === 'reports' && 'Generated reports and analytics'}
                    {category === 'security' && 'Security alerts and login notifications'}
                    {category === 'reminders' && 'Task reminders and deadlines'}
                    {category === 'marketing' && 'Marketing campaigns and promotions'}
                  </p>
                </div>
                <button
                  onClick={() => updateCategorySetting(category as keyof NotificationSettingsType['categories'], !enabled)}
                  disabled={!notifications.enabled}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    enabled && notifications.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  } ${!notifications.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      enabled && notifications.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Channel Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-6 flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Channel Preferences
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Choose how you want to receive different types of notifications</p>

        <div className="space-y-6">
          {Object.entries(notifications.channels).map(([type, channels]) => (
            <div key={type} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0 last:pb-0">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 capitalize">
                {type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </h4>
              <div className="flex flex-wrap gap-3">
                {(['email', 'push', 'sms'] as const).map((channel) => (
                  <label key={channel} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={channels.includes(channel)}
                      onChange={(e) => {
                        const newChannels = e.target.checked
                          ? [...channels, channel]
                          : channels.filter(c => c !== channel);
                        updateChannelSetting(type as keyof NotificationSettingsType['channels'], newChannels);
                      }}
                      disabled={!notifications.enabled || !notifications[channel]}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize flex items-center">
                      {channel === 'email' && <Mail className="h-4 w-4 mr-1" />}
                      {channel === 'push' && <Smartphone className="h-4 w-4 mr-1" />}
                      {channel === 'sms' && <MessageSquare className="h-4 w-4 mr-1" />}
                      {channel}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
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

export default NotificationSettings;