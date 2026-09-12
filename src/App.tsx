/**
 * App.tsx — AegisTrial Master Application Entry.
 * Renders AppProviders providing React Router, AuthProvider, and React Query.
 */

import React from 'react';
import { AppProviders } from './app/providers.js';

export default function App() {
  return <AppProviders />;
}
