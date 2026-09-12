/**
 * LayoutShell.tsx — Protected Page Wrapper (Crisp White Clinical Theme).
 * Premium white surface container, crisp slate typography, and clinical header/footer.
 */

import React from 'react';
import { Header } from './Header.js';

export const LayoutShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500/20 selection:text-indigo-900">
      <Header />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8">
        {children}
      </main>
      <footer className="border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-500 font-mono bg-white">
        AegisTrial v4 — 21 CFR Part 11 & GCP Governed Clinical Adjudication Engine — Powered by Lyzr Agent API
      </footer>
    </div>
  );
};
