'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, 
  Key, 
  Clock, 
  Shuffle, 
  Lock, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Info,
  Calendar,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings states
  const [githubToken, setGithubToken] = useState('');
  const [hasExistingToken, setHasExistingToken] = useState(false);
  const [maskedToken, setMaskedToken] = useState('');
  const [dailyCommitCount, setDailyCommitCount] = useState<number>(5);
  const [scheduleMode, setScheduleMode] = useState<'random' | 'interval'>('random');
  const [activeHoursStart, setActiveHoursStart] = useState<number>(9);
  const [activeHoursEnd, setActiveHoursEnd] = useState<number>(22);
  const [isAutomationEnabled, setIsAutomationEnabled] = useState<boolean>(true);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const s = data.settings;
        setHasExistingToken(s.hasGithubToken);
        setMaskedToken(s.maskedGithubToken || '');
        setDailyCommitCount(s.dailyCommitCount || 5);
        setScheduleMode(s.scheduleMode || 'random');
        setActiveHoursStart(s.activeHoursStart ?? 9);
        setActiveHoursEnd(s.activeHoursEnd ?? 22);
        setIsAutomationEnabled(s.isAutomationEnabled ?? true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      const payload: any = {
        dailyCommitCount: Number(dailyCommitCount),
        scheduleMode,
        activeHoursStart: Number(activeHoursStart),
        activeHoursEnd: Number(activeHoursEnd),
        isAutomationEnabled,
      };

      if (githubToken.trim()) {
        payload.githubToken = githubToken.trim();
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update settings');

      setStatusMsg({ type: 'success', text: 'Automation settings saved and schedule recalculated!' });
      setGithubToken('');
      await fetchSettings();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);

    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setSavingPw(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');

      setPwMsg({ type: 'success', text: 'Master password successfully updated!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwMsg({ type: 'error', text: err.message });
    } finally {
      setSavingPw(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mr-2" />
        <span>Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-400" />
          <span>Automation & Security Settings</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure daily commit quotas, scheduling patterns, GitHub access token, and master authentication.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Main Automation Form */}
      <form onSubmit={handleSaveAutomation} className="space-y-6">
        {/* GitHub PAT Section */}
        <div className="bg-[#111726]/70 border border-slate-800 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-2">
            <Key className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">GitHub Personal Access Token (PAT)</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            GitPulse connects directly to GitHub's Git Data API without cloning repositories. 
            Requires a Classic PAT with <code>repo</code> permissions, or Fine-grained PAT with <code>Contents: Read and write</code> permissions.
          </p>

          {hasExistingToken && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs text-emerald-300">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Token is active: <code className="font-mono text-white bg-slate-900/60 px-2 py-0.5 rounded">{maskedToken}</code>
              </span>
              <span className="text-[11px] text-emerald-400/80">Validated</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {hasExistingToken ? 'Update GitHub Token (leave blank to keep current)' : 'Enter GitHub Personal Access Token'}
            </label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
            />
          </div>
        </div>

        {/* Commit Volume & Frequency */}
        <div className="bg-[#111726]/70 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Daily Commit Frequency</h2>
          </div>
          <p className="text-xs text-slate-400 -mt-2">
            Choose how many empty commits will be pushed per day.
          </p>

          {/* Preset Buttons + Custom Input */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">
              Select Preset or Enter Custom Amount
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {[1, 5, 10, 20].map((count) => (
                <button
                  type="button"
                  key={count}
                  onClick={() => setDailyCommitCount(count)}
                  className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all ${
                    dailyCommitCount === count
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {count} commits / day
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Custom Count:</span>
              <input
                type="number"
                min={1}
                max={50}
                value={dailyCommitCount}
                onChange={(e) => setDailyCommitCount(Number(e.target.value))}
                className="w-24 bg-[#0a0f1d] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
              <span className="text-xs text-slate-500">(Max: 50/day recommended)</span>
            </div>
          </div>

          <hr className="border-slate-800/80" />

          {/* Scheduling Mode (Random vs Fixed Interval) */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shuffle className="w-4 h-4 text-emerald-400" />
              <label className="text-xs font-semibold text-slate-200">
                Scheduling Pattern
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              {/* Random Mode */}
              <div
                onClick={() => setScheduleMode('random')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  scheduleMode === 'random'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200 ring-1 ring-emerald-500/20'
                    : 'bg-[#0a0f1d] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    🎲 Random Mode (Human-like)
                  </span>
                  {scheduleMode === 'random' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Pushes commits at unpredictable, random times throughout active hours. Looks completely natural on your GitHub graph.
                </p>
              </div>

              {/* Fixed Interval Mode */}
              <div
                onClick={() => setScheduleMode('interval')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  scheduleMode === 'interval'
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200 ring-1 ring-emerald-500/20'
                    : 'bg-[#0a0f1d] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    ⏱️ Fixed Interval Mode
                  </span>
                  {scheduleMode === 'interval' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Divides the day evenly and triggers a commit strictly at equal intervals (e.g. exactly every 2.5 hours).
                </p>
              </div>
            </div>
          </div>

          {/* Active Hours Window */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Active Hours Start (24h)
              </label>
              <select
                value={activeHoursStart}
                onChange={(e) => setActiveHoursStart(Number(e.target.value))}
                className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00 {i < 12 ? 'AM' : 'PM'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Active Hours End (24h)
              </label>
              <select
                value={activeHoursEnd}
                onChange={(e) => setActiveHoursEnd(Number(e.target.value))}
                className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                {Array.from({ length: 24 }).map((_, i) => (
                  <option key={i} value={i}>
                    {i.toString().padStart(2, '0')}:00 {i < 12 ? 'AM' : 'PM'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Global Automation Switch */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0a0f1d] border border-slate-800">
            <div>
              <p className="text-xs font-bold text-white">Enable Automated Background Schedule</p>
              <p className="text-[11px] text-slate-400">
                When enabled, GitPulse will execute commits automatically according to today's schedule.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isAutomationEnabled}
                onChange={(e) => setIsAutomationEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
          >
            {saving ? (
              <span>Saving and Recalculating Schedule...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Automation Settings</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Security & Admin Password Section */}
      <div className="bg-[#111726]/70 border border-slate-800 rounded-3xl p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-base font-bold text-white">Admin Security & Password</h2>
        </div>
        <p className="text-xs text-slate-400 mb-6">
          Change your GitPulse master login password to keep your dashboard secure.
        </p>

        {pwMsg && (
          <div
            className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2.5 border ${
              pwMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            {pwMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{pwMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password (default: admin123)"
              className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                New Password (min 6 characters)
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full bg-[#0a0f1d] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingPw}
            className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors flex items-center gap-2"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{savingPw ? 'Updating Password...' : 'Update Password'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
