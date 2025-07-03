import React, { useEffect } from 'react';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import AuthPage from './auth/AuthPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, checkAuth, user } = useSupabaseAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Allow development bypass only if no user session exists
  // This ensures logout properly redirects to login
  const isDevelopment = import.meta.env.DEV;
  const shouldBypassAuth = isDevelopment && !user;

  if (!isAuthenticated && !shouldBypassAuth) {
    return <AuthPage />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;