import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/auth';

export default async function HomePage() {
  const isAuthed = await verifySession();
  if (isAuthed) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
