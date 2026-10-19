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
      colors: {
        charcoal: "#130d0b",
        "mid-brown": "#524742",
        "off-white": "#fafaf8",
        offwhite: "#fafaf8",
        status: {
          live: "#00bb7f",
          amber: "#f59e0b",
        },
        cloud: {
          50: "#fafaf8",
          100: "#ecebe5",
          200: "#dad8ce",
          300: "#c2bfaf",
          400: "#aaa38d",
          500: "#988f77",
          700: "#746a5a",
          800: "#60574c",
          900: "#4e4840",
          950: "#292521",
        },
        umber: {
          400: "#8f827a",
          500: "#736761",
          600: "#524742",
          700: "#3b2d28",
          800: "#201613",
          900: "#130d0b",
        },
        lilac: {
          300: "#bdb4f8",
          400: "#a392f3",
          500: "#8566ec",
        },
        blue: {
          100: "#dbf0f2",
          200: "#a3d7de",
        },
      },
      fontFamily: {
        display: [
          '"Host Grotesk"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        sans: [
          '"Host Grotesk"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
