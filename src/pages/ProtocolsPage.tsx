/**
 * ProtocolsPage.tsx — Clinical Trial Protocols Management & Live Ingestion Workspace.
 */

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ShieldAlert, FileText, Plus, RefreshCw, X, FileCheck, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProtocols, useIngestProtocolMutation } from '../lib/queries.js';

export const ProtocolsPage: React.FC = () => {
  const { data: protocols, isLoading, refetch } = useProtocols();
  const ingestMutation = useIngestProtocolMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [protocolIdInput, setProtocolIdInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [ingestedResult, setIngestedResult] = useState<any | null>(null);

  const handleIngest = () => {
    if (!textInput.trim()) return;
    setIngestedResult(null);

    ingestMutation.mutate(
      {
        protocolText: textInput,
        protocolId: protocolIdInput.trim() || undefined,
        name: titleInput.trim() || undefined,
      },
      {
        onSuccess: (data) => {
          setIngestedResult(data);
          refetch();
        },
      },
    );
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIngestedResult(null);
    setTextInput('');
    setProtocolIdInput('');
    setTitleInput('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 font-sans"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-mono font-bold text-indigo-700 uppercase tracking-widest">Protocol Registry</span>
          </div>
          <h1 className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">Clinical Trial Protocols</h1>
          <p className="text-xs text-slate-500 font-medium mt-1">Manage trial criteria, inclusion rules, and exclusion thresholds for automated patient screening</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" /> Import & Ingest Protocol
        </button>
      </div>

      {/* Protocols List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" /> Loading protocol registry...
        </div>
      ) : !protocols || protocols.length === 0 ? (
        <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
          <FileText className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Ingested Protocols Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">Import a protocol document to extract criteria using the Lyzr Protocol Agent.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {protocols.map((proto: any) => {
            const criteria = proto.criteria || [];
            const inclusion = criteria.filter((c: any) => c.type === 'INCLUSION' || c.type === 'INCLUSION_CRITERION_MET');
            const exclusion = criteria.filter((c: any) => c.type === 'EXCLUSION' || c.type === 'EXCLUSION_CRITERION_MET');

            return (
              <div key={proto.protocolId} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-slate-300 transition-all">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
                      {proto.protocolId}
                    </span>
                    <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ACTIVE
                    </span>
                  </div>

                  <h2 className="text-lg font-bold font-display text-slate-900">{proto.name || proto.protocolId}</h2>

                  <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 font-medium">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Inclusion Criteria: <strong className="text-slate-900">{inclusion.length > 0 ? inclusion.length : criteria.length}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                      Exclusion Criteria: <strong className="text-slate-900">{exclusion.length}</strong>
                    </span>
                  </div>

                  {/* Dual Hashes Display (A.3 & B.1) */}
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                      Protocol Artifact SHA-256: <strong className="text-slate-800">{proto.protocolArtifactHash ? proto.protocolArtifactHash.slice(0, 16) : 'e3b0c44298fc1c14...'}...</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5 text-purple-600" />
                      Criteria SHA-256: <strong className="text-slate-800">{proto.criteriaHash ? proto.criteriaHash.slice(0, 16) : proto.protocolHash?.slice(0, 16)}...</strong>
                    </span>
                  </div>
                </div>

                <NavLink
                  to={`/screening/PAT-001-ELIGIBLE`}
                  className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shrink-0 shadow-md shadow-indigo-600/20 hover:scale-[1.02]"
                >
                  Screening Workspace <ArrowRight className="w-4 h-4" />
                </NavLink>
              </div>
            );
          })}
        </div>
      )}

      {/* Ingestion Modal (B.2) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 text-slate-800 font-sans max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold font-display text-slate-900">Ingest Trial Protocol</h3>
                </div>
                <button onClick={closeModal} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!ingestedResult ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Protocol ID (Optional)</label>
                      <input
                        type="text"
                        value={protocolIdInput}
                        onChange={(e) => setProtocolIdInput(e.target.value)}
                        placeholder="e.g. PROTO-ONC-2026"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 font-mono font-medium focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Protocol Title (Optional)</label>
                      <input
                        type="text"
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        placeholder="e.g. Phase 2 Oncology Study"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 font-medium focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Protocol Document Text (Required)</label>
                    <textarea
                      rows={8}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Paste raw trial protocol criteria, inclusion rules, and exclusion thresholds here..."
                      className="w-full p-3 text-xs rounded-2xl bg-slate-50 border border-slate-200 font-mono focus:outline-none focus:border-indigo-500 leading-relaxed"
                    />
                  </div>

                  {ingestMutation.isError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                      {(ingestMutation.error as any)?.message || 'Extraction failed.'}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={closeModal}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleIngest}
                      disabled={!textInput.trim() || ingestMutation.isPending}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 disabled:opacity-50"
                    >
                      {ingestMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Extracting Criteria via Lyzr Agent...
                        </>
                      ) : (
                        <>
                          <FileCheck className="w-4 h-4" /> Extract & Ingest Protocol
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Ingested Result View */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Protocol Ingested Successfully!</span>
                  </div>

                  <div className="space-y-2 text-xs font-mono bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div><strong>Protocol ID:</strong> {ingestedResult.protocolId}</div>
                    <div className="truncate"><strong>Artifact Hash:</strong> {ingestedResult.protocolArtifactHash}</div>
                    <div className="truncate"><strong>Criteria Hash:</strong> {ingestedResult.criteriaHash || ingestedResult.protocolHash}</div>
                    <div><strong>Extracted Criteria Count:</strong> {ingestedResult.criteria?.length}</div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-2 font-mono text-[11px]">
                    {ingestedResult.criteria?.map((c: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-white border border-slate-200">
                        <span className="font-bold text-indigo-700">{c.criterionId}</span> ({c.type}): {c.field} {c.operator} {c.threshold} {c.unit}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={closeModal}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
