"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const toggle = () => {
    const isDark =
      document.documentElement.classList.contains("dark") ||
      resolvedTheme === "dark" ||
      theme === "dark";
    const next = isDark ? "light" : "dark";

    if (next === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
    setTheme(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-foreground" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-foreground" />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
