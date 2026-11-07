import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GitPulse | Automated GitHub Activity Engine',
  description: 'Professional automated GitHub empty commits dashboard and scheduler',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        <div className="fixed inset-0 pointer-events-none gradient-glow -z-10" />
        {children}
      </body>
    </html>
  );
}
