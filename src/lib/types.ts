export interface Repository {
  id: string;
  owner: string;
  repo: string;
  branch: string;
  createdAt: string;
  totalCommitsPushed: number;
  lastCommitAt?: string;
}

export interface CommitLog {
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

export interface AppSettings {
  githubToken: string;
  activeRepoId: string | null;
  dailyCommitCount: number; // e.g. 5, 10, 20
  scheduleMode: 'random' | 'interval';
  activeHoursStart: number; // 0 - 23 (e.g. 9 for 9 AM)
  activeHoursEnd: number; // 0 - 23 (e.g. 22 for 10 PM)
  isAutomationEnabled: boolean;
  adminPasswordHash: string; // bcrypt or scrypt/pbkdf2 hash
  adminSalt: string;
}

export interface DailyScheduleState {
  date: string; // YYYY-MM-DD
  plannedTimestamps: number[]; // Epoch ms
  executedCount: number;
}

export interface DatabaseSchema {
  settings: AppSettings;
  repositories: Repository[];
  logs: CommitLog[];
  dailySchedule: DailyScheduleState;
}
