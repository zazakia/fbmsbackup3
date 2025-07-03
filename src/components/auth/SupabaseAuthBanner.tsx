import React, { useState } from 'react';
import { AlertCircle, CheckCircle, LogIn } from 'lucide-react';
import { supabase, isSupabaseAuthenticated, getCurrentUser } from '../../utils/supabase';

const SupabaseAuthBanner: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  React.useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const authStatus = await isSupabaseAuthenticated();
    setIsAuthenticated(authStatus);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        setShowLoginForm(false);
        await checkAuthStatus();
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: 'User',
            last_name: 'Account'
          }
        }
      });

      if (error) {
        setError(error.message);
      } else {
        setError('Please check your email to confirm your account.');
      }
    } catch (err) {
      setError('Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    await checkAuthStatus();
  };

  if (isAuthenticated === null) {
    return null; // Still checking
  }

  if (isAuthenticated) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-green-800 font-medium">
              Connected to Supabase - Data will be saved to database
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-green-600 hover:text-green-800 text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
          <div>
            <p className="text-yellow-800 font-medium">
              Development Mode - Using Mock Data
            </p>
            <p className="text-yellow-700 text-sm mt-1">
              To save data to Supabase database, please log in or create an account.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowLoginForm(!showLoginForm)}
          className="flex items-center text-yellow-600 hover:text-yellow-800 text-sm font-medium"
        >
          <LogIn className="h-4 w-4 mr-1" />
          {showLoginForm ? 'Cancel' : 'Login'}
        </button>
      </div>

      {showLoginForm && (
        <div className="mt-4 p-4 bg-white rounded border">
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
              <button
                type="button"
                onClick={handleSignUp}
                disabled={isLoading}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                {isLoading ? 'Signing up...' : 'Sign Up'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default SupabaseAuthBanner; 