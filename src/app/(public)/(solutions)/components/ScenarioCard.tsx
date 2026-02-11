import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface ScenarioCardProps {
  question: string;
  toolLabel: string;
  href: string;
  className?: string;
}

export function ScenarioCard({ question, toolLabel, href, className }: ScenarioCardProps) {
  return (
    <Link
      href={href}
      prefetch={true}
      className={cn(
        "group block border border-border rounded-lg p-5 sm:p-6",
        "hover:border-foreground/20 transition-all duration-300",
        className,
      )}
    >
      <div className="flex flex-col gap-3">
        {/* Tag at top */}
        <Badge
          variant="outline"
          className="self-start text-xs px-2 py-0.5 font-normal text-muted-foreground"
        >
          {toolLabel}
        </Badge>

        {/* Question text */}
        <p className="text-xm sm:text-base font-medium leading-relaxed text-foreground/90 min-h-12">
          {question}
        </p>

        {/* Arrow indicator */}
        <div className="flex items-center justify-end">
          <ArrowRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Link>
  );
}
