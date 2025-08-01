import React, { useEffect } from 'react';
import { useSupabaseAuthStore } from '../store/supabaseAuthStore';
import ModernAuthPage from './auth/ModernAuthPage';
import EmailVerificationBanner from './auth/EmailVerificationBanner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, checkAuth, hasLoggedOut, user, pendingEmailVerification } = useSupabaseAuthStore();

  useEffect(() => {
    checkAuth(); // checkAuth in useSupabaseAuthStore is async, useEffect handles this.
  }, [checkAuth]);

  // Only allow development bypass if:
  // 1. We're in development mode
  // 2. User hasn't explicitly logged out
  const isDevelopment = import.meta.env.DEV;
  const shouldBypassAuth = isDevelopment && !hasLoggedOut;

  if (!isAuthenticated && !shouldBypassAuth) {
    return <ModernAuthPage />;
  }

  // If user is signed in but email is not verified, show verification banner
  // Skip verification banner in development mode
  if (user && pendingEmailVerification && !shouldBypassAuth && !isDevelopment) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <EmailVerificationBanner 
            email={user.email}
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
