import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getDatabase, saveDatabase } from '@/lib/db';
import { verifyRepositoryAccess } from '@/lib/github';
import { Repository } from '@/lib/types';

export async function GET() {
  const isAuthed = await verifySession();
  if (!isAuthed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDatabase();
  return NextResponse.json({
    repositories: db.repositories,
    activeRepoId: db.settings.activeRepoId,
  });
}

export async function POST(req: Request) {
  const isAuthed = await verifySession();
  if (!isAuthed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { urlOrPath, branch = 'main' } = await req.json();
    if (!urlOrPath) {
      return NextResponse.json({ error: 'Repository URL or owner/repo format is required' }, { status: 400 });
    }

    // Parse owner and repo from input (e.g. "https://github.com/owner/repo" or "owner/repo")
    let cleaned = urlOrPath.trim().replace(/\.git$/, '');
    if (cleaned.startsWith('https://github.com/')) {
      cleaned = cleaned.replace('https://github.com/', '');
    } else if (cleaned.startsWith('http://github.com/')) {
      cleaned = cleaned.replace('http://github.com/', '');
    }

    const parts = cleaned.split('/').filter(Boolean);
    if (parts.length < 2) {
      return NextResponse.json({ error: 'Invalid repository format. Please use "owner/repo" or full GitHub URL.' }, { status: 400 });
    }

    const owner = parts[0];
    const repo = parts[1];

    const db = getDatabase();

    // Verify with GitHub if token is set
    if (db.settings.githubToken) {
      const verification = await verifyRepositoryAccess(db.settings.githubToken, owner, repo, branch);
      if (!verification.success) {
        return NextResponse.json({ error: verification.error }, { status: 400 });
      }
    }

    // Check if duplicate
    const exists = db.repositories.some(
      (r) => r.owner.toLowerCase() === owner.toLowerCase() && r.repo.toLowerCase() === repo.toLowerCase()
    );
    if (exists) {
      return NextResponse.json({ error: 'This repository is already added.' }, { status: 400 });
    }

    const newRepo: Repository = {
      id: `repo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      owner,
      repo,
      branch: branch || 'main',
      createdAt: new Date().toISOString(),
      totalCommitsPushed: 0,
    };

    db.repositories.push(newRepo);

    // If no active repo exists, set this as active
    if (!db.settings.activeRepoId) {
      db.settings.activeRepoId = newRepo.id;
    }

    saveDatabase(db);

    return NextResponse.json({ success: true, repository: newRepo, activeRepoId: db.settings.activeRepoId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add repository' }, { status: 500 });
  }
}

// Switch active repository
export async function PATCH(req: Request) {
  const isAuthed = await verifySession();
  if (!isAuthed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { activeRepoId } = await req.json();
    const db = getDatabase();

    if (activeRepoId !== null && !db.repositories.some((r) => r.id === activeRepoId)) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    db.settings.activeRepoId = activeRepoId;
    saveDatabase(db);

    return NextResponse.json({ success: true, activeRepoId: db.settings.activeRepoId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Delete repository
export async function DELETE(req: Request) {
  const isAuthed = await verifySession();
  if (!isAuthed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Repository ID is required' }, { status: 400 });
    }

    const db = getDatabase();
    db.repositories = db.repositories.filter((r) => r.id !== id);

    // If deleted repo was active, pick the first remaining or null
    if (db.settings.activeRepoId === id) {
      db.settings.activeRepoId = db.repositories.length > 0 ? db.repositories[0].id : null;
    }

    saveDatabase(db);

    return NextResponse.json({ success: true, activeRepoId: db.settings.activeRepoId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
