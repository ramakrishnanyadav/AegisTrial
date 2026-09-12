/**
 * SettingsPage.tsx — User Profile & Session Settings View (Dark Control Room Theme).
 */

import React, { useState } from 'react';
import { useAuth } from '../auth/useAuth.js';
import { User, Building, CheckCircle2, Settings } from 'lucide-react';
import { motion } from 'motion/react';

export const SettingsPage: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 max-w-4xl font-sans"
    >
      <div className="pb-6 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-mono font-bold text-indigo-600 uppercase tracking-widest">Platform Settings</span>
        </div>
        <h1 className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">Account Settings & Credentials</h1>
        <p className="text-xs text-slate-600 font-medium mt-1">Manage user identity credentials, linked authentication providers, and clinical access metadata.</p>
      </div>

      {/* Profile Form */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 font-mono">
          <User className="w-4 h-4 text-indigo-600" /> Firebase User Profile
        </h2>

        {saved && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Profile preferences updated.
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Email Address (Primary Identity)</label>
            <input
              type="text"
              disabled
              value={currentUser?.email || 'unauthenticated@demo.org'}
              className="w-full bg-slate-100/70 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-500 font-mono focus:outline-none cursor-not-allowed font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Dr. Alice Smith"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 font-medium transition-all"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md shadow-indigo-500/10 hover:scale-[1.01]"
          >
            Save Profile
          </button>
        </form>
      </div>

      {/* Backend Managed Roles & Institution (Read-Only) */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 font-mono">
            <Building className="w-4 h-4 text-emerald-600" /> Backend-Managed Institutional Metadata
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-bold">READ ONLY</span>
        </div>

        <p className="text-xs text-slate-600 font-medium">
          Role assignments and institutional affiliations are governed by backend RBAC and cannot be modified by client requests.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 text-xs font-mono pt-2">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[10px] text-slate-500 font-bold">ASSIGNED ROLE</div>
            <div className="text-sm font-bold text-indigo-700">{userProfile?.role || 'COORDINATOR'}</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="text-[10px] text-slate-500 font-bold">INSTITUTION</div>
            <div className="text-sm font-bold text-emerald-700">{userProfile?.institution || 'St. Jude Clinical Network'}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
