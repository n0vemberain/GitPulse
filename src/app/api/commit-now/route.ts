import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getDatabase, saveDatabase } from '@/lib/db';
import { pushEmptyCommit } from '@/lib/github';
import { CommitLog } from '@/lib/types';

export async function POST(req: Request) {
  const isAuthed = await verifySession();
  if (!isAuthed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const db = getDatabase();
    const { settings, repositories } = db;

    if (!settings.githubToken) {
      return NextResponse.json(
        { error: 'GitHub Personal Access Token not configured. Please add it in Settings.' },
        { status: 400 }
      );
    }

    if (!settings.activeRepoId) {
      return NextResponse.json(
        { error: 'No active repository selected. Please add and select a repository first.' },
        { status: 400 }
      );
    }

    const activeRepo = repositories.find((r) => r.id === settings.activeRepoId);
    if (!activeRepo) {
      return NextResponse.json({ error: 'Active repository not found.' }, { status: 404 });
    }

    // Optional custom message from body
    let customMessage: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.message === 'string' && body.message.trim()) {
        customMessage = body.message.trim();
      }
    } catch {
      // Body is optional
    }

    const result = await pushEmptyCommit(
      settings.githubToken,
      activeRepo.owner,
      activeRepo.repo,
      activeRepo.branch,
      customMessage
    );

    const logEntry: CommitLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      repo: `${activeRepo.owner}/${activeRepo.repo}`,
      branch: activeRepo.branch,
      commitSha: result.commitSha,
      commitUrl: result.commitUrl,
      message: customMessage || (result.success ? 'Manual empty commit triggered from dashboard' : 'Manual commit failed'),
      status: result.success ? 'success' : 'failed',
      type: 'manual',
      error: result.error,
    };

    db.logs.unshift(logEntry);
    if (db.logs.length > 200) db.logs.pop();

    if (result.success) {
      activeRepo.totalCommitsPushed = (activeRepo.totalCommitsPushed || 0) + 1;
      activeRepo.lastCommitAt = new Date().toISOString();
      db.dailySchedule.executedCount = (db.dailySchedule.executedCount || 0) + 1;
    }

    saveDatabase(db);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to push commit' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Empty commit successfully pushed to GitHub!',
      commitSha: result.commitSha,
      commitUrl: result.commitUrl,
      repo: `${activeRepo.owner}/${activeRepo.repo}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
