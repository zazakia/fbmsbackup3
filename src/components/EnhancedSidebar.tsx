import React, { memo, useState } from 'react';
import { X, BarChart3, LogOut, User, AlertTriangle, HelpCircle } from 'lucide-react';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import HelpMenu from './help/HelpMenu';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
  isOpen: boolean;
  menuItems: MenuItem[];
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  onClose: () => void;
}

const EnhancedSidebar: React.FC<SidebarProps> = memo(({ 
  isOpen, 
  menuItems, 
  activeModule, 
  onModuleChange, 
  onClose 
}) => {
  const { user, logout } = useSupabaseAuthStore();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showHelpMenu, setShowHelpMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      // Close mobile sidebar after logout
      onClose();
      setShowLogoutConfirm(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(true);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:border-gray-200 dark:border-dark-700 lg:bg-white dark:lg:bg-dark-800 lg:pt-0 transition-colors duration-300">
        {/* Fixed Header */}
        <div className="flex items-center h-16 px-6 border-b border-gray-200 dark:border-dark-700 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Jr & Mai Agrivet</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Business Manager</p>
            </div>
          </div>
        </div>
        
        {/* Scrollable Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto min-h-0 scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 dark:scrollbar-track-dark-700 dark:scrollbar-thumb-dark-500">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onModuleChange(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                  activeModule === item.id
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-r-4 border-primary-600 dark:border-primary-400'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-700 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${
                  activeModule === item.id ? 'text-primary-700 dark:text-primary-300' : 'text-gray-400 dark:text-gray-500'
                }`} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        {/* Fixed Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-dark-700 flex-shrink-0 space-y-3">
          {/* User Info & Logout */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user?.firstName || user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.role || 'Staff'}
                </p>
              </div>
            </div>
            <button
              onClick={confirmLogout}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          
          {/* Enhanced Help Section */}
          <div className="relative">
            <button
              onClick={() => setShowHelpMenu(!showHelpMenu)}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-4 text-white hover:from-primary-600 hover:to-primary-700 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HelpCircle className="h-5 w-5" />
                  <div className="text-left">
                    <h3 className="font-semibold text-sm">Help & Documentation</h3>
                    <p className="text-xs text-primary-100">Guides, Training & Support</p>
                  </div>
                </div>
                <div className={`transform transition-transform duration-200 ${showHelpMenu ? 'rotate-180' : ''}`}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </button>
            
            {/* Help Menu Dropdown */}
            {showHelpMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
                <HelpMenu />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-dark-800 transform transition-transform duration-300 ease-in-out flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Fixed Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-dark-700 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Jr & Mai Agrivet</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Business Manager</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors duration-200">
            <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        
        {/* Scrollable Navigation */}
        <nav className="mobile-sidebar-nav flex-1 overflow-y-auto px-4 py-6 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onModuleChange(item.id);
                  onClose();
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                  activeModule === item.id
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-r-4 border-primary-600 dark:border-primary-400'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-700 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${
                  activeModule === item.id ? 'text-primary-700 dark:text-primary-300' : 'text-gray-400 dark:text-gray-500'
                }`} />
                <span className="font-medium truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Fixed Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-dark-700 flex-shrink-0 space-y-3">
          {/* User Info & Logout */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user?.firstName || user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.role || 'Staff'}
                </p>
              </div>
            </div>
            <button
              onClick={confirmLogout}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          
          {/* Enhanced Help Section - Mobile */}
          <div className="relative">
            <button
              onClick={() => setShowHelpMenu(!showHelpMenu)}
              className="w-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-4 text-white hover:from-primary-600 hover:to-primary-700 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HelpCircle className="h-5 w-5" />
                  <div className="text-left">
                    <h3 className="font-semibold text-sm">Help & Docs</h3>
                    <p className="text-xs text-primary-100">Guides & Training</p>
                  </div>
                </div>
                <div className={`transform transition-transform duration-200 ${showHelpMenu ? 'rotate-180' : ''}`}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </button>
            
            {/* Help Menu Dropdown - Mobile */}
            {showHelpMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
                <HelpMenu />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Confirm Logout
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Are you sure you want to logout?
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                You will need to login again to access the system.
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-700 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close help menu */}
      {showHelpMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowHelpMenu(false)}
        />
      )}
    </>
  );
});

EnhancedSidebar.displayName = 'EnhancedSidebar';

export default EnhancedSidebar;