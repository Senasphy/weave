/* eslint-disable @next/next/no-img-element */
import React from "react";
import { cn } from "@/lib/cn";

interface WeaveLogoProps {
  variant?: "full" | "mark";
  className?: string;
  markClassName?: string;
  textClassName?: string;
}

export function WeaveLogo({
  variant = "full",
  className,
  markClassName,
  textClassName,
}: WeaveLogoProps) {
  const isFull = variant === "full";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 shrink-0 select-none",
        isFull ? "h-6" : "h-6 w-auto",
        className
      )}
    >
      <span
        className={cn(
          "relative inline-flex items-center justify-center shrink-0 h-full w-auto",
          markClassName
        )}
      >
        <img
          src="/weave-mark.svg"
          alt={isFull ? "" : "Weave"}
          width={36}
          height={24}
          className="h-full w-auto block dark:hidden object-contain"
          loading="eager"
        />
        <img
          src="/weave-mark-dark.svg"
          alt={isFull ? "" : "Weave"}
          width={36}
          height={24}
          className="h-full w-auto hidden dark:block object-contain"
          loading="eager"
        />
      </span>

      {isFull && (
        <span
          className={cn(
            "text-[17px] font-semibold tracking-tight text-umber-900 dark:text-cloud-50 leading-none",
            textClassName
          )}
        >
          Weave
        </span>
      )}
    </span>
  );
}
