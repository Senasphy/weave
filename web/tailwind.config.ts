import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
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
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        background: "var(--background)",
        foreground: {
          DEFAULT: "var(--foreground)",
          muted: "var(--foreground-muted)",
          dim: "var(--foreground-dim)",
          subtle: "var(--foreground-subtle)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        surface: {
          DEFAULT: "var(--surface)",
          raised: "var(--surface-raised)",
          overlay: "var(--surface-overlay)",
          border: "var(--border)",
          "border-subtle": "var(--border-subtle)",
        },
        border: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },
        input: "var(--input)",
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          muted: "var(--primary-muted)",
          foreground: "var(--primary-foreground)",
          border: "var(--primary-border)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          agent: "var(--accent-agent)",
          gate: "var(--accent-gate)",
          router: "var(--accent-router)",
          parallel: "var(--accent-parallel)",
        },
        node: {
          agent: "var(--accent-agent)",
          gate: "var(--accent-gate)",
          router: "var(--accent-router)",
          parallel: "var(--accent-parallel)",
        },
        semantic: {
          success: "var(--success)",
          warning: "var(--warning)",
          error: "var(--error)",
          info: "var(--info)",
        },
        success: {
          DEFAULT: "var(--success)",
          muted: "var(--success-bg)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          muted: "var(--warning-bg)",
        },
        error: {
          DEFAULT: "var(--error)",
          muted: "var(--error-bg)",
        },
        info: {
          DEFAULT: "var(--info)",
          muted: "var(--info-bg)",
        },
        ring: "var(--ring)",
        // Backward-compatibility aliases
        "foreground-muted": "var(--foreground-muted)",
        "foreground-dim": "var(--foreground-dim)",
        "foreground-subtle": "var(--foreground-subtle)",
        "surface-raised": "var(--surface-raised)",
        "surface-overlay": "var(--surface-overlay)",
        "surface-border": "var(--border)",
        "surface-border-subtle": "var(--border-subtle)",
      },
      borderRadius: {
        none: "0px",
        xs: "2px",
        sm: "2px",
        DEFAULT: "2px",
        md: "3px",
        lg: "4px",
        xl: "4px",
        "2xl": "6px",
        full: "9999px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          from: { transform: "translateY(-8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.96)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 16px 2px var(--primary-muted, rgba(99, 102, 241, 0.25))",
          },
          "50%": {
            opacity: "0.6",
            boxShadow: "0 0 4px 0px var(--primary-muted, rgba(99, 102, 241, 0.08))",
          },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-up": "slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-in-right": "slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s infinite linear",
        "pulse-glow": "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        "3xl": "40px",
      },
      boxShadow: {
        none: "none",
        "2xs": "none",
        xs: "none",
        sm: "none",
        DEFAULT: "none",
        md: "none",
        lg: "none",
        xl: "none",
        "2xl": "0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)",
        card: "none",
        "card-hover": "none",
        popover: "0 4px 12px rgba(0, 0, 0, 0.06)",
        modal: "0 16px 36px -4px rgba(0, 0, 0, 0.12)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
