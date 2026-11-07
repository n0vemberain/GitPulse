import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { initSchedulerDaemon } from '@/lib/scheduler';
import Navbar from '@/components/Navbar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuthed = await verifySession();
  if (!isAuthed) {
    redirect('/login');
  }

  // Ensure scheduler daemon is active
  initSchedulerDaemon();

  const db = getDatabase();
  const activeRepo = db.repositories.find((r) => r.id === db.settings.activeRepoId);
  const activeRepoName = activeRepo ? `${activeRepo.owner}/${activeRepo.repo}` : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16]">
      <Navbar
        isAutomationEnabled={db.settings.isAutomationEnabled}
        activeRepoName={activeRepoName}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
