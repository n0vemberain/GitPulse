'use client';

import { useState, useEffect } from 'react';
import { GitBranch, Plus, Check, Trash2, ExternalLink, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Repo {
  id: string;
  owner: string;
  repo: string;
  branch: string;
  createdAt: string;
  totalCommitsPushed: number;
  lastCommitAt?: string;
}

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [activeRepoId, setActiveRepoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [urlOrPath, setUrlOrPath] = useState('');
  const [branch, setBranch] = useState('main');
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchRepos = async () => {
    try {
      const res = await fetch('/api/repos');
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repositories);
        setActiveRepoId(data.activeRepoId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const handleAddRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setAdding(true);

    try {
      const res = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlOrPath, branch }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add repository');

      setFormSuccess(`Successfully added ${data.repository.owner}/${data.repository.repo}`);
      setUrlOrPath('');
      setBranch('main');
      await fetchRepos();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      const res = await fetch('/api/repos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activeRepoId: id }),
      });

      if (res.ok) {
        setActiveRepoId(id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}" from GitPulse?`)) return;

    try {
      const res = await fetch(`/api/repos?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await fetchRepos();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mr-2" />
        <span>Loading repositories...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-emerald-400" />
          <span>Repository Management</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Add new GitHub repositories and choose which one actively receives daily automated commits.
        </p>
      </div>

      {/* Add Repository Card */}
      <div className="bg-[#111726]/70 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Add New Repository</span>
        </h2>

        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {formSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{formSuccess}</span>
          </div>
        )}

        <form onSubmit={handleAddRepo} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-7">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              GitHub Repository (URL or owner/repo)
            </label>
            <input
              type="text"
              required
              value={urlOrPath}
              onChange={(e) => setUrlOrPath(e.target.value)}
              placeholder="e.g. username/repo-name or https://github.com/..."
              className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Target Branch
            </label>
            <input
              type="text"
              required
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={adding}
              className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10"
            >
              {adding ? (
                <span>Adding...</span>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add Repo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Repositories List */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-white">
          Configured Repositories ({repos.length})
        </h2>

        {repos.length === 0 ? (
          <div className="bg-[#111726]/40 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-500 text-xs">
            <GitBranch className="w-10 h-10 mx-auto text-slate-600 mb-3 opacity-40" />
            <p className="text-sm font-medium text-slate-400">No repositories added yet</p>
            <p className="mt-1">Add your target repository above to begin scheduling automated null commits.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repos.map((repo) => {
              const isActive = repo.id === activeRepoId;
              return (
                <div
                  key={repo.id}
                  className={`relative p-5 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-[#111726] border-emerald-500/50 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20'
                      : 'bg-[#111726]/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">
                          {repo.owner}/{repo.repo}
                        </h3>
                        {isActive && (
                          <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                            Active Target
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span>Branch: <code className="text-slate-300 font-mono">{repo.branch}</code></span>
                        <span>•</span>
                        <span>{repo.totalCommitsPushed || 0} commits pushed</span>
                      </div>
                    </div>

                    <a
                      href={`https://github.com/${repo.owner}/${repo.repo}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                      title="Open on GitHub"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  {repo.lastCommitAt && (
                    <p className="text-[11px] text-slate-500 mt-3">
                      Last commit: {new Date(repo.lastCommitAt).toLocaleString()}
                    </p>
                  )}

                  {/* Actions row */}
                  <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-800/80">
                    <button
                      onClick={() => handleSetActive(repo.id)}
                      disabled={isActive}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isActive ? 'Currently Active' : 'Switch to this Repo'}</span>
                    </button>

                    <button
                      onClick={() => handleDelete(repo.id, `${repo.owner}/${repo.repo}`)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Remove Repository"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
