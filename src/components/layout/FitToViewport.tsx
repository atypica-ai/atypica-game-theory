import { cn } from "@/lib/utils";

export function FitToViewport({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  // children: React.ReactNode
}) {
  return (
    <div className={cn("flex-1 overflow-y-auto scrollbar-thin", className)} {...props}>
      {children}
    </div>
  );
}
