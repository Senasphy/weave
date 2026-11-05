"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { navigation } from "@/lib/navigation";
import { cn } from "@/lib/cn";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DocsSidebarProps {
  onItemClick?: () => void;
}

export function DocsSidebar({ onItemClick }: DocsSidebarProps) {
  const pathname = usePathname();

  // Track expanded state for items with subItems
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const section of navigation) {
      for (const item of section.items) {
        if (item.subItems) {
          const itemPath = item.href.split("#")[0];
          // Default open if specified or current path matches
          initial[item.title] =
            !!item.defaultOpen ||
            pathname === itemPath ||
            item.subItems.some((sub) => sub.href.split("#")[0] === pathname);
        }
      }
    }
    return initial;
  });

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <ScrollArea className="h-full">
      <nav className="px-3.5 py-6">
        {navigation.map((section) => (
          <div key={section.title} className="mb-7">
            {/* Section Heading matching screenshot */}
            <div className="mb-2 px-2 text-[12.5px] font-semibold text-foreground tracking-tight">
              {section.title}
            </div>

            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const itemPath = item.href.split("#")[0];
                const isDirectActive =
                  itemPath === "/"
                    ? pathname === "/"
                    : pathname === itemPath;
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isExpanded = !!expandedItems[item.title];

                if (!hasSubItems) {
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onItemClick}
                        className={cn(
                          "block rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                          isDirectActive && "bg-accent/80 font-medium text-foreground"
                        )}
                      >
                        {item.title}
                      </Link>
                    </li>
                  );
                }

                return (
                  <li key={item.title} className="space-y-0.5">
                    {/* Unified Collapsible Item Row */}
                    <div
                      className={cn(
                        "group flex items-center justify-between rounded-md px-2.5 py-1.5 transition-colors cursor-pointer hover:bg-accent text-muted-foreground hover:text-foreground",
                        isDirectActive && "bg-accent/80 font-medium text-foreground"
                      )}
                      onClick={() => toggleExpand(item.title)}
                    >
                      <Link
                        href={item.href}
                        onClick={() => {
                          toggleExpand(item.title);
                          onItemClick?.();
                        }}
                        className="flex-1 text-[13px] transition-colors"
                      >
                        {item.title}
                      </Link>
                      <span className="p-0.5 text-muted-foreground/60 group-hover:text-foreground transition-colors">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </span>
                    </div>

                    {/* Indented sub-items with vertical guide line */}
                    {isExpanded && (
                      <ul className="ml-3.5 space-y-0.5 border-l border-border pl-3">
                        {item.subItems!.map((sub) => {
                          const subPath = sub.href.split("#")[0];
                          const isSubActive =
                            subPath === pathname &&
                            (sub.href.includes("#")
                              ? false // anchor link
                              : true);

                          return (
                            <li key={sub.title + sub.href}>
                              <Link
                                href={sub.href}
                                onClick={onItemClick}
                                className={cn(
                                  "block rounded-md px-2 py-1 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                                  isSubActive && "font-medium text-foreground"
                                )}
                              >
                                {sub.title}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </ScrollArea>
  );
}
