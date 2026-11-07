import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';

export async function GET() {
  const isAuthed = await verifySession();
  if (!isAuthed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDatabase();
  const todayStr = new Date().toISOString().split('T')[0];

  const todayLogs = db.logs.filter((l) => l.timestamp.startsWith(todayStr));
  const successfulToday = todayLogs.filter((l) => l.status === 'success').length;
  const totalAllTime = db.logs.filter((l) => l.status === 'success').length;

  return NextResponse.json({
    logs: db.logs.slice(0, 50),
    stats: {
      todayCount: successfulToday,
      targetCount: db.settings.dailyCommitCount,
      totalPushed: totalAllTime,
      activeRepoId: db.settings.activeRepoId,
      isAutomationEnabled: db.settings.isAutomationEnabled,
      scheduleMode: db.settings.scheduleMode,
    },
    upcomingTimestamps: db.dailySchedule.plannedTimestamps.filter((t) => t > Date.now()),
  });
}
