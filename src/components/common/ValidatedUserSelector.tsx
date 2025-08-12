import React, { useState, useEffect } from 'react';
import { User, Check, AlertCircle, RefreshCw, Search } from 'lucide-react';
import { 
  getActiveUsers, 
  validateUserId, 
  getCurrentValidatedUser,
  ValidatedUser,
  UserValidationResult 
} from '../../utils/userValidation';

interface ValidatedUserSelectorProps {
  selectedUserId?: string | null;
  selectedUserName?: string | null;
  onUserSelect: (userId: string, userName: string) => void;
  onValidationResult?: (result: UserValidationResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  allowSystemFallback?: boolean;
  showValidationStatus?: boolean;
}

export const ValidatedUserSelector: React.FC<ValidatedUserSelectorProps> = ({
  selectedUserId,
  selectedUserName,
  onUserSelect,
  onValidationResult,
  placeholder = "Select a user...",
  className = "",
  disabled = false,
  required = false,
  allowSystemFallback = true,
  showValidationStatus = true
}) => {
  const [users, setUsers] = useState<ValidatedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    message?: string;
  }>({ isValid: false });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Validate selected user when it changes
  useEffect(() => {
    if (selectedUserId) {
      validateSelectedUser(selectedUserId);
    } else {
      setValidationStatus({ isValid: false });
    }
  }, [selectedUserId]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const activeUsers = await getActiveUsers();
      setUsers(activeUsers);

      // Auto-select current user if none selected
      if (!selectedUserId && activeUsers.length > 0) {
        const currentUser = await getCurrentValidatedUser();
        if (currentUser.isValid && currentUser.userId) {
          const user = activeUsers.find(u => u.id === currentUser.userId);
          if (user) {
            onUserSelect(user.id, user.fullName);
          }
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateSelectedUser = async (userId: string) => {
    try {
      setValidating(true);
      const result = await validateUserId(userId);
      
      const status = {
        isValid: result.isValid,
        message: result.isValid 
          ? `✓ Valid user: ${result.userName}` 
          : `⚠ ${result.error}`
      };
      
      setValidationStatus(status);
      
      if (onValidationResult) {
        onValidationResult(result);
      }
    } catch (error) {
      const status = {
        isValid: false,
        message: '❌ Validation error'
      };
      setValidationStatus(status);
      
      if (onValidationResult) {
        onValidationResult({ isValid: false, error: 'Validation failed' });
      }
    } finally {
      setValidating(false);
    }
  };

  const handleUserSelect = (user: ValidatedUser) => {
    onUserSelect(user.id, user.fullName);
    setIsDropdownOpen(false);
    setSearchTerm('');
  };

  const handleRefresh = () => {
    loadUsers();
    if (selectedUserId) {
      validateSelectedUser(selectedUserId);
    }
  };

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUser = users.find(u => u.id === selectedUserId);
  const displayName = selectedUserName || selectedUser?.fullName || '';

  return (
    <div className={`relative ${className}`}>
      {/* User Selector Dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsDropdownOpen(!isDropdownOpen)}
          disabled={disabled || loading}
          className={`
            w-full px-4 py-2 text-left bg-white dark:bg-gray-800 border rounded-lg
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-gray-400'}
            ${validationStatus.isValid 
              ? 'border-green-300 dark:border-green-600' 
              : required && selectedUserId 
                ? 'border-red-300 dark:border-red-600' 
                : 'border-gray-300 dark:border-gray-600'
            }
          `}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <User className={`h-4 w-4 mr-2 ${
                validationStatus.isValid ? 'text-green-500' : 'text-gray-400'
              }`} />
              <span className={
                displayName 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-500 dark:text-gray-400'
              }>
                {loading ? 'Loading users...' : displayName || placeholder}
              </span>
            </div>
            <div className="flex items-center">
              {validating && (
                <RefreshCw className="h-4 w-4 text-blue-500 animate-spin mr-2" />
              )}
              {showValidationStatus && selectedUserId && (
                <div className="mr-2">
                  {validationStatus.isValid ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              )}
              <svg 
                className="h-4 w-4 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </button>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="absolute right-10 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          title="Refresh users"
        >
          <RefreshCw className={`h-3 w-3 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-600">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* User List */}
          <div className="max-h-48 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-3 text-center text-gray-500 dark:text-gray-400">
                {searchTerm ? 'No users found' : 'No users available'}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className={`
                    w-full px-3 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20
                    focus:bg-blue-50 dark:focus:bg-blue-900/20 focus:outline-none
                    ${selectedUserId === user.id ? 'bg-blue-100 dark:bg-blue-900/40' : ''}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {user.fullName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {user.email} • {user.role}
                      </div>
                    </div>
                    {selectedUserId === user.id && (
                      <Check className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Validation Status */}
      {showValidationStatus && validationStatus.message && (
        <div className={`mt-1 text-xs ${
          validationStatus.isValid 
            ? 'text-green-600 dark:text-green-400' 
            : 'text-red-600 dark:text-red-400'
        }`}>
          {validationStatus.message}
        </div>
      )}

      {/* System Fallback Notice */}
      {allowSystemFallback && !validationStatus.isValid && selectedUserId && (
        <div className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
          ⚠ Invalid user will fall back to system user
        </div>
      )}

      {/* Click outside handler */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
};
