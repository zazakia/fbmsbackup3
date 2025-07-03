import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2, Github, AlertCircle, Shield } from 'lucide-react';
import { useSupabaseAuthStore } from '../../store/supabaseAuthStore';
import { useToastStore } from '../../store/toastStore';
import { triggerAdminSetup } from '../../utils/setupAdmin';

interface ModernLoginFormProps {
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}

const ModernLoginForm: React.FC<ModernLoginFormProps> = ({ onSwitchToRegister, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  
  const { 
    login, 
    signInWithGoogle, 
    signInWithGithub, 
    isLoading, 
    error,
    clearError 
  } = useSupabaseAuthStore();
  const { addToast } = useToastStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    if (!email.trim() || !password.trim()) {
      addToast({
        type: 'error',
        title: 'Missing Information',
        message: 'Please enter both email and password'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email, password });
      addToast({
        type: 'success',
        title: 'Welcome Back!',
        message: 'You have been successfully logged in'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      
      // Check for specific error types and provide helpful suggestions
      if (errorMessage.includes('Invalid login credentials')) {
        addToast({
          type: 'error',
          title: 'Login Failed',
          message: 'Invalid email or password. Please check your credentials and try again.'
        });
      } else if (errorMessage.includes('Email not confirmed')) {
        addToast({
          type: 'error',
          title: 'Email Not Verified',
          message: 'Please check your email and verify your account before logging in.'
        });
      } else {
        addToast({
          type: 'error',
          title: 'Login Failed',
          message: errorMessage
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setSocialLoading(provider);
    clearError();
    
    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else {
        await signInWithGithub();
      }
      
      addToast({
        type: 'success',
        title: 'Redirecting...',
        message: `Signing in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}`
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Social Login Failed',
        message: error instanceof Error ? error.message : `Failed to sign in with ${provider}`
      });
    } finally {
      setSocialLoading(null);
    }
  };

  // Quick demo login
  const handleDemoLogin = async () => {
    setEmail('demo@fbms.com');
    setPassword('Demo123!');
    
    setTimeout(() => {
      const form = document.getElementById('login-form') as HTMLFormElement;
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }, 100);
  };

  // Admin account setup
  const handleAdminSetup = async () => {
    setIsSubmitting(true);
    try {
      const result = await triggerAdminSetup();
      if (result.success) {
        addToast({
          type: 'success',
          title: 'Admin Account Ready',
          message: 'Admin account created! Email: admin@fbms.com'
        });
        // Auto-fill admin credentials
        setEmail('admin@fbms.com');
        setPassword('Qweasd145698@');
      } else {
        addToast({
          type: 'error',
          title: 'Setup Failed',
          message: result.message
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Setup Error',
        message: 'Failed to setup admin account'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md w-full mx-auto">
      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-dark-700 transition-colors duration-300">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Welcome Back
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to your account to continue
          </p>
        </div>

        {/* Social Login Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleSocialLogin('google')}
            disabled={socialLoading === 'google' || isLoading}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {socialLoading === 'google' ? (
              <Loader2 className="h-5 w-5 mr-3 animate-spin" />
            ) : (
              <div className="h-5 w-5 mr-3">
                <svg viewBox="0 0 24 24" className="h-5 w-5">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              </div>
            )}
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              Continue with Google
            </span>
          </button>

          <button
            onClick={() => handleSocialLogin('github')}
            disabled={socialLoading === 'github' || isLoading}
            className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {socialLoading === 'github' ? (
              <Loader2 className="h-5 w-5 mr-3 animate-spin" />
            ) : (
              <Github className="h-5 w-5 mr-3" />
            )}
            <span className="text-gray-700 dark:text-gray-300 font-medium">
              Continue with GitHub
            </span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-dark-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-dark-800 text-gray-500 dark:text-gray-400">
              Or continue with email
            </span>
          </div>
        </div>

        {/* Login Form */}
        <form id="login-form" onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="Enter your email"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-dark-700 dark:text-white transition-colors duration-200"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-dark-600 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Remember me
              </label>
            </div>

            <button
              type="button"
              onClick={onForgotPassword}
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors duration-200"
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </>
            )}
          </button>

          {/* Development Buttons */}
          {import.meta.env.DEV && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Try Demo Account
              </button>

              <button
                type="button"
                onClick={handleAdminSetup}
                disabled={isSubmitting || isLoading}
                className="w-full bg-orange-100 dark:bg-orange-900 hover:bg-orange-200 dark:hover:bg-orange-800 text-orange-700 dark:text-orange-300 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center disabled:opacity-50"
              >
                <Shield className="h-4 w-4 mr-2" />
                Setup Admin Account
              </button>
            </div>
          )}

          {/* Production Demo Button */}
          {!import.meta.env.DEV && (
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-700 dark:text-gray-300 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Try Demo Account
            </button>
          )}
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium transition-colors duration-200"
            >
              Sign up now
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModernLoginForm;