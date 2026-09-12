/**
 * ProtectedRoute.tsx — Route Guard Component.
 * Enforces authentication and optional email verification before rendering children.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth.js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerifiedEmail?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireVerifiedEmail = false,
}) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e14] flex flex-col items-center justify-center text-slate-300">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium tracking-wide">Authenticating AegisTrial session...</p>
      </div>
    );
  }

  // Redirect to login if user is unauthenticated
  if (!currentUser) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Redirect to verify-email if user is unverified and route requires verification
  if (requireVerifiedEmail && !currentUser.emailVerified) {
    return <Navigate to="/auth/verify-email" replace />;
  }

  return <>{children}</>;
};
