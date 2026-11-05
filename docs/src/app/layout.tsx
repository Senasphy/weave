import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Weave Docs",
  description:
    "Documentation for Weave: durable orchestration engine and visual graph editor for multi-agent LLM systems.",
  icons: {
    icon: [
      { url: "/weave-mark.svg", media: "(prefers-color-scheme: light)" },
      { url: "/weave-mark-dark.svg", media: "(prefers-color-scheme: dark)" },
    ],
    shortcut: ["/weave-mark.svg"],
    apple: ["/weave-mark.svg"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#090a0d" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-full bg-background font-sans text-foreground antialiased selection:bg-indigo-500/20 selection:text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
