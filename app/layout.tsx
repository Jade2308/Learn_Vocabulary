import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Learn Vocabulary — Học từ vựng tiếng Anh thông minh',
  description: 'Học từ vựng tiếng Anh thông minh cùng trợ lý AI và phương pháp ghi nhớ tự nhiên, giúp bạn nhớ lâu và nhớ sâu.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.className} min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 antialiased overflow-x-clip min-w-[320px]`}
      >
        <Navbar />
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 overflow-x-clip">
          {children}
        </main>
      </body>
    </html>
  );
}
