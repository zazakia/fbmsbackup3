import React, { useState } from 'react';
import { Menu, Search, User, LogOut, Loader2 } from 'lucide-react';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import { useToastStore } from '../store/toastStore';
import SupabaseStatusIndicator from './SupabaseStatusIndicator';
import DatabaseStatus from './DatabaseStatus';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  onMenuToggle: () => void;
  activeModule: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle, activeModule }) => {
  const { user, logout, isLoading } = useSupabaseAuthStore();
  const { addToast } = useToastStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent double-click
    
    setIsLoggingOut(true);
    
    try {
      await logout();
      addToast({
        type: 'success',
        title: 'Logged Out',
        message: 'You have been successfully logged out.'
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Logout Error',
        message: 'There was an issue logging out, but you have been signed out locally.'
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 px-6 py-4 transition-colors duration-300">
      <div className="flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{activeModule}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage your business operations</p>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Database Status */}
          <DatabaseStatus className="hidden lg:flex" />
          
          {/* Supabase Connection Indicator */}
          <SupabaseStatusIndicator />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent transition-colors duration-200 w-32 sm:w-48 md:w-64"
            />
          </div>

          {/* Mobile Search Button */}
          <button className="sm:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
            <Search className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* User menu */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {user ? `${user.firstName} ${user.lastName}` : 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {user?.role || 'Business Owner'}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={isLoggingOut ? "Logging out..." : "Logout"}
            >
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 text-gray-600 dark:text-gray-300 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;