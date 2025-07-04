import React, { memo } from 'react';
import { X, BarChart3 } from 'lucide-react';

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

const Sidebar: React.FC<SidebarProps> = memo(({ 
  isOpen, 
  menuItems, 
  activeModule, 
  onModuleChange, 
  onClose 
}) => {
  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:border-gray-200 dark:border-dark-700 lg:bg-white dark:lg:bg-dark-800 lg:pt-0 transition-colors duration-300">
        <div className="flex items-center h-16 px-6 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">FBMS</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Business Manager</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
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
                <Icon className={`h-5 w-5 ${
                  activeModule === item.id ? 'text-primary-700 dark:text-primary-300' : 'text-gray-400 dark:text-gray-500'
                }`} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-200 dark:border-dark-700">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-4 text-white">
            <h3 className="font-semibold text-sm">Need Help?</h3>
            <p className="text-xs mt-1 text-primary-100">Contact our support team</p>
            <button className="mt-2 text-xs bg-white bg-opacity-20 px-3 py-1 rounded hover:bg-opacity-30 transition-all duration-200">
              Get Support
            </button>
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
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">FBMS</h1>
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
        <div className="p-4 border-t border-gray-200 dark:border-dark-700 flex-shrink-0">
          <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-4 text-white">
            <h3 className="font-semibold text-sm">Need Help?</h3>
            <p className="text-xs mt-1 text-primary-100">Contact our support team</p>
            <button className="mt-2 text-xs bg-white bg-opacity-20 px-3 py-1 rounded hover:bg-opacity-30 transition-all duration-200">
              Get Support
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;