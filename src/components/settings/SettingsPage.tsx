import React, { useState } from 'react';
import { Save, Bell, Calendar, Database, Shield, User, Monitor, Download, Sparkles, Settings, Power } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { useInventoryMonitor } from '../../services/inventoryMonitor';
import { useToastStore } from '../../store/toastStore';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { hasPermission } from '../../utils/permissions';
import { isAdmin } from '../../utils/adminOverride';
import UserManagement from './UserManagement';
import UserPreferences from './UserPreferences';
import NotificationSettings from './NotificationSettings';
import SecuritySettings from './SecuritySettings';
import SystemSettings from './SystemSettings';
import EnhancedVersionSettings from './EnhancedVersionSettings';
import TopBarSettingsSection from './TopBarSettingsSection';
import MainModuleSettings from './MainModuleSettings';
import MenuVisibilitySettings from './MenuVisibilitySettings';

interface SettingsSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
}

const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('profile');
  const { settings, updateSettings, isEnabled, toggleNotifications } = useNotificationStore();
  const { updateThresholds, getStatus } = useInventoryMonitor();
  const { addToast } = useToastStore();
  const { user } = useSupabaseAuthStore();

  const [inventoryThresholds, setInventoryThresholds] = useState({
    lowStock: 10,
    outOfStock: 0,
    expiryWarning: 7
  });

  const [reportSchedule, setReportSchedule] = useState({
    dailySummary: false,
    weeklySales: true,
    monthlyFinancial: true,
    quarterlyAnalytics: false,
    emailNotifications: true,
    autoExport: false
  });

  const allSections: SettingsSection[] = [
    {
      id: 'profile',
      title: 'User Preferences',
      icon: <User className="h-5 w-5" />,
      description: 'Personal settings and preferences'
    },
    {
      id: 'main-module',
      title: 'Main Module Control',
      icon: <Power className="h-5 w-5" />,
      description: 'Enable or disable the main application module'
    },
    {
      id: 'menu-visibility',
      title: 'Menu Visibility',
      icon: <Monitor className="h-5 w-5" />,
      description: 'Control which menu items appear in the side navigation'
    },
    {
      id: 'topbar',
      title: 'Top Bar Settings',
      icon: <Settings className="h-5 w-5" />,
      description: 'Customize which items appear in the top navigation bar'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: <Bell className="h-5 w-5" />,
      description: 'Configure alerts and notification preferences'
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      icon: <Shield className="h-5 w-5" />,
      description: user && (isAdmin(user.role) || hasPermission(user.role, 'users', 'view')) ? 'User management and permissions' : 'Security settings and privacy controls'
    },
    {
      id: 'reports',
      title: 'Reports & Scheduling',
      icon: <Calendar className="h-5 w-5" />,
      description: 'Set up automated reports and export schedules'
    },
    {
      id: 'inventory',
      title: 'Inventory Monitoring',
      icon: <Monitor className="h-5 w-5" />,
      description: 'Configure stock level alerts and thresholds'
    },
    {
      id: 'enhanced-versions',
      title: 'Enhanced Versions',
      icon: <Sparkles className="h-5 w-5" />,
      description: 'Toggle between standard and enhanced module versions'
    },
    {
      id: 'database',
      title: 'System Settings',
      icon: <Database className="h-5 w-5" />,
      description: 'Manage system configuration and integrations'
    }
  ];

  // Filter sections based on user permissions
  const sections = allSections.filter(section => {
    if (section.id === 'security') {
      return user && hasPermission(user.role, 'users', 'view');
    }
    return true; // All other sections are accessible to all users
  });

  const handleSaveSettings = () => {
    // Save notification settings
    updateSettings(settings);
    
    // Save inventory thresholds
    updateThresholds(inventoryThresholds);
    
    addToast({
      type: 'success',
      title: 'Settings Saved',
      message: 'Your preferences have been updated successfully.'
    });
  };

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Enable Notifications</h3>
          <p className="text-sm text-gray-600">Turn on/off all system notifications</p>
        </div>
        <button
          onClick={toggleNotifications}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isEnabled ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Notification Categories</h4>
        {Object.entries(settings).map(([key, value]) => (
          <label key={key} className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => updateSettings({ [key]: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={!isEnabled}
              />
              <span className="ml-3 text-sm text-gray-700 capitalize">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );

  const renderReportSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Automated Reports</h3>
        <div className="space-y-4">
          {Object.entries(reportSchedule).map(([key, value]) => (
            <label key={key} className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setReportSchedule(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <Download className="h-5 w-5 text-blue-600 mr-2" />
          <h4 className="font-medium text-blue-900">Export Options</h4>
        </div>
        <p className="text-sm text-blue-700 mt-2">
          Configure automatic export formats and schedules for your business reports.
        </p>
      </div>
    </div>
  );

  const renderInventorySettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Stock Level Thresholds</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Low Stock Alert
            </label>
            <input
              type="number"
              value={inventoryThresholds.lowStock}
              onChange={(e) => setInventoryThresholds(prev => ({ ...prev, lowStock: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
            <p className="text-xs text-gray-600 mt-1">Alert when stock falls below this level</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Out of Stock Alert
            </label>
            <input
              type="number"
              value={inventoryThresholds.outOfStock}
              onChange={(e) => setInventoryThresholds(prev => ({ ...prev, outOfStock: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
            />
            <p className="text-xs text-gray-600 mt-1">Alert when stock reaches this level</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiry Warning (days)
            </label>
            <input
              type="number"
              value={inventoryThresholds.expiryWarning}
              onChange={(e) => setInventoryThresholds(prev => ({ ...prev, expiryWarning: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
            />
            <p className="text-xs text-gray-600 mt-1">Alert days before expiry</p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <Monitor className="h-5 w-5 text-yellow-600 mr-2" />
          <h4 className="font-medium text-yellow-900">Monitoring Status</h4>
        </div>
        <p className="text-sm text-yellow-700 mt-2">
          Inventory monitoring is active. Last check: {getStatus().lastCheck.toLocaleString()}
        </p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'main-module':
        return <MainModuleSettings />;
      case 'menu-visibility':
        return <MenuVisibilitySettings />;
      case 'topbar':
        return <TopBarSettingsSection />;
      case 'notifications':
        return <NotificationSettings />;
      case 'reports':
        return renderReportSettings();
      case 'inventory':
        return renderInventorySettings();
      case 'enhanced-versions':
        return <EnhancedVersionSettings />;
      case 'database':
        return user && hasPermission(user.role, 'settings', 'edit') && user.role === 'admin' ? (
          <SystemSettings />
        ) : (
          <div className="text-center py-8">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-600">System settings are only available to administrators.</p>
          </div>
        );
      case 'security':
        return user && hasPermission(user.role, 'users', 'view') ? <UserManagement /> : <SecuritySettings />;
      case 'profile':
        return <UserPreferences />;
      default:
        return <NotificationSettings />;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your system preferences and configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-50 border border-blue-200 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-1 rounded ${activeSection === section.id ? 'text-blue-600' : 'text-gray-400'}`}>
                    {section.icon}
                  </div>
                  <div>
                    <div className="font-medium">{section.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{section.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;