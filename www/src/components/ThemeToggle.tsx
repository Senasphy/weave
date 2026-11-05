"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="size-8 rounded-full border border-umber-800/10 dark:border-cloud-100/10" />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex size-8 items-center justify-center rounded-full border border-umber-800/15 dark:border-cloud-100/15 text-umber-700 hover:text-umber-900 dark:text-cloud-200 dark:hover:text-cloud-50 hover:bg-umber-800/5 dark:hover:bg-cloud-50/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lilac-500"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="size-3.5" />
      ) : (
        <Moon className="size-3.5" />
      )}
    </button>
  );
}
