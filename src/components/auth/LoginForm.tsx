import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, AlertCircle, UserPlus } from 'lucide-react';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useSafeForm } from '../../hooks/useSafeForm';

interface LoginFormProps {
  onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showUnregisteredPrompt, setShowUnregisteredPrompt] = useState(false);
  const { login, isLoading, error, clearError } = useSupabaseAuthStore();
  
  const {
    data: formData,
    errors: validationErrors,
    isValid,
    updateField,
    validate,
    getFieldProps
  } = useSafeForm({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validate()) {
      return;
    }

    // Additional validation for required fields
    if (!formData.email || !formData.password) {
      return;
    }

    try {
      await login(formData);
    } catch (error) {
      // Check if this is an unregistered user error
      if (error instanceof Error && error.message === 'UNREGISTERED_USER') {
        // Show a better UI prompt instead of browser confirm
        setShowUnregisteredPrompt(true);
        return;
      }
      // Other errors are handled by the store
    }
  };

  const handleInputChange = (field: string, value: string) => {
    updateField(field, value);
    
    // Clear auth error and unregistered prompt when user makes changes
    if (error) {
      clearError();
    }
    if (showUnregisteredPrompt) {
      setShowUnregisteredPrompt(false);
    }
  };

  const handleCreateAccount = () => {
    setShowUnregisteredPrompt(false);
    onSwitchToRegister();
  };

  const handleCancelPrompt = () => {
    setShowUnregisteredPrompt(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-600 mt-2">Sign in to your FBMS account</p>
        </div>

        {error && (
          <div className={`mb-6 p-4 border rounded-lg flex items-center ${
            error.includes('not registered') 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <AlertCircle className={`h-5 w-5 mr-3 ${
              error.includes('not registered') 
                ? 'text-blue-500' 
                : 'text-red-500'
            }`} />
            <div className="flex-1">
              <span className={`text-sm ${
                error.includes('not registered') 
                  ? 'text-blue-700' 
                  : 'text-red-700'
              }`}>
                {error}
              </span>
              {error.includes('not registered') && (
                <div className="mt-2">
                  <button
                    onClick={onSwitchToRegister}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm underline"
                  >
                    Create your account here →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}


        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  validationErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter your email"
                disabled={isLoading}
              />
            </div>
            {validationErrors.email && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  validationErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Enter your password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {validationErrors.password && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Signing In...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-blue-600 hover:text-blue-700 font-medium"
              disabled={isLoading}
            >
              Sign up here
            </button>
          </p>
        </div>

      </div>

      {/* Unregistered User Prompt Modal */}
      {showUnregisteredPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Email Not Registered
                </h3>
                <p className="text-sm text-gray-600">
                  This email address is not registered.
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-700">
                The email <strong>{formData.email}</strong> is not registered in our system. 
                Would you like to create a new account?
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleCancelPrompt}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAccount}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginForm;