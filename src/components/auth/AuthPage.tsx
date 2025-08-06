import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:block">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start mb-8">
              <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Jr & Mai Agrivet</h1>
                <p className="text-gray-600">Filipino Business Management System</p>
              </div>
            </div>
            
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Manage Your Business with Confidence
            </h2>
            
            <p className="text-xl text-gray-600 mb-8">
              Complete business management solution designed specifically for Filipino small businesses. 
              Handle sales, inventory, payroll, and BIR compliance all in one place.
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Sales & POS</h3>
                <p className="text-sm text-gray-600">Complete point of sale system with invoice generation</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">BIR Compliance</h3>
                <p className="text-sm text-gray-600">Automated tax calculations and BIR form generation</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Inventory</h3>
                <p className="text-sm text-gray-600">Track stock levels and manage suppliers efficiently</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Payroll</h3>
                <p className="text-sm text-gray-600">SSS, PhilHealth, and Pag-IBIG calculations</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth Form */}
        <div className="w-full">
          {isLogin ? (
            <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;