import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, CheckCircle, Loader2, AlertCircle, Shield } from 'lucide-react';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useToastStore } from '../../store/toastStore';
import { validatePassword } from '../../utils/authSecurity';
import { logSecurityEvent } from '../../utils/authSecurity';

interface ResetPasswordFormProps {
  token?: string;
  onSuccess: () => void;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ token, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<any>(null);
  const { resetPassword, isLoading, error } = useSupabaseAuthStore();
  const { addToast } = useToastStore();

  useEffect(() => {
    if (password) {
      setPasswordValidation(validatePassword(password));
    } else {
      setPasswordValidation(null);
    }
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (password !== confirmPassword) {
      addToast({
        type: 'error',
        title: 'Passwords Don\'t Match',
        message: 'Please make sure both passwords are the same'
      });
      return;
    }

    // Validate password strength
    if (!passwordValidation || !passwordValidation.isValid) {
      const errors = passwordValidation?.errors || ['Password does not meet security requirements'];
      addToast({
        type: 'error',
        title: 'Password Too Weak',
        message: errors.join(', ')
      });
      return;
    }

    if (!token) {
      addToast({
        type: 'error',
        title: 'Invalid Reset Link',
        message: 'This password reset link is invalid or expired'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, password);
      
      logSecurityEvent({
        type: 'password_reset',
        email: 'unknown', // We don't have email in reset form
        success: true
      });
      
      addToast({
        type: 'success',
        title: 'Password Reset Successful',
        message: 'Your password has been updated successfully'
      });
      onSuccess();
    } catch (error) {
      logSecurityEvent({
        type: 'password_reset',
        email: 'unknown',
        success: false,
        reason: error instanceof Error ? error.message : 'Unknown error'
      });
      
      addToast({
        type: 'error',
        title: 'Reset Failed',
        message: error instanceof Error ? error.message : 'Failed to reset password'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStrengthColor = (score: number) => {
    if (score < 30) return 'bg-red-500';
    if (score < 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = (score: number) => {
    if (score < 30) return 'Weak';
    if (score < 60) return 'Medium';
    return 'Strong';
  };

  const getStrengthWidth = (score: number) => {
    return `${Math.min(score, 100)}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 dark:from-dark-900 dark:to-dark-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-dark-700">
          <div className="text-center mb-8">
            <div className="mx-auto h-16 w-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mb-6">
              <Lock className="h-8 w-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Set New Password
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Create a strong password to secure your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white transition-colors duration-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {password && passwordValidation && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Password strength:</span>
                    <span className={`font-medium ${passwordValidation.score < 30 ? 'text-red-600' : passwordValidation.score < 60 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {getStrengthText(passwordValidation.score)} ({passwordValidation.score}/100)
                    </span>
                  </div>
                  <div className="mt-1 h-2 bg-gray-200 dark:bg-dark-600 rounded-full">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${getStrengthColor(passwordValidation.score)}`}
                      style={{ width: getStrengthWidth(passwordValidation.score) }}
                    />
                  </div>
                  {passwordValidation.errors.length > 0 && (
                    <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                      <ul className="list-disc list-inside space-y-1">
                        {passwordValidation.errors.map((error: string, index: number) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {passwordValidation.suggestions.length > 0 && (
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                      <div className="flex items-start gap-1">
                        <Shield className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <ul className="space-y-1">
                          {passwordValidation.suggestions.map((suggestion: string, index: number) => (
                            <li key={index}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white transition-colors duration-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <div className="mt-2 flex items-center text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Passwords don't match
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={
                isSubmitting || 
                isLoading || 
                password !== confirmPassword || 
                !passwordValidation?.isValid ||
                !password
              }
              className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {isSubmitting || isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Update Password
                </>
              )}
            </button>

            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Password must be at least 8 characters long and contain a mix of uppercase, lowercase, numbers, and special characters.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordForm;