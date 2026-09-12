/**
 * AttacksPage.tsx — Interactive 6-Attack Vector Pipeline Visualizer (Crisp White Clinical Theme).
 *
 * NO SIMULATED FALLBACKS: Uses canonical attack definitions from shared/contracts/attacks.ts.
 * On backend failure, renders explicit EXECUTION FAILED state.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, RefreshCw, ShieldCheck, ArrowRight, ShieldAlert, AlertTriangle } from 'lucide-react';
import { runAttack } from '../lib/api.js';
import { CANONICAL_ATTACKS, type AttackDefinition, type AttackExecutionResult } from '../../shared/contracts/attacks.js';
import type { AsyncResult } from '../../shared/contracts/screenings.js';

export const AttacksPage: React.FC = () => {
  const attacksList: AttackDefinition[] = CANONICAL_ATTACKS;

  const [activeAttackId, setActiveAttackId] = useState<string | null>(null);
  const [attackStates, setAttackStates] = useState<Record<string, AsyncResult<AttackExecutionResult>>>({});

  const handleExecuteAttack = async (attackId: string) => {
    setActiveAttackId(attackId);
    setAttackStates((prev) => ({ ...prev, [attackId]: { status: 'loading' } }));

    try {
      const res = await runAttack(attackId);
      setAttackStates((prev) => ({
        ...prev,
        [attackId]: { status: 'success', data: res },
      }));
    } catch (err: any) {
      setAttackStates((prev) => ({
        ...prev,
        [attackId]: {
          status: 'failed',
          error: {
            code: err?.code || 'EXECUTION_FAILED',
            message: err?.message || 'Attack execution failed. Backend service error or unavailable.',
          },
        },
      }));
    } finally {
      setActiveAttackId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 font-sans"
    >
      <div className="pb-6 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <span className="text-xs font-mono font-bold text-rose-600 uppercase tracking-widest">Zero-Trust Sandbox</span>
        </div>
        <h1 className="text-3xl font-extrabold font-display text-slate-900 tracking-tight">Safety & Security Stress Tests</h1>
        <p className="text-xs text-slate-600 font-medium mt-1">
          Interactive security suite testing AI protection against prompt injections, patient data leaks, temporal mismatch, and unit conversion errors
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {attacksList.map((attack) => {
          const state = attackStates[attack.id] || { status: 'idle' };
          const isRunning = state.status === 'loading' && activeAttackId === attack.id;

          return (
            <div key={attack.id} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
                  {attack.id}
                </span>
                <span className="text-xs font-mono text-slate-500 font-semibold">{attack.target}</span>
              </div>

              <div>
                <h2 className="text-base font-bold font-display text-slate-900">{attack.name}</h2>
                <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">{attack.desc}</p>
              </div>

              {/* Animated Attack Pipeline Visualizer */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                  <span>Attack Source</span>
                  <span>Safety Gate</span>
                  <span>Outcome</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="p-2 rounded-lg bg-rose-100/70 text-rose-800 border border-rose-200 text-[10px] font-bold">
                    Payload
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />

                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                    {state.status === 'success' ? state.data.gateTriggered : attack.expectedGate}
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />

                  <div className={`p-2 rounded-lg text-[10px] border font-bold ${
                    state.status === 'success'
                      ? 'bg-emerald-100/70 text-emerald-800 border-emerald-300'
                      : state.status === 'failed'
                      ? 'bg-rose-100/70 text-rose-800 border-rose-300'
                      : 'bg-slate-200/60 text-slate-600 border-slate-300'
                  }`}>
                    {state.status === 'success' ? 'BLOCKED' : state.status === 'failed' ? 'FAILED' : 'Ready'}
                  </div>
                </div>

                {state.status === 'success' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed font-sans font-medium"
                  >
                    <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-800">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Attack Neutralized ({state.data.executionMs}ms)
                    </div>
                    {state.data.reason}
                  </motion.div>
                )}

                {state.status === 'failed' && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-[11px] leading-relaxed font-sans font-medium"
                  >
                    <div className="font-bold flex items-center gap-1.5 mb-1 text-rose-800">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      EXECUTION FAILED [{state.error.code}]
                    </div>
                    {state.error.message}
                  </motion.div>
                )}
              </div>

              <button
                onClick={() => handleExecuteAttack(attack.id)}
                disabled={isRunning}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:scale-[1.01]"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" /> Simulating Attack...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-white fill-white" /> Trigger Attack Simulation
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
