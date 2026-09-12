/**
 * ScreeningWorkspacePage.tsx — Core Governed Patient Screening Workspace (Pure Crisp White Clinical Theme).
 * Real-time Lyzr Evidence Extraction & Deterministic Boolean Gate Adjudication.
 *
 * NO SIMULATED FALLBACKS: If backend fails, renders an explicit, unmistakable SCREENING FAILED state.
 */

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  FileText,
  ChevronRight,
  Play,
  Eye,
  RefreshCw,
  User,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { DecisionProofDrawer, type DecisionProof } from '../components/ui/DecisionProofDrawer.js';
import { DEMO_PATIENTS, type PatientRecordFixture } from '../../shared/fixtures/patients.js';
import { useRunScreeningMutation } from '../lib/queries.js';
import type { AsyncResult } from '../../shared/contracts/screenings.js';

export const ScreeningWorkspacePage: React.FC = () => {
  const { patientId } = useParams();

  const patientsList: PatientRecordFixture[] = DEMO_PATIENTS;

  const [selectedPatient, setSelectedPatient] = useState<PatientRecordFixture>(
    patientsList.find((p) => p.patientId === patientId) || patientsList[0]!,
  );

  const [asyncResult, setAsyncResult] = useState<AsyncResult<{
    verdict: 'ELIGIBLE' | 'INELIGIBLE' | 'REQUIRES_HUMAN_REVIEW';
    proofs: DecisionProof[];
    sha256: string;
    runId: string;
  }>>({ status: 'idle' });

  const [activeProof, setActiveProof] = useState<DecisionProof | null>(null);
  const runMutation = useRunScreeningMutation();

  const handleRunScreening = () => {
    setAsyncResult({ status: 'loading' });

    const idempotencyKey = `idem-${selectedPatient.patientId}-${Date.now()}`;

    runMutation.mutate(
      {
        idempotencyKey,
        patientId: selectedPatient.patientId,
        protocolId: 'PROTO-T2D-CKD-001',
        patientText: selectedPatient.rawEhrText,
      },
      {
        onSuccess: (data) => {
          if (data && data.decisionProof) {
            setAsyncResult({
              status: 'success',
              data: {
                verdict: data.verdict,
                proofs: data.decisionProof,
                sha256: data.sha256 || '',
                runId: data.runId || '',
              },
            });
          } else {
            setAsyncResult({
              status: 'failed',
              error: {
                code: 'MALFORMED_RESPONSE',
                message: 'Backend returned invalid payload missing decision proofs.',
              },
            });
          }
        },
        onError: (err: any) => {
          setAsyncResult({
            status: 'failed',
            error: {
              code: err?.code || 'PIPELINE_ERROR',
              message: err?.message || 'Backend service unavailable or network error occurred.',
            },
          });
        },
      },
    );
  };

  const isScreening = asyncResult.status === 'loading';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 font-sans"
    >
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
              PROTO-T2D-CKD-001
            </span>
            <span className="text-xs font-mono text-slate-500 font-semibold">Patient: {selectedPatient.patientId}</span>
          </div>
          <h1 className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">Patient Eligibility Workspace</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Automated Medical Record Analysis & Rule-Based Eligibility Checks
          </p>
        </div>

        <button
          onClick={handleRunScreening}
          disabled={isScreening}
          className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all disabled:opacity-50 hover:scale-[1.02]"
        >
          {isScreening ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Running Eligibility Checks...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" /> Run Eligibility Check
            </>
          )}
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* Left 5 Cols: Patient Selector & EHR */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 font-mono">
              <User className="w-4 h-4 text-indigo-600" /> Sample Test Patients
            </h2>

            <div className="space-y-2">
              {patientsList.map((p) => (
                <button
                  key={p.patientId}
                  onClick={() => {
                    setSelectedPatient(p);
                    setAsyncResult({ status: 'idle' });
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border text-xs font-mono transition-all flex items-center justify-between ${
                    selectedPatient.patientId === p.patientId
                      ? 'bg-indigo-50 border-indigo-300 text-slate-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-900">{p.patientId}</div>
                    <div className="text-[10px] text-slate-500 font-sans mt-0.5 truncate max-w-[200px] font-medium">
                      {p.name || p.rawEhrText.slice(0, 45)}
                    </div>
                  </div>
                  {selectedPatient.patientId === p.patientId && (
                    <ChevronRight className="w-4 h-4 text-indigo-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3 font-mono text-xs text-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-indigo-600" /> Raw EHR Clinical Note
              </span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                PHI Safe Harbor Scanned
              </span>
            </div>
            <pre className="whitespace-pre-wrap leading-relaxed text-slate-800 font-mono text-[11px] p-4 bg-slate-50 rounded-2xl border border-slate-200">
              {selectedPatient.rawEhrText}
            </pre>
          </div>
        </div>

        {/* Right 7 Cols: Staggered Gate Evaluation */}
        <div className="lg:col-span-7 space-y-6">

          {/* Verdict Banner (Success State) */}
          <AnimatePresence mode="wait">
            {asyncResult.status === 'success' && (
              <motion.div
                key="verdict-banner"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className={`p-6 rounded-3xl border flex items-center justify-between shadow-md ${
                  asyncResult.data.verdict === 'ELIGIBLE'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : asyncResult.data.verdict === 'INELIGIBLE'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div>
                  <div className="text-[10px] uppercase font-mono font-bold tracking-wider opacity-80">
                    Deterministic Adjudication Verdict
                  </div>
                  <div className="text-2xl font-extrabold font-display tracking-tight mt-0.5">
                    VERDICT: {asyncResult.data.verdict}
                  </div>
                  <div className="text-[10px] font-mono mt-1 opacity-70">
                    Run ID: {asyncResult.data.runId} | SHA-256: {asyncResult.data.sha256.slice(0, 16)}...
                  </div>
                </div>
                <ShieldCheck className="w-10 h-10 shrink-0 text-emerald-600" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Explicit Failure Banner (Failed State) */}
          <AnimatePresence mode="wait">
            {asyncResult.status === 'failed' && (
              <motion.div
                key="error-banner"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="p-6 rounded-3xl bg-rose-50 border-2 border-rose-300 text-rose-900 shadow-md space-y-4"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-rose-100 border border-rose-200 shrink-0 text-rose-700">
                    <AlertTriangle className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold uppercase tracking-widest text-rose-700">
                      SCREENING FAILED — PIPELINE ERROR
                    </div>
                    <h3 className="text-xl font-extrabold font-display text-rose-900 mt-0.5">
                      Backend Service Error [{asyncResult.error.code}]
                    </h3>
                    <p className="text-xs text-rose-800 font-medium mt-1 leading-relaxed">
                      {asyncResult.error.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-rose-200/60">
                  <button
                    onClick={handleRunScreening}
                    className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retry Screening Execution
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Staggered Gate Rows */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono">
              Protocol Criteria Gate Evaluation Sequence
            </h2>

            {asyncResult.status === 'idle' && (
              <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 shadow-sm text-slate-500">
                <Play className="w-8 h-8 text-indigo-600 mx-auto mb-3 opacity-80 fill-indigo-600" />
                <p className="text-sm font-bold text-slate-900">Ready for Screening Execution</p>
                <p className="text-xs mt-1 text-slate-500 font-medium">Click "Execute Deterministic Screening" to run the governance pipeline.</p>
              </div>
            )}

            {isScreening && (
              <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                <p className="text-sm font-bold text-slate-900">Extracting Evidence & Resolving Boolean Gates...</p>
              </div>
            )}

            {asyncResult.status === 'success' && (
              <div className="space-y-3">
                {asyncResult.data.proofs.map((proof, idx) => (
                  <motion.div
                    key={proof.criterionId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.1 }}
                    onClick={() => setActiveProof(proof)}
                    className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow transition-all cursor-pointer group flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-indigo-700 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200">
                          {proof.criterionId}
                        </span>
                        <span className="text-xs font-bold text-slate-900 font-display">
                          {proof.reasoning}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono font-medium">
                        Extracted: <span className="text-indigo-700 font-bold">{String(proof.extractedValue)}</span> | Normalized: <span className="text-emerald-700 font-bold">{String(proof.normalizedValue)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                          proof.policyResult === 'PASSED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {proof.policyResult}
                      </span>
                      <button className="p-2 rounded-xl bg-slate-100 group-hover:bg-indigo-50 text-slate-500 group-hover:text-indigo-600 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <DecisionProofDrawer
        proof={activeProof}
        isOpen={Boolean(activeProof)}
        onClose={() => setActiveProof(null)}
      />
    </motion.div>
  );
};
