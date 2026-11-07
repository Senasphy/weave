import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weave | Reliable Cloud AI Workflows",
  description:
    "One current, attributable runtime for your business workflows, backed by durable cloud state and hard budget governance.",
  icons: {
    icon: [
      { url: "/weave-mark.svg", media: "(prefers-color-scheme: light)" },
      { url: "/weave-mark-dark.svg", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#130d0b" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-cloud-50 text-umber-800 dark:bg-umber-900 dark:text-cloud-50 antialiased selection:bg-lilac-300 selection:text-charcoal">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
