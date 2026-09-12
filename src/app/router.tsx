/**
 * router.tsx — Application React Router Setup.
 * Multi-page routable architecture replacing legacy tab switcher.
 */

import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../auth/ProtectedRoute.js';
import { LayoutShell } from '../components/layout/LayoutShell.js';

import { LandingPage } from '../pages/LandingPage.js';
import { LoginPage } from '../pages/auth/LoginPage.js';
import { RegisterPage } from '../pages/auth/RegisterPage.js';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage.js';
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage.js';

import { DashboardPage } from '../pages/DashboardPage.js';
import { ProtocolsPage } from '../pages/ProtocolsPage.js';
import { ProtocolDetailPage } from '../pages/ProtocolDetailPage.js';
import { ScreeningWorkspacePage } from '../pages/ScreeningWorkspacePage.js';
import { AuditTrailPage } from '../pages/AuditTrailPage.js';
import { BenchmarksPage } from '../pages/BenchmarksPage.js';
import { AttacksPage } from '../pages/AttacksPage.js';
import { SettingsPage } from '../pages/SettingsPage.js';

function withProtectedLayout(Component: React.ComponentType) {
  return (
    <ProtectedRoute>
      <LayoutShell>
        <Component />
      </LayoutShell>
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/auth/login',
    element: <LoginPage />,
  },
  {
    path: '/auth/register',
    element: <RegisterPage />,
  },
  {
    path: '/auth/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/auth/verify-email',
    element: <VerifyEmailPage />,
  },
  {
    path: '/dashboard',
    element: withProtectedLayout(DashboardPage),
  },
  {
    path: '/protocols',
    element: withProtectedLayout(ProtocolsPage),
  },
  {
    path: '/protocols/:protocolId',
    element: withProtectedLayout(ProtocolDetailPage),
  },
  {
    path: '/screening/:patientId',
    element: withProtectedLayout(ScreeningWorkspacePage),
  },
  {
    path: '/audit/:runId',
    element: withProtectedLayout(AuditTrailPage),
  },
  {
    path: '/benchmarks',
    element: withProtectedLayout(BenchmarksPage),
  },
  {
    path: '/attacks',
    element: withProtectedLayout(AttacksPage),
  },
  {
    path: '/settings',
    element: withProtectedLayout(SettingsPage),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
