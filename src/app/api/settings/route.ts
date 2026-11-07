import { NextResponse } from 'next/server';
import { verifySession, hashPassword, verifyPassword } from '@/lib/auth';
import { getDatabase, saveDatabase } from '@/lib/db';
import { validateGitHubToken } from '@/lib/github';
import { calculateDailyTimestamps } from '@/lib/scheduler';

export async function GET() {
  const isAuthed = await verifySession();
  if (!isAuthed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDatabase();
  const token = db.settings.githubToken || '';
  const maskedToken = token
    ? `${token.slice(0, 4)}••••••••••••${token.slice(-4)}`
    : '';

  return NextResponse.json({
    settings: {
      hasGithubToken: Boolean(token),
      maskedGithubToken: maskedToken,
      activeRepoId: db.settings.activeRepoId,
      dailyCommitCount: db.settings.dailyCommitCount,
      scheduleMode: db.settings.scheduleMode,
      activeHoursStart: db.settings.activeHoursStart,
      activeHoursEnd: db.settings.activeHoursEnd,
      isAutomationEnabled: db.settings.isAutomationEnabled,
    },
    dailySchedule: db.dailySchedule,
  });
}

export async function POST(req: Request) {
  const isAuthed = await verifySession();
  if (!isAuthed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const db = getDatabase();

    // 1. Password change if requested
    if (body.newPassword) {
      if (!body.currentPassword) {
        return NextResponse.json({ error: 'Current password is required to set a new password' }, { status: 400 });
      }
      const isCurrentValid = verifyPassword(
        body.currentPassword,
        db.settings.adminPasswordHash,
        db.settings.adminSalt
      );
      if (!isCurrentValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }
      if (body.newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
      }
      const { hash, salt } = hashPassword(body.newPassword);
      db.settings.adminPasswordHash = hash;
      db.settings.adminSalt = salt;
    }

    // 2. GitHub Token update
    if (typeof body.githubToken === 'string' && body.githubToken.trim()) {
      const trimmedToken = body.githubToken.trim();
      const validation = await validateGitHubToken(trimmedToken);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error || 'Invalid GitHub token' }, { status: 400 });
      }
      db.settings.githubToken = trimmedToken;
    }

    // 3. Automation settings update
    if (typeof body.dailyCommitCount === 'number') {
      db.settings.dailyCommitCount = Math.max(1, Math.min(100, Math.round(body.dailyCommitCount)));
    }

    if (body.scheduleMode === 'random' || body.scheduleMode === 'interval') {
      db.settings.scheduleMode = body.scheduleMode;
    }

    if (typeof body.activeHoursStart === 'number' && typeof body.activeHoursEnd === 'number') {
      if (body.activeHoursStart >= 0 && body.activeHoursEnd <= 24 && body.activeHoursStart < body.activeHoursEnd) {
        db.settings.activeHoursStart = body.activeHoursStart;
        db.settings.activeHoursEnd = body.activeHoursEnd;
      }
    }

    if (typeof body.isAutomationEnabled === 'boolean') {
      db.settings.isAutomationEnabled = body.isAutomationEnabled;
    }

    // Recalculate remaining schedule for today
    const todayStr = new Date().toISOString().split('T')[0];
    db.dailySchedule.date = todayStr;
    db.dailySchedule.plannedTimestamps = calculateDailyTimestamps(
      db.settings.dailyCommitCount,
      db.settings.scheduleMode,
      db.settings.activeHoursStart,
      db.settings.activeHoursEnd
    );

    saveDatabase(db);

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        hasGithubToken: Boolean(db.settings.githubToken),
        dailyCommitCount: db.settings.dailyCommitCount,
        scheduleMode: db.settings.scheduleMode,
        activeHoursStart: db.settings.activeHoursStart,
        activeHoursEnd: db.settings.activeHoursEnd,
        isAutomationEnabled: db.settings.isAutomationEnabled,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
