import React from 'react';
import { Menu, Bell, Search, User, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import SupabaseStatusIndicator from './SupabaseStatusIndicator';
import DatabaseStatus from './DatabaseStatus';

interface HeaderProps {
  onMenuToggle: () => void;
  activeModule: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuToggle, activeModule }) => {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left section */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{activeModule}</h1>
            <p className="text-sm text-gray-500">Manage your business operations</p>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-4">
          {/* Database Status */}
          <DatabaseStatus className="hidden lg:flex" />
          
          {/* Supabase Connection Indicator */}
          <SupabaseStatusIndicator />

          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell className="h-5 w-5 text-gray-600" />
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {/* User menu */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-gray-900">
                {user ? `${user.firstName} ${user.lastName}` : 'User'}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.role || 'Business Owner'}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;