import React from 'react';
import { Sun, Moon, Monitor, Store, ShoppingCart } from 'lucide-react';
import { useThemeStore, Theme } from '../store/themeStore';

const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useThemeStore();

  const themes: { value: Theme; label: string; icon: React.ReactNode }[] = [
    {
      value: 'light',
      label: 'Light',
      icon: <Sun className="h-4 w-4" />
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: <Moon className="h-4 w-4" />
    },
    {
      value: 'tindahan-light',
      label: 'Tindahan Light',
      icon: <Store className="h-4 w-4" />
    },
    {
      value: 'tindahan-dark',
      label: 'Tindahan Dark',
      icon: <ShoppingCart className="h-4 w-4" />
    },
    {
      value: 'system',
      label: 'System',
      icon: <Monitor className="h-4 w-4" />
    }
  ];

  return (
    <div className="flex items-center space-x-1 bg-gray-100 dark:bg-dark-800 rounded-lg p-1">
      {themes.map((themeOption) => (
        <button
          key={themeOption.value}
          onClick={() => setTheme(themeOption.value)}
          className={`
            flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
            ${theme === themeOption.value
              ? 'bg-white dark:bg-dark-700 text-primary-600 dark:text-primary-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-700'
            }
          `}
          title={`Switch to ${themeOption.label} theme`}
        >
          {themeOption.icon}
          <span className="hidden sm:inline">{themeOption.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle; 