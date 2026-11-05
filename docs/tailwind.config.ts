import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      colors: {
        background: "#07080c",
        surface: {
          DEFAULT: "#0f1117",
          raised: "#161922",
          overlay: "#1c1f2e",
        },
        primary: {
          DEFAULT: "#6366f1",
          hover: "#818cf8",
          muted: "rgba(99, 102, 241, 0.15)",
          foreground: "#ffffff",
        },
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.06)",
          subtle: "rgba(255, 255, 255, 0.03)",
          strong: "rgba(255, 255, 255, 0.12)",
        },
        accent: {
          agent: "#6366f1",
          gate: "#f59e0b",
          router: "#06b6d4",
          parallel: "#a855f7",
        },
      },
    },
  },
  plugins: [],
};

export default config;
