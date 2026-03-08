"use client";

import { cn } from "@/lib/utils";
import { SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface CategoryBarProps {
  categories: Array<{ name: string }>;
  selectedCategory: "Recommend" | "ALL" | string;
  onCategoryChange: (category: "Recommend" | "ALL" | string) => void;
  showRecommend?: boolean;
}

function CategoryPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200",
        "border",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function CategoryBar({
  categories,
  selectedCategory,
  onCategoryChange,
  showRecommend = true,
}: CategoryBarProps) {
  const t = useTranslations("Pulse");
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {showRecommend && (
        <CategoryPill
          active={selectedCategory === "Recommend"}
          onClick={() => onCategoryChange("Recommend")}
        >
          <span className="flex items-center gap-1.5">
            <SparklesIcon className="h-3 w-3" />
            {t("recommend")}
          </span>
        </CategoryPill>
      )}

      <CategoryPill
        active={selectedCategory === "ALL"}
        onClick={() => onCategoryChange("ALL")}
      >
        {t("all")}
      </CategoryPill>

      {categories.map((category) => (
        <CategoryPill
          key={category.name}
          active={selectedCategory === category.name}
          onClick={() => onCategoryChange(category.name)}
        >
          {category.name}
        </CategoryPill>
      ))}
    </div>
  );
}
