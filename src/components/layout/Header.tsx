/**
 * Header.tsx — Persistent White Clinical Glass Header.
 */

import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ShieldCheck, Search, Activity, FileText, BarChart2, ShieldAlert, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../auth/useAuth.js';
import { CommandPalette } from '../ui/CommandPalette.js';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

export const Header: React.FC = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navLinks = [
    { path: '/dashboard', label: 'Overview', icon: Activity },
    { path: '/screening/PAT-001-ELIGIBLE', label: 'Patient Screening', icon: ShieldCheck },
    { path: '/protocols', label: 'Trial Protocols', icon: FileText },
    { path: '/audit/RUN-101', label: 'Audit & Compliance', icon: FileText },
    { path: '/benchmarks', label: 'Accuracy & Benchmarks', icon: BarChart2 },
    { path: '/attacks', label: 'Safety & Security Tests', icon: ShieldAlert },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/80 border-b border-slate-200/80 px-4 lg:px-8 py-3 transition-colors shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo Brand */}
          <div className="flex items-center gap-6">
            <NavLink to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 p-[1px] shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-white rounded-[11px] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <div>
                <span className="font-display font-extrabold text-base text-slate-900 tracking-tight">AegisTrial</span>
                <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold">v4.0</span>
              </div>
            </NavLink>

            {/* Navigation Routes */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-slate-100 text-indigo-700 border border-slate-200 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`
                    }
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {link.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-medium transition-all"
            >
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 bg-white text-slate-500 rounded border border-slate-200 shadow-xs">⌘K</kbd>
            </button>

            {currentUser ? (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button className="flex items-center gap-2 p-1 pl-2.5 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200/60 transition-all text-xs font-semibold text-slate-800 focus:outline-none">
                    <span className="font-mono text-indigo-700">{userProfile?.role || 'COORDINATOR'}</span>
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                      {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                    </div>
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="min-w-[200px] bg-white border border-slate-200 rounded-2xl p-2 z-50 shadow-xl text-xs text-slate-700 animate-fade-in font-medium">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <div className="font-bold text-slate-900 truncate">{currentUser.email}</div>
                      <div className="text-[10px] text-slate-500">{userProfile?.institution || 'Clinical Network'}</div>
                    </div>
                    <DropdownMenu.Item
                      onClick={() => navigate('/settings')}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-indigo-600" />
                      Settings & Profile
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      onClick={() => logout()}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer hover:bg-rose-50 text-rose-700 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ) : (
              <NavLink
                to="/auth/login"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
              >
                Sign In
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </>
  );
};
