import type { Metadata } from 'next';
import { Montserrat, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const montserrat = Montserrat({ variable: '--font-sans', subsets: ['latin', 'cyrillic'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Teacher Platform',
  description: 'Admin panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body className={`${montserrat.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
