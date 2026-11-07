'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  GitCommit, 
  GitBranch, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Pause, 
  ExternalLink, 
  AlertCircle,
  Zap,
  TrendingUp,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface Repo {
  id: string;
  owner: string;
  repo: string;
  branch: string;
  totalCommitsPushed: number;
}

interface LogEntry {
  id: string;
  timestamp: string;
  repo: string;
  branch: string;
  commitSha?: string;
  commitUrl?: string;
  message: string;
  status: 'success' | 'failed';
  type: 'automated' | 'manual';
  error?: string;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState<{ url: string; sha: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [settings, setSettings] = useState<any>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<number[]>([]);

  const fetchData = async () => {
    try {
      const [settingsRes, reposRes, logsRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/repos'),
        fetch('/api/logs'),
      ]);

      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setSettings(s.settings);
      }

      if (reposRes.ok) {
        const r = await reposRes.json();
        setRepos(r.repositories);
      }

      if (logsRes.ok) {
        const l = await logsRes.json();
        setLogs(l.logs);
        setStats(l.stats);
        setUpcoming(l.upcomingTimestamps || []);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Heartbeat every 20s to refresh state and trigger scheduler tick
    const interval = setInterval(() => {
      fetch('/api/scheduler/tick', { method: 'POST' }).then(() => fetchData());
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleCommitNow = async () => {
    setCommitting(true);
    setErrorMsg(null);
    setCommitSuccess(null);

    try {
      const res = await fetch('/api/commit-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to execute commit');

      setCommitSuccess({ url: data.commitUrl, sha: data.commitSha });
      await fetchData();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setCommitting(false);
    }
  };

  const handleSwitchRepo = async (newRepoId: string) => {
    try {
      const res = await fetch('/api/repos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeRepoId: newRepoId }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAutomation = async () => {
    if (!settings) return;
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAutomationEnabled: !settings.isAutomationEnabled }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const activeRepo = repos.find((r) => r.id === settings?.activeRepoId);
  const todayProgress = stats ? Math.min(100, Math.round((stats.todayCount / (stats.targetCount || 1)) * 100)) : 0;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
          <span className="text-sm">Loading GitPulse dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner if token is missing */}
      {!settings?.hasGithubToken && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">GitHub Personal Access Token Required</p>
              <p className="text-xs text-amber-300/80">
                To start sending automated empty commits, configure your GitHub Personal Access Token in Settings.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/settings"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors"
          >
            Configure Token
          </Link>
        </div>
      )}

      {/* Hero / Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111726]/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>GitHub Contribution Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Activity Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Automating {settings?.dailyCommitCount || 5} empty null commits daily via GitHub Git API.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Repo Selector */}
          {repos.length > 0 && (
            <div className="relative">
              <select
                value={settings?.activeRepoId || ''}
                onChange={(e) => handleSwitchRepo(e.target.value)}
                className="appearance-none bg-[#0a0f1d] border border-slate-700/80 rounded-xl px-3.5 py-2.5 pr-8 text-xs font-medium text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
              >
                {repos.map((r) => (
                  <option key={r.id} value={r.id}>
                    Active: {r.owner}/{r.repo} ({r.branch})
                  </option>
                ))}
              </select>
              <GitBranch className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          )}

          {/* Pause / Resume Automation */}
          <button
            onClick={handleToggleAutomation}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
              settings?.isAutomationEnabled
                ? 'bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-700/80'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
          >
            {settings?.isAutomationEnabled ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-400" />
                <span>Pause Auto</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                <span>Resume Auto</span>
              </>
            )}
          </button>

          {/* Manual Trigger Button */}
          <button
            onClick={handleCommitNow}
            disabled={committing || !settings?.hasGithubToken || !activeRepo}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 transition-all shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 group"
          >
            <Zap className={`w-3.5 h-3.5 ${committing ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
            <span>{committing ? 'Pushing Commit...' : 'Commit Now'}</span>
          </button>
        </div>
      </div>

      {/* Instant Commit Feedback Notifications */}
      {commitSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Null commit pushed successfully! SHA: <code className="bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">{commitSuccess.sha.substring(0, 7)}</code>
            </span>
          </div>
          <a
            href={commitSuccess.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-semibold text-emerald-400 hover:underline"
          >
            <span>View on GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-2.5 text-xs">
          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Repo Card */}
        <div className="bg-[#111726]/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Target Repository</span>
            <GitBranch className="w-4 h-4 text-emerald-400" />
          </div>
          {activeRepo ? (
            <div>
              <p className="text-base font-bold text-white truncate">
                {activeRepo.owner}/{activeRepo.repo}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-400">Branch: <code className="text-emerald-400">{activeRepo.branch}</code></span>
                <a
                  href={`https://github.com/${activeRepo.owner}/${activeRepo.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-slate-400">No active repo</p>
              <Link href="/dashboard/repositories" className="text-xs text-emerald-400 hover:underline mt-1 inline-block">
                + Add Repository
              </Link>
            </div>
          )}
        </div>

        {/* Today's Commits Progress */}
        <div className="bg-[#111726]/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-2">
            <span>Today's Commits</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats?.todayCount || 0}</span>
            <span className="text-xs text-slate-400">/ {stats?.targetCount || settings?.dailyCommitCount || 5} target</span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${todayProgress}%` }}
            />
          </div>
        </div>

        {/* Schedule Mode */}
        <div className="bg-[#111726]/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Schedule Mode</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-base font-bold text-white capitalize">
            {settings?.scheduleMode === 'random' ? 'Random Timing' : 'Fixed Interval'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Window: {settings?.activeHoursStart || 9}:00 - {settings?.activeHoursEnd || 22}:00
          </p>
        </div>

        {/* All-time Total Pushed */}
        <div className="bg-[#111726]/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>All-time Null Commits</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {stats?.totalPushed || 0}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            100% genuine contribution points
          </p>
        </div>
      </div>

      {/* Two Column Layout: Upcoming Schedule & Recent Commits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming for today (1 col) */}
        <div className="bg-[#111726]/60 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Remaining for Today</span>
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {upcoming.length} upcoming
            </span>
          </div>

          {upcoming.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/40 mb-2" />
              <p>All scheduled commits for today completed!</p>
              <p className="text-[11px] text-slate-600 mt-1">New schedule will trigger at midnight.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {upcoming.map((ts, idx) => {
                const date = new Date(ts);
                const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#090d16]/60 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>Commit #{stats.todayCount + idx + 1}</span>
                    </div>
                    <span className="font-mono text-slate-400 font-medium">{timeStr}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 leading-relaxed">
            💡 <strong>Random Mode</strong> picks unpredictable timestamps within your active hours so commits look natural on GitHub.
          </div>
        </div>

        {/* Recent Commit History Table (2 cols) */}
        <div className="lg:col-span-2 bg-[#111726]/60 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-emerald-400" />
              <span>Recent Commit Activity</span>
            </h2>
            <Link
              href="/dashboard/logs"
              className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              View Full Logs
            </Link>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              <GitCommit className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-40" />
              <p>No commits recorded yet.</p>
              <p className="mt-1">Click "Commit Now" above to push your first empty commit!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Repository</th>
                    <th className="pb-3 font-medium">Message</th>
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium text-right">Commit SHA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {logs.slice(0, 7).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3">
                        {log.status === 'success' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px]">
                            <XCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="py-3 font-medium text-slate-300 truncate max-w-[130px]">
                        {log.repo}
                      </td>
                      <td className="py-3 text-slate-400 truncate max-w-[200px]" title={log.message}>
                        {log.message}
                      </td>
                      <td className="py-3 text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 text-right">
                        {log.commitSha && log.commitUrl ? (
                          <a
                            href={log.commitUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-emerald-400 hover:text-emerald-300 hover:underline"
                          >
                            <span>{log.commitSha.substring(0, 7)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
