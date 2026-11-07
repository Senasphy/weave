import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AppShell } from '@/components/AppShell';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Weave | Orchestration Studio',
  description: 'Design multi-agent systems visually. Run them with confidence.',
  icons: {
    icon: [
      { url: '/weave-mark.svg', media: '(prefers-color-scheme: light)' },
      { url: '/weave-mark-dark.svg', media: '(prefers-color-scheme: dark)' },
    ],
    shortcut: ['/weave-mark-dark.svg'],
    apple: ['/weave-mark-dark.svg'],
  },
};

export const viewport: Viewport = {
  themeColor: '#090a0d',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`h-full dark ${geistSans.variable} ${geistMono.variable}`}
      style={{ colorScheme: 'dark' }}
      suppressHydrationWarning
    >
      <body className="h-full bg-background text-foreground font-sans antialiased selection:bg-foreground/20 selection:text-foreground">
        <Providers>
          <AppShell>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
