'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Activity, GitBranch, Settings, History, LogOut, CheckCircle2, PauseCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface NavbarProps {
  isAutomationEnabled?: boolean;
  activeRepoName?: string | null;
}

export default function Navbar({ isAutomationEnabled = true, activeRepoName }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  const navItems = [
    { label: 'Overview', href: '/dashboard', icon: Activity },
    { label: 'Repositories', href: '/dashboard/repositories', icon: GitBranch },
    { label: 'Scheduler & Settings', href: '/dashboard/settings', icon: Settings },
    { label: 'Activity Logs', href: '/dashboard/logs', icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0b101e]/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
                  GitPulse
                  <span className="text-[10px] uppercase font-semibold tracking-wider bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/20">
                    Active
                  </span>
                </span>
                {activeRepoName && (
                  <span className="text-[11px] text-slate-400 truncate max-w-[150px] sm:max-w-[200px]">
                    Repo: <span className="text-slate-200 font-medium">{activeRepoName}</span>
                  </span>
                )}
              </div>
            </Link>

            {/* Nav items desktop */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-slate-800/80 text-white shadow-inner border border-slate-700/60'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Status & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-xs">
              {isAutomationEnabled ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-emerald-400 font-medium">Running</span>
                </>
              ) : (
                <>
                  <span className="inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                  <span className="text-amber-400 font-medium">Paused</span>
                </>
              )}
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/50 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Nav row */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-2 border-t border-slate-800/60 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
