/**
 * CommandPalette.tsx — Radix-based ⌘K Power-User Command Palette (White Light Theme).
 */

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router-dom';
import { Search, Activity, FileText, ShieldAlert, BarChart2, Settings, UserCheck, Key } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const commands = [
    { id: 'dashboard', label: 'Go to Clinical Overview', icon: Activity, path: '/dashboard' },
    { id: 'screening', label: 'Open Patient Screening (PAT-001)', icon: UserCheck, path: '/screening/PAT-001-ELIGIBLE' },
    { id: 'protocols', label: 'View Trial Protocols', icon: FileText, path: '/protocols' },
    { id: 'audit', label: 'Audit & Compliance Records (RUN-101)', icon: Key, path: '/audit/RUN-101' },
    { id: 'benchmarks', label: 'Accuracy & Performance Benchmarks', icon: BarChart2, path: '/benchmarks' },
    { id: 'attacks', label: 'Safety & Security Stress Tests', icon: ShieldAlert, path: '/attacks' },
    { id: 'settings', label: 'Account & Platform Settings', icon: Settings, path: '/settings' },
  ];

  const filteredCommands = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content className="fixed top-1/4 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border border-slate-200 rounded-3xl p-4 z-50 shadow-2xl focus:outline-none text-slate-800 font-sans">
          <div className="flex items-center gap-3 px-3 pb-3 border-b border-slate-200">
            <Search className="w-5 h-5 text-indigo-600 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search clinical routes..."
              className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-semibold"
            />
            <kbd className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200 font-bold">
              ESC
            </kbd>
          </div>

          <div className="mt-3 max-h-72 overflow-y-auto space-y-1">
            {filteredCommands.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 font-medium">No matching command found</div>
            ) : (
              filteredCommands.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => handleSelect(cmd.path)}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-indigo-900 hover:bg-indigo-50 border border-transparent transition-all group text-left"
                  >
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    <span className="flex-1">{cmd.label}</span>
                    <span className="text-[10px] font-mono text-slate-400 group-hover:text-indigo-600">{cmd.path}</span>
                  </button>
                );
              })
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
