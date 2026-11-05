"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { searchItems } from "@/lib/navigation";
import { cn } from "@/lib/cn";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) setQuery("");
    onOpenChange(isOpen);
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return searchItems;
    return searchItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.section.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden p-0" showClose={false}>
        <DialogTitle className="sr-only">Search documentation</DialogTitle>
        <div className="flex items-center gap-2.5 border-b border-border px-3.5">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documentation..."
            className="h-12 w-full border-0 bg-transparent text-sm outline-none ring-0 placeholder:text-muted-foreground focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
            style={{ border: "none", outline: "none", boxShadow: "none" }}
            autoFocus
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results for “{query}”
            </p>
          ) : (
            results.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  router.push(item.href);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                )}
              >
                <span>{item.title}</span>
                <span className="text-xs text-muted-foreground">{item.section}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
