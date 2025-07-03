import React, { useState } from 'react';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';
import { supabaseAnon } from '../../utils/supabase';

interface AuthFlowDetectorProps {
  onLoginFlow: (email: string) => void;
  onSignupFlow: (email: string) => void;
}

const AuthFlowDetector: React.FC<AuthFlowDetectorProps> = ({ 
  onLoginFlow, 
  onSignupFlow 
}) => {
  const [email, setEmail] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsChecking(true);
    setError('');

    try {
      // Try to check if user exists by attempting a password reset
      // This is a clever way to detect if an email is registered without exposing user data
      const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        if (error.message.includes('User not found') || 
            error.message.includes('Invalid email')) {
          // User doesn't exist, show signup flow
          onSignupFlow(email);
        } else {
          // Some other error, assume user exists and show login
          onLoginFlow(email);
        }
      } else {
        // No error means user exists, show login flow
        onLoginFlow(email);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      // On error, default to login flow
      onLoginFlow(email);
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto">
      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-dark-700 transition-colors duration-300">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mb-6">
            <Mail className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Welcome to FBMS
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your email to get started
          </p>
        </div>

        <form onSubmit={handleEmailSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white transition-colors duration-200"
                required
                disabled={isChecking}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isChecking || !email.trim()}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {isChecking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </button>

          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              We'll automatically detect if you need to sign in or create a new account
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AuthFlowDetector;