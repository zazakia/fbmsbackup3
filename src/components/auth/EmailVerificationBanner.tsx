import React, { useState } from 'react';
import { Mail, X, RefreshCw, CheckCircle } from 'lucide-react';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useToastStore } from '../../store/toastStore';

interface EmailVerificationBannerProps {
  email: string;
  onDismiss?: () => void;
}

const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({ 
  email, 
  onDismiss 
}) => {
  const [isResending, setIsResending] = useState(false);
  const [hasSent, setHasSent] = useState(false);
  const { resendVerification, isLoading } = useSupabaseAuthStore();
  const { addToast } = useToastStore();

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      await resendVerification(email);
      setHasSent(true);
      addToast({
        type: 'success',
        title: 'Verification Email Sent',
        message: 'Please check your email for the verification link'
      });
      
      // Reset the sent state after a few seconds
      setTimeout(() => setHasSent(false), 5000);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to Send',
        message: error instanceof Error ? error.message : 'Failed to resend verification email'
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-500 p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Mail className="h-5 w-5 text-yellow-400 dark:text-yellow-500 mt-0.5" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Email verification required
          </h3>
          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
            We've sent a verification email to <strong>{email}</strong>. 
            Please check your inbox and click the verification link to complete your account setup.
          </p>
          <div className="mt-3 flex items-center space-x-4">
            <button
              onClick={handleResendVerification}
              disabled={isResending || isLoading || hasSent}
              className="inline-flex items-center text-sm font-medium text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isResending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Sending...
                </>
              ) : hasSent ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Sent!
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Resend verification email
                </>
              )}
            </button>
            
            <span className="text-yellow-600 dark:text-yellow-400">•</span>
            
            <button
              onClick={() => window.open('https://gmail.com', '_blank')}
              className="text-sm font-medium text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100 transition-colors duration-200"
            >
              Open Gmail
            </button>
          </div>
          
          <div className="mt-2">
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              Didn't receive the email? Check your spam folder or wait a few minutes before requesting a new one.
            </p>
          </div>
        </div>
        
        {onDismiss && (
          <div className="flex-shrink-0 ml-4">
            <button
              onClick={onDismiss}
              className="inline-flex text-yellow-400 dark:text-yellow-500 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailVerificationBanner;