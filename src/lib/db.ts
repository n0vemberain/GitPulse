import fs from 'fs';
import path from 'path';
import { DatabaseSchema } from './types';
import { hashPassword } from './auth';

const DATA_DIR = process.env.GITPULSE_DATA_DIR || path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function getDefaultDatabase(): DatabaseSchema {
  const { hash, salt } = hashPassword('admin123');
  const todayStr = new Date().toISOString().split('T')[0];

  return {
    settings: {
      githubToken: '',
      activeRepoId: null,
      dailyCommitCount: 5,
      scheduleMode: 'random',
      activeHoursStart: 9,
      activeHoursEnd: 22,
      isAutomationEnabled: true,
      adminPasswordHash: hash,
      adminSalt: salt,
    },
    repositories: [],
    logs: [],
    dailySchedule: {
      date: todayStr,
      plannedTimestamps: [],
      executedCount: 0,
    },
  };
}

export function getDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      const defaultDb = getDefaultDatabase();
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf-8');
      return defaultDb;
    }

    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);

    // Merge with defaults in case of missing keys
    const defaults = getDefaultDatabase();
    return {
      settings: { ...defaults.settings, ...parsed.settings },
      repositories: parsed.repositories || [],
      logs: parsed.logs || [],
      dailySchedule: parsed.dailySchedule || defaults.dailySchedule,
    };
  } catch (err) {
    console.error('Error reading database, creating default:', err);
    const defaultDb = getDefaultDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf-8');
    return defaultDb;
  }
}

export function saveDatabase(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // Atomic write via temp file
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error saving database:', err);
    throw err;
  }
}
