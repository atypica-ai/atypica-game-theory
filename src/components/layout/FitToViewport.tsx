import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const FitToViewport = forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("flex-1 overflow-y-auto scrollbar-thin", className)} {...props}>
        {children}
      </div>
    );
  },
);

FitToViewport.displayName = "FitToViewport";
