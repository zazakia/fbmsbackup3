import React, { useEffect } from 'react';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore'; // UPDATED
import AuthPage from './auth/AuthPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, checkAuth } = useSupabaseAuthStore(); // UPDATED

  useEffect(() => {
    checkAuth(); // checkAuth in useSupabaseAuthStore is async, useEffect handles this.
  }, [checkAuth]);

  // Temporarily bypass authentication for development
  const isDevelopment = import.meta.env.DEV;
  const shouldBypassAuth = isDevelopment;

  if (!isAuthenticated && !shouldBypassAuth) {
    return <AuthPage />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;