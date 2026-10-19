import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface TopicCardProps {
  href: string;
  kicker?: string;
  title: string;
  description: string;
  className?: string;
}

export function FoundationsCard({ href, kicker, title, description, className }: TopicCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex min-h-[160px] flex-col justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-200 hover:border-foreground/25 hover:bg-accent/40 shadow-sm",
        className
      )}
    >
      <div>
        {kicker && (
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5">
            {kicker}
          </div>
        )}
        <div className="text-[15px] font-medium tracking-tight text-foreground group-hover:text-foreground transition-colors">
          {title}
        </div>
      </div>
      <div className="flex items-end justify-between pt-3">
        <p className="text-[12.5px] leading-relaxed text-muted-foreground group-hover:text-foreground/90 transition-colors">
          {description}
        </p>
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground ml-3" />
      </div>
    </Link>
  );
}

export function TopicCard(props: TopicCardProps) {
  return <FoundationsCard {...props} />;
}

export function FeatureCard(props: TopicCardProps) {
  return <FoundationsCard {...props} />;
}
