"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "./CodeBlock";
import { cn } from "@/lib/cn";

interface Parameter {
  name: string;
  in: "path" | "query" | "header";
  required?: boolean;
  type: string;
  description: string;
}

interface EndpointCardProps {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  summary: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: string;
  responseBody?: string;
  statusCodes?: { code: number; description: string }[];
  defaultOpen?: boolean;
}

const methodVariant = {
  GET: "get",
  POST: "post",
  PUT: "put",
  DELETE: "delete",
  PATCH: "patch",
} as const;

export function EndpointCard({
  method,
  path,
  summary,
  description,
  parameters,
  requestBody,
  responseBody,
  statusCodes,
  defaultOpen = false,
}: EndpointCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const parts = path.split(/(\{[^}]+\})/g);

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-accent/60"
        aria-expanded={isOpen}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <Badge variant={methodVariant[method]} className="font-mono">
            {method}
          </Badge>
          <span className="font-mono text-[13px] text-foreground">
            {parts.map((part, i) =>
              part.startsWith("{") ? (
                <span key={i} className="text-muted-foreground">
                  {part}
                </span>
              ) : (
                <span key={i}>{part}</span>
              )
            )}
          </span>
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {summary}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="space-y-4 border-t border-border px-4 py-4">
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}

          {parameters && parameters.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-border">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>In</th>
                    <th>Type</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {parameters.map((param) => (
                    <tr key={param.name}>
                      <td className="font-mono">
                        {param.name}
                        {param.required && (
                          <span className="ml-1 text-muted-foreground">*</span>
                        )}
                      </td>
                      <td className="font-mono text-muted-foreground">{param.in}</td>
                      <td className="font-mono">{param.type}</td>
                      <td>{param.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {requestBody && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                Request body
              </div>
              <CodeBlock code={requestBody} language="json" filename="application/json" />
            </div>
          )}

          {responseBody && (
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">
                Response
              </div>
              <CodeBlock code={responseBody} language="json" filename="application/json" />
            </div>
          )}

          {statusCodes && statusCodes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {statusCodes.map((s) => (
                <span
                  key={s.code}
                  className="rounded-md border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                >
                  <span className="text-foreground">{s.code}</span> {s.description}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
