import React, { useState, useEffect } from 'react';
import { Monitor, Database, Wifi, Palette, Bell, Search, User, Smartphone, Save, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useToastStore } from '../../store/toastStore';
import { settingsAPI } from '../../api/settings';
import { DisplaySettings } from '../../types/settings';
import UserSettingsDiagnostic from './UserSettingsDiagnostic';

interface TopBarSettingsSectionProps {
  onSettingsChange?: (settings: DisplaySettings['topBar']) => void;
}

const TopBarSettingsSection: React.FC<TopBarSettingsSectionProps> = ({ onSettingsChange }) => {
  const { user } = useSupabaseAuthStore();
  const { addToast } = useToastStore();
  
  const [settings, setSettings] = useState<DisplaySettings['topBar']>({
    showDatabaseStatus: true,
    showSupabaseStatus: true,
    showThemeToggle: true,
    showNotifications: true,
    showSearch: true,
    showUserProfile: true,
    showMobileSearch: true,
  });
  
  const [originalSettings, setOriginalSettings] = useState<DisplaySettings['topBar']>(settings);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const topBarItems = [
    {
      key: 'showDatabaseStatus' as keyof DisplaySettings['topBar'],
      label: 'Database Status',
      description: 'Show database connection status indicator',
      icon: Database,
      category: 'System Status'
    },
    {
      key: 'showSupabaseStatus' as keyof DisplaySettings['topBar'],
      label: 'Supabase Status',
      description: 'Show Supabase connection indicator',
      icon: Wifi,
      category: 'System Status'
    },
    {
      key: 'showThemeToggle' as keyof DisplaySettings['topBar'],
      label: 'Theme Toggle',
      description: 'Show light/dark theme switcher',
      icon: Palette,
      category: 'Interface'
    },
    {
      key: 'showNotifications' as keyof DisplaySettings['topBar'],
      label: 'Notifications',
      description: 'Show notification bell icon',
      icon: Bell,
      category: 'Interface'
    },
    {
      key: 'showSearch' as keyof DisplaySettings['topBar'],
      label: 'Search Bar',
      description: 'Show desktop search functionality',
      icon: Search,
      category: 'Navigation'
    },
    {
      key: 'showMobileSearch' as keyof DisplaySettings['topBar'],
      label: 'Mobile Search',
      description: 'Show mobile search button',
      icon: Smartphone,
      category: 'Navigation'
    },
    {
      key: 'showUserProfile' as keyof DisplaySettings['topBar'],
      label: 'User Profile',
      description: 'Show user profile and logout button',
      icon: User,
      category: 'Account'
    },
  ];

  const categories = Array.from(new Set(topBarItems.map(item => item.category)));

  useEffect(() => {
    if (user) {
      loadUserSettings();
    }
  }, [user]);

  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  const loadUserSettings = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const result = await settingsAPI.getUserSettings(user.id);
      if (result.success && result.data) {
        const topBarSettings = result.data.display?.topBar || settings;
        setSettings(topBarSettings);
        setOriginalSettings(topBarSettings);
      } else {
        // If we can't load settings, use localStorage as fallback
        const savedSettings = localStorage.getItem(`topBarSettings_${user.id}`);
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            setSettings(parsed);
            setOriginalSettings(parsed);
          } catch {
            // If parsing fails, use defaults
            setSettings(settings);
            setOriginalSettings(settings);
          }
        }
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
      // Fallback to localStorage
      const savedSettings = localStorage.getItem(`topBarSettings_${user.id}`);
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings(parsed);
          setOriginalSettings(parsed);
        } catch {
          // If parsing fails, use defaults
          setSettings(settings);
          setOriginalSettings(settings);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (key: keyof DisplaySettings['topBar']) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // First get current settings to merge with
      const currentResult = await settingsAPI.getUserSettings(user.id);
      if (!currentResult.success || !currentResult.data) {
        // If we can't get current settings, still save to localStorage
        localStorage.setItem(`topBarSettings_${user.id}`, JSON.stringify(settings));
        setOriginalSettings(settings);
        onSettingsChange?.(settings);
        setLastSaved(new Date());
        addToast({
          type: 'warning',
          title: 'Settings Saved Locally',
          message: 'Settings saved to local storage. Database sync may be unavailable.'
        });
        return;
      }

      // Update the display settings with new topBar settings
      const updatedDisplaySettings = {
        ...currentResult.data.display,
        topBar: settings
      };

      const result = await settingsAPI.updateUserSettings(user.id, {
        display: updatedDisplaySettings
      });
      
      if (result.success) {
        setOriginalSettings(settings);
        onSettingsChange?.(settings);
        setLastSaved(new Date());
        // Also save to localStorage as backup
        localStorage.setItem(`topBarSettings_${user.id}`, JSON.stringify(settings));
        // Trigger a custom event to notify the Header component
        window.dispatchEvent(new CustomEvent('topBarSettingsChanged', { detail: settings }));
        addToast({
          type: 'success',
          title: 'Settings Saved',
          message: 'Top bar settings have been updated successfully'
        });
      } else {
        console.error('Settings save error:', result.error);
        // If database save fails, still save to localStorage
        localStorage.setItem(`topBarSettings_${user.id}`, JSON.stringify(settings));
        setOriginalSettings(settings);
        onSettingsChange?.(settings);
        setLastSaved(new Date());
        // Trigger a custom event to notify the Header component
        window.dispatchEvent(new CustomEvent('topBarSettingsChanged', { detail: settings }));
        addToast({
          type: 'warning',
          title: 'Settings Saved Locally',
          message: 'Settings saved to local storage. Database sync may be unavailable.'
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      // Still try to save to localStorage as final fallback
      localStorage.setItem(`topBarSettings_${user.id}`, JSON.stringify(settings));
      setOriginalSettings(settings);
      onSettingsChange?.(settings);
      setLastSaved(new Date());
      // Trigger a custom event to notify the Header component
      window.dispatchEvent(new CustomEvent('topBarSettingsChanged', { detail: settings }));
      addToast({
        type: 'warning',
        title: 'Settings Saved Locally',
        message: 'Settings saved to local storage only. Please check your connection.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
  };

  const handleResetToDefaults = () => {
    const defaultSettings: DisplaySettings['topBar'] = {
      showDatabaseStatus: true,
      showSupabaseStatus: true,
      showThemeToggle: true,
      showNotifications: true,
      showSearch: true,
      showUserProfile: true,
      showMobileSearch: true,
    };
    setSettings(defaultSettings);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-dark-700 pb-4">
        <div className="flex items-center space-x-3">
          <Monitor className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Top Bar Settings
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Customize which items appear in the top navigation bar
            </p>
          </div>
        </div>
      </div>

      {/* Last Saved Info */}
      {lastSaved && (
        <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
          <CheckCircle className="h-4 w-4" />
          <span>Last saved: {lastSaved.toLocaleString()}</span>
        </div>
      )}

      {/* Database Issue Warning */}
      <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-900">Database Table Issues Detected</p>
            <p className="text-sm text-yellow-700">Missing columns in user_settings table. Click "Copy Fix SQL" in Database Diagnostic section below.</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
          >
            Open Supabase →
          </a>
          <button
            onClick={() => {
              addToast({
                type: 'info',
                title: 'SQL Script Ready',
                message: 'Copy the SQL script from scripts/create-user-settings-table.sql and run it in Supabase SQL Editor'
              });
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Show Instructions
          </button>
        </div>
      </div>

      {/* Quick Setup Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-3">🔧 Quick Setup Instructions</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Go to your <strong>Supabase Dashboard</strong></li>
              <li>Open <strong>SQL Editor</strong> (in the left sidebar)</li>
              <li>Copy the SQL script from the box →</li>
              <li>Paste and <strong>Run</strong> the script</li>
              <li>Come back and test your settings!</li>
            </ol>
            <p className="text-xs text-blue-700 mt-2">
              💡 This will create the user_settings table needed for Supabase sync
            </p>
          </div>
          <div>
            <details className="bg-white border border-blue-200 rounded p-3">
              <summary className="cursor-pointer text-sm font-medium text-blue-900 mb-2">
                📋 Click to show SQL script
              </summary>
              <div className="mt-2">
                <button
                  onClick={() => {
                    const sql = `-- Create user_settings table for FBMS
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'system',
  display JSONB DEFAULT '{
    "topBar": {
      "showDatabaseStatus": true,
      "showSupabaseStatus": true,
      "showThemeToggle": true,
      "showNotifications": true,
      "showSearch": true,
      "showUserProfile": true,
      "showMobileSearch": true
    }
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);`;
                    
                    navigator.clipboard.writeText(sql).then(() => {
                      addToast({
                        type: 'success',
                        title: 'Copied!',
                        message: 'SQL script copied to clipboard'
                      });
                    }).catch(() => {
                      addToast({
                        type: 'error',
                        title: 'Copy Failed',
                        message: 'Please copy the script manually'
                      });
                    });
                  }}
                  className="w-full px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                >
                  📋 Copy SQL Script
                </button>
                <p className="text-xs text-gray-600 mt-1">
                  Simplified version - copies essential SQL to clipboard
                </p>
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Settings by Category */}
      <div className="space-y-8">
        {categories.map((category) => (
          <div key={category} className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-dark-700 pb-2">
              {category}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {topBarItems
                .filter(item => item.category === category)
                .map((item) => {
                  const IconComponent = item.icon;
                  const isEnabled = settings[item.key];
                  
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary-100 dark:bg-primary-900/20' : 'bg-gray-100 dark:bg-dark-600'}`}>
                          <IconComponent className={`h-4 w-4 ${isEnabled ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {item.label}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggle(item.key)}
                        className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors ${
                          isEnabled
                            ? 'bg-primary-600 dark:bg-primary-500'
                            : 'bg-gray-200 dark:bg-dark-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white transform transition-transform ${
                            isEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
          <Monitor className="h-4 w-4 mr-2" />
          Preview
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Items that will appear in your top bar:
        </p>
        <div className="flex flex-wrap gap-2">
          {topBarItems
            .filter(item => settings[item.key])
            .map((item) => {
              const IconComponent = item.icon;
              return (
                <div
                  key={item.key}
                  className="flex items-center space-x-2 px-3 py-2 bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-600"
                >
                  <IconComponent className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                </div>
              );
            })}
        </div>
        {topBarItems.filter(item => settings[item.key]).length === 0 && (
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">No items selected. Top bar will be empty.</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-dark-700">
        <button
          onClick={handleResetToDefaults}
          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          <span>Reset to Defaults</span>
        </button>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel Changes
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isLoading}
            className="flex items-center space-x-2 px-6 py-2 bg-primary-600 dark:bg-primary-500 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Database Diagnostic Section */}
      <UserSettingsDiagnostic />
    </div>
  );
};

export default TopBarSettingsSection;