'use client';

import { useState, useEffect } from 'react';
import { History, CheckCircle2, XCircle, ExternalLink, Search, RefreshCw, Zap, Clock } from 'lucide-react';

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

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.repo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.commitSha && log.commitSha.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ? true : log.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const successCount = logs.filter((l) => l.status === 'success').length;
  const failedCount = logs.filter((l) => l.status === 'failed').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-emerald-400" />
            <span>Activity & Commit Audit Logs</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Historical log of all automated and manual empty commits pushed to your GitHub repositories.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Filter and stats row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111726]/60 border border-slate-800 rounded-2xl p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by repo, commit message, or SHA..."
            className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            All ({logs.length})
          </button>
          <button
            onClick={() => setStatusFilter('success')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            Success ({successCount})
          </button>
          <button
            onClick={() => setStatusFilter('failed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'failed'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-white bg-slate-900/60'
            }`}
          >
            Failed ({failedCount})
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#111726]/70 border border-slate-800 rounded-3xl overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <History className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
            <p>No activity logs found matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b101e] border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Trigger</th>
                  <th className="py-3 px-4 font-semibold">Repository & Branch</th>
                  <th className="py-3 px-4 font-semibold">Commit Message</th>
                  <th className="py-3 px-4 font-semibold">Date & Time</th>
                  <th className="py-3 px-4 font-semibold text-right">Commit SHA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Success
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-medium"
                          title={log.error || 'Failed'}
                        >
                          <XCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.type === 'automated' ? (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3 text-purple-400" />
                          <span>Auto</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400">
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>Manual</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-200 whitespace-nowrap">
                      <span>{log.repo}</span>
                      <span className="text-slate-500 text-[11px] ml-1.5 font-mono">({log.branch})</span>
                    </td>

                    <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={log.message}>
                      {log.message}
                      {log.error && (
                        <span className="block text-[11px] text-rose-400 mt-0.5 truncate">{log.error}</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
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
  );
}
