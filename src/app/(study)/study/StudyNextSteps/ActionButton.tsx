import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ActionButtonProps {
  icon: LucideIcon;
  text: string;
  onClick: () => void;
  className?: string;
}

export function ActionButton({ icon: Icon, text, onClick, className }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full group relative overflow-hidden",
        "px-3.5 py-2.5 rounded-md",
        "border border-border/60 bg-card/50 backdrop-blur-sm",
        "hover:bg-primary/5",
        "transition-all duration-200",
        "cursor-pointer",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="shrink-0 w-8 h-8 rounded-md bg-linear-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:from-primary/15 group-hover:to-primary/10 transition-all">
          <Icon className="size-4 text-primary" strokeWidth={2.5} />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-foreground/90 group-hover:text-foreground transition-colors">
            {text}
          </div>
        </div>
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
}
