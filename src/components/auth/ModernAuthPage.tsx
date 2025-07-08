import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import ModernLoginForm from './ModernLoginForm';
import ModernRegisterForm from './ModernRegisterForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import ResetPasswordForm from './ResetPasswordForm';

export type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-password';

const ModernAuthPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [resetToken, setResetToken] = useState<string | undefined>();

  // Check for reset token in URL params
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
      setResetToken(token);
      setAuthMode('reset-password');
    }
  }, []);

  const handleAuthModeChange = (mode: AuthMode) => {
    setAuthMode(mode);
  };

  const handleResetSuccess = () => {
    setAuthMode('login');
    setResetToken(undefined);
    // Clear URL params
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  if (authMode === 'forgot-password') {
    return <ForgotPasswordForm onBackToLogin={() => setAuthMode('login')} />;
  }

  if (authMode === 'reset-password') {
    return <ResetPasswordForm token={resetToken} onSuccess={handleResetSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-dark-900 dark:via-dark-800 dark:to-dark-900 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:block">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start mb-8">
              <div className="h-16 w-16 bg-gradient-to-r from-primary-500 to-blue-600 rounded-2xl flex items-center justify-center mr-4">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">FBMS</h1>
                <p className="text-gray-600 dark:text-gray-400">Filipino Business Management System</p>
              </div>
            </div>
            
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Manage Your Business with Confidence
            </h2>
            
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              Complete business management solution designed specifically for Filipino small businesses. 
              Handle sales, inventory, payroll, and BIR compliance all in one place.
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 transition-colors duration-300">
                <div className="h-12 w-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Sales & POS</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Complete point of sale system with invoice generation</p>
              </div>
              
              <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 transition-colors duration-300">
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">BIR Compliance</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Automated tax calculations and BIR form generation</p>
              </div>
              
              <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 transition-colors duration-300">
                <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Inventory</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Track stock levels and manage suppliers efficiently</p>
              </div>
              
              <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 transition-colors duration-300">
                <div className="h-12 w-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Payroll</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">SSS, PhilHealth, and Pag-IBIG calculations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth Form */}
        <div className="w-full">
          {authMode === 'login' ? (
            <ModernLoginForm 
              onSwitchToRegister={() => setAuthMode('register')}
              onForgotPassword={() => setAuthMode('forgot-password')}
            />
          ) : (
            <ModernRegisterForm 
              onSwitchToLogin={() => setAuthMode('login')}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernAuthPage;