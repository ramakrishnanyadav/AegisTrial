/**
 * VerifyEmailPage.tsx — Dedicated Email Verification Guard View.
 */

import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ShieldCheck, MailCheck, RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../../auth/useAuth.js';

export const VerifyEmailPage: React.FC = () => {
  const { currentUser, resendEmailVerification, logout, error } = useAuth();
  const navigate = useNavigate();
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    try {
      await resendEmailVerification();
      setResent(true);
    } catch {
      // Handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (currentUser) {
      await currentUser.reload();
      if (currentUser.emailVerified) {
        navigate('/dashboard', { replace: true });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-[#0d1117]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl text-center">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4 text-indigo-400">
          <MailCheck className="w-6 h-6" />
        </div>

        <h1 className="text-xl font-bold font-display text-white mb-2">Verify Your Email Address</h1>
        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
          We have sent a verification link to <strong className="text-indigo-300">{currentUser?.email || 'your email address'}</strong>.
          Please click the link in your email to access governed clinical tools.
        </p>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {resent && (
          <div className="mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
            A new verification link has been dispatched to your inbox.
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleRefresh}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all"
          >
            <RefreshCw className="w-4 h-4" /> I've Verified — Continue to Dashboard
          </button>

          <button
            onClick={handleResend}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all disabled:opacity-50"
          >
            {loading ? 'Resending...' : 'Resend Verification Email'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-xs">
          <button onClick={() => logout()} className="text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
          <NavLink to="/" className="text-indigo-400 hover:text-indigo-300 font-semibold">
            Return to Landing Page
          </NavLink>
        </div>
      </div>
    </div>
  );
};
