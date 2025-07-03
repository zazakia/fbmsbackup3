import React, { useEffect } from 'react';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import ModernAuthPage from './auth/ModernAuthPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, checkAuth, hasLoggedOut } = useSupabaseAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Only allow development bypass if:
  // 1. We're in development mode
  // 2. User hasn't explicitly logged out
  const isDevelopment = import.meta.env.DEV;
  const shouldBypassAuth = isDevelopment && !hasLoggedOut;

  if (!isAuthenticated && !shouldBypassAuth) {
    return <ModernAuthPage />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;