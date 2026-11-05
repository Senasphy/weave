import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AppShell } from '@/components/AppShell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Weave — Visual Multi-Agent Systems',
  description: 'Design multi-agent systems visually. Run them with confidence.',
  icons: {
    icon: [
      { url: '/weave-mark.svg', media: '(prefers-color-scheme: light)' },
      { url: '/weave-mark.svg', media: '(prefers-color-scheme: dark)' },
    ],
    shortcut: ['/weave-mark.svg'],
    apple: ['/weave-mark.svg'],
  },
};

export const viewport: Viewport = {
  themeColor: '#f8fafc',
  colorScheme: 'light',
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
      className={`h-full ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="h-full bg-background text-foreground font-sans antialiased selection:bg-slate-900/10 selection:text-foreground">
        <Providers>
          <AppShell>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
