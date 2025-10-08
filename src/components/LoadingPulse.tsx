import { cn } from "@/lib/utils";

export const LoadingPulse = ({ className }: { className?: string }) => {
  return (
    <div className={cn("inline-flex gap-1", className)}>
      <span className="animate-bounce">·</span>
      <span className="animate-bounce [animation-delay:0.2s]">·</span>
      <span className="animate-bounce [animation-delay:0.4s]">·</span>
    </div>
  );
};
