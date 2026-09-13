/**
 * ProtocolDetailPage.tsx — Detailed Protocol View (Pure Crisp White Clinical Theme).
 */

import React from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ShieldAlert, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { SYNTHETIC_PROTOCOL } from '../../shared/fixtures/protocol.js';

export const ProtocolDetailPage: React.FC = () => {
  const { protocolId } = useParams();
  const protocol = SYNTHETIC_PROTOCOL;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 font-sans"
    >
      <div className="flex items-center gap-4 pb-6 border-b border-slate-200">
        <NavLink to="/protocols" className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-xs">
          <ArrowLeft className="w-5 h-5" />
        </NavLink>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
              {protocol.protocolId}
            </span>
            <span className="text-xs font-mono text-slate-500 font-semibold">Version {protocol.version}</span>
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900 mt-1">{protocol.title}</h1>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column: Structured Criteria */}
        <div className="space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Inclusion Criteria ({protocol.inclusionCriteria.length})
          </h2>

          <div className="space-y-4">
            {protocol.inclusionCriteria.map((c) => (
              <div key={c.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-700">{c.id}</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-50 text-emerald-700 rounded border border-emerald-200 font-bold">
                    Confidence ≥ {(c.confidenceThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 leading-snug">{c.description}</p>
                <div className="text-xs font-mono text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between font-medium">
                  <span>Field: <strong className="text-slate-900">{c.field}</strong></span>
                  <span>Op: <strong className="text-indigo-700 font-bold">{c.operator}</strong></span>
                  <span>Target: <strong className="text-slate-900">{Array.isArray(c.targetValue) ? c.targetValue.join(' - ') : String(c.targetValue)} {c.unit}</strong></span>
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 pt-4 font-mono">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            Exclusion Criteria ({protocol.exclusionCriteria.length})
          </h2>

          <div className="space-y-4">
            {protocol.exclusionCriteria.map((c) => (
              <div key={c.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-rose-700">{c.id}</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-rose-50 text-rose-700 rounded border border-rose-200 font-bold">
                    EXCLUSION
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 leading-snug">{c.description}</p>
                <div className="text-xs font-mono text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between font-medium">
                  <span>Field: <strong className="text-slate-900">{c.field}</strong></span>
                  <span>Op: <strong className="text-rose-700 font-bold">{c.operator}</strong></span>
                  <span>Target: <strong className="text-slate-900">{String(c.targetValue)} {c.unit}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Verbatim Protocol Text */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm font-mono text-xs text-slate-800 space-y-4 h-fit">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-wider">
              <FileText className="w-4 h-4 text-indigo-600" /> Verbatim Protocol Source
            </span>
            <span className="text-[10px] text-slate-500 font-semibold">SHA-256 Verified</span>
          </div>
          <pre className="whitespace-pre-wrap leading-relaxed text-slate-800 font-mono font-medium p-4 bg-slate-50 rounded-2xl border border-slate-200">
            {protocol.rawText}
          </pre>
        </div>
      </div>
    </motion.div>
  );
};
