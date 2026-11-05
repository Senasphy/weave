"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/cn";
import Prism from "prismjs";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-go";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-docker";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language = "bash",
  filename,
  showLineNumbers = false,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const lines = code.trim().split("\n");

  const highlightedHtml = useMemo(() => {
    const lang = (language || "bash").toLowerCase();
    const grammar =
      lang === "json"
        ? Prism.languages.json
        : lang === "bash" || lang === "shell" || lang === "sh"
        ? Prism.languages.bash
        : lang === "go" || lang === "golang"
        ? Prism.languages.go
        : lang === "ts" || lang === "typescript"
        ? Prism.languages.typescript
        : lang === "js" || lang === "javascript"
        ? Prism.languages.javascript
        : lang === "yaml" || lang === "yml"
        ? Prism.languages.yaml
        : lang === "docker" || lang === "dockerfile"
        ? Prism.languages.docker
        : null;

    if (grammar) {
      try {
        return Prism.highlight(code.trim(), grammar, lang);
      } catch {
        return null;
      }
    }
    return null;
  }, [code, language]);

  return (
    <div
      className={cn(
        "my-5 overflow-hidden rounded-xl border border-border bg-card shadow-sm",
        className
      )}
    >
      <div className="flex h-9 items-center justify-between border-b border-border bg-muted/30 px-3.5">
        <span className="font-mono text-[11px] text-muted-foreground font-medium">
          {filename ?? language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="overflow-x-auto p-4 font-mono text-[12.5px] leading-relaxed">
        <pre className="flex">
          {showLineNumbers && (
            <div
              aria-hidden="true"
              className="mr-4 select-none pr-3 text-right text-muted-foreground/35 border-r border-border/50"
            >
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
          )}
          {highlightedHtml ? (
            <code
              className={`language-${language} flex-1 whitespace-pre`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          ) : (
            <code className="flex-1 whitespace-pre text-foreground/90">{code.trim()}</code>
          )}
        </pre>
      </div>
    </div>
  );
}
