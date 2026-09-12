/**
 * ForgotPasswordPage.tsx — Password Reset Request View.
 */

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldCheck, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../auth/useAuth.js';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await resetPassword(email);
      setSubmitted(true);
    } catch {
      // Handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e14] flex flex-col items-center justify-center p-4 relative font-sans">
      <div className="w-full max-w-md bg-[#0d1117]/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl z-10">
        <div className="text-center mb-8">
          <NavLink to="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-emerald-400 p-[1px]">
              <div className="w-full h-full bg-[#0a0e14] rounded-[11px] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <span className="font-display font-extrabold text-xl text-white tracking-tight">AegisTrial</span>
          </NavLink>
          <h1 className="text-2xl font-bold font-display text-white">Reset Password</h1>
          <p className="text-xs text-slate-400 mt-1">Enter your email to receive a password reset link</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start justify-between">
            <span>{error}</span>
            <button onClick={clearError} className="text-rose-400 hover:text-rose-200">×</button>
          </div>
        )}

        {submitted ? (
          <div className="text-center p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-2">Reset Email Sent</h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              We have dispatched a password reset link to <strong className="text-white">{email}</strong>. Please check your inbox.
            </p>
            <NavLink
              to="/auth/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </NavLink>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Work Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="coordinator@hospital.org"
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? 'Sending Request...' : 'Send Reset Link'}
            </button>

            <div className="pt-4 text-center">
              <NavLink to="/auth/login" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white">
                <ArrowLeft className="w-4 h-4" /> Back to Sign In
              </NavLink>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
