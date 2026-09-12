/**
 * DecisionProofDrawer.tsx — Radix Dialog-based "Why?" Drawer.
 * Light theme rendering canonical DecisionProof artifacts.
 */

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, ShieldCheck, FileText, Hash, ArrowRightLeft } from 'lucide-react';
import { getVerdictBadgeClass } from '../../lib/utils.js';

export interface DecisionProof {
  protocolHash: string;
  protocolArtifactHash?: string;
  criteriaHash?: string;
  criterionId: string;
  sourceRefs: Array<{ docId: string; textExcerpt: string; timestamp?: string }>;
  extractedValue: number | string | null;
  normalizedValue: number | string | null;
  ontologyMapping?: string;
  unitConversion?: string;
  temporalEvaluation?: string;
  operator: string;
  comparisonResult: 'met' | 'not_met' | 'insufficient_data';
  policyResult: 'PASSED' | 'BLOCKED' | 'REQUIRES_REVIEW';
  finalResult: 'met' | 'not_met' | 'insufficient_data';
  reasonCode: string;
  reasoning: string;
  artifactHash: string;
}

interface DecisionProofDrawerProps {
  proof: DecisionProof | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DecisionProofDrawer: React.FC<DecisionProofDrawerProps> = ({ proof, isOpen, onClose }) => {
  if (!proof) return null;

  const badgeStyle = getVerdictBadgeClass(proof.policyResult);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white border-l border-slate-200 p-6 z-50 overflow-y-auto shadow-2xl focus:outline-none text-slate-800">
          <div className="flex items-start justify-between border-b border-slate-200 pb-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded">
                  {proof.criterionId}
                </span>
                <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                  {proof.policyResult}
                </span>
              </div>
              <Dialog.Title className="text-xl font-bold font-display text-slate-900">
                Decision Proof & Traceability Audit
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-6 text-sm">
            {/* Reasoning summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Deterministic Reasoning Output
              </div>
              <p className="text-slate-900 font-semibold leading-relaxed">{proof.reasoning}</p>
              <div className="mt-2 text-xs font-mono text-slate-500">
                Reason Code: <span className="text-indigo-700 font-bold">{proof.reasonCode}</span>
              </div>
            </div>

            {/* Extracted vs Normalized Comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200">
                <div className="text-xs text-indigo-800 font-bold mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  AI Extracted Value
                </div>
                <div className="text-xl font-mono font-bold text-slate-900">
                  {proof.extractedValue !== null ? String(proof.extractedValue) : 'N/A'}
                </div>
                <div className="text-[11px] text-indigo-700 font-medium mt-1">Lyzr Extraction Agent</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                <div className="text-xs text-emerald-800 font-bold mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  Normalized Value
                </div>
                <div className="text-xl font-mono font-bold text-slate-900">
                  {proof.normalizedValue !== null ? String(proof.normalizedValue) : 'N/A'}
                </div>
                <div className="text-[11px] text-emerald-700 font-medium mt-1">Deterministic Rule Engine</div>
              </div>
            </div>

            {/* Unit & Ontology Details */}
            {(proof.unitConversion || proof.ontologyMapping || proof.temporalEvaluation) && (
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                {proof.unitConversion && (
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <div className="text-slate-500 font-medium">Unit Conversion:</div>
                      <div className="text-slate-900 font-mono font-bold">{proof.unitConversion}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Source Citations */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Source EHR Citation Excerpts ({proof.sourceRefs.length})
              </h4>
              <div className="space-y-2">
                {proof.sourceRefs.map((ref, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800">
                    <div className="text-[10px] font-bold text-indigo-700 mb-1">Doc: {ref.docId}</div>
                    <p className="italic text-slate-900 font-sans font-medium">"{ref.textExcerpt}"</p>
                  </div>
                ))}
              </div>
            </div>

            {/* SHA-256 Canonical Artifact Hash */}
            <div className="pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-indigo-600" />
                  Canonical SHA-256 Hash
                </span>
                <span className="font-mono text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200 font-bold">
                  {proof.artifactHash}
                </span>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
