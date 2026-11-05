import { AlertTriangle, Info, Lightbulb } from "lucide-react";
import { cn } from "@/lib/cn";

type CalloutType = "note" | "warning" | "tip" | "danger";

const config = {
  note: { icon: Info, label: "Note" },
  warning: { icon: AlertTriangle, label: "Warning" },
  tip: { icon: Lightbulb, label: "Tip" },
  danger: { icon: AlertTriangle, label: "Caution" },
};

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Callout({
  type = "note",
  title,
  children,
  className,
}: CalloutProps) {
  const { icon: Icon, label } = config[type];

  return (
    <div
      className={cn(
        "my-6 rounded-lg border border-border bg-card px-4 py-3 text-sm",
        className
      )}
    >
      <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title || label}
      </div>
      <div className="text-[13.5px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </div>
  );
}
