import { cn } from "@/lib/utils";

type ChapterPanelProps = {
  variant?: "dark" | "light";
  className?: string;
  children: React.ReactNode;
};

export default function ChapterPanel({ variant = "dark", className, children }: ChapterPanelProps) {
  return (
    <div
      className={cn(
        "p-12 px-8 max-lg:p-8 max-lg:px-4",
        variant === "dark" && "bg-zinc-900",
        variant === "light" && "bg-[#fafaf8] text-gray-900",
        className,
      )}
    >
      {children}
    </div>
  );
}
