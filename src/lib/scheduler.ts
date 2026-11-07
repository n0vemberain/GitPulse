import { getDatabase, saveDatabase } from './db';
import { pushEmptyCommit } from './github';
import { CommitLog } from './types';

export function calculateDailyTimestamps(
  count: number,
  mode: 'random' | 'interval',
  startHour: number,
  endHour: number,
  baseDate: Date = new Date()
): number[] {
  if (count <= 0) return [];

  const start = new Date(baseDate);
  start.setHours(startHour, 0, 0, 0);

  const end = new Date(baseDate);
  end.setHours(endHour, 0, 0, 0);

  const startMs = start.getTime();
  const endMs = end.getTime();
  const span = Math.max(endMs - startMs, 60000); // minimum 1 minute

  const timestamps: number[] = [];

  if (mode === 'interval') {
    const step = span / (count + 1);
    for (let i = 1; i <= count; i++) {
      timestamps.push(Math.round(startMs + step * i));
    }
  } else {
    // Random distribution
    for (let i = 0; i < count; i++) {
      const randOffset = Math.random() * span;
      timestamps.push(Math.round(startMs + randOffset));
    }
    timestamps.sort((a, b) => a - b);
  }

  return timestamps;
}

export async function processScheduleTick(): Promise<{ executed: boolean; count: number; error?: string }> {
  try {
    const db = getDatabase();
    const { settings, repositories, dailySchedule } = db;

    if (!settings.isAutomationEnabled) {
      return { executed: false, count: 0 };
    }

    if (!settings.githubToken || !settings.activeRepoId) {
      return { executed: false, count: 0, error: 'Missing GitHub token or active repository' };
    }

    const activeRepo = repositories.find((r) => r.id === settings.activeRepoId);
    if (!activeRepo) {
      return { executed: false, count: 0, error: 'Active repository not found' };
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Check if new day or if schedule is empty/count mismatch
    if (
      dailySchedule.date !== todayStr ||
      dailySchedule.plannedTimestamps.length !== settings.dailyCommitCount
    ) {
      dailySchedule.date = todayStr;
      dailySchedule.plannedTimestamps = calculateDailyTimestamps(
        settings.dailyCommitCount,
        settings.scheduleMode,
        settings.activeHoursStart,
        settings.activeHoursEnd
      );
      dailySchedule.executedCount = 0;
      saveDatabase(db);
    }

    const now = Date.now();
    const planned = dailySchedule.plannedTimestamps;
    let newlyExecuted = 0;

    // Check which scheduled times are due and not yet executed
    while (dailySchedule.executedCount < planned.length) {
      const nextDueTime = planned[dailySchedule.executedCount];
      if (nextDueTime > now) {
        break; // Not due yet
      }

      // Execute this commit
      const result = await pushEmptyCommit(
        settings.githubToken,
        activeRepo.owner,
        activeRepo.repo,
        activeRepo.branch
      );

      const logId = `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const logEntry: CommitLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        repo: `${activeRepo.owner}/${activeRepo.repo}`,
        branch: activeRepo.branch,
        commitSha: result.commitSha,
        commitUrl: result.commitUrl,
        message: result.success ? `Automated null commit (${dailySchedule.executedCount + 1}/${settings.dailyCommitCount})` : 'Automated commit attempt failed',
        status: result.success ? 'success' : 'failed',
        type: 'automated',
        error: result.error,
      };

      db.logs.unshift(logEntry);
      if (db.logs.length > 200) db.logs.pop(); // keep last 200 logs

      if (result.success) {
        activeRepo.totalCommitsPushed = (activeRepo.totalCommitsPushed || 0) + 1;
        activeRepo.lastCommitAt = new Date().toISOString();
      }

      dailySchedule.executedCount++;
      newlyExecuted++;

      // Save progress after each commit
      saveDatabase(db);
    }

    return { executed: newlyExecuted > 0, count: newlyExecuted };
  } catch (err: any) {
    console.error('Error in processScheduleTick:', err);
    return { executed: false, count: 0, error: err.message };
  }
}

// Global daemon initialization
let isSchedulerRunning = false;
export function initSchedulerDaemon() {
  if (isSchedulerRunning) return;
  isSchedulerRunning = true;

  console.log('[GitPulse] Background schedule daemon initialized.');
  // Check every 30 seconds
  setInterval(() => {
    processScheduleTick().catch((err) => {
      console.error('[GitPulse] Daemon tick error:', err);
    });
  }, 30000);
}
