"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface CategoryBarProps {
  categories: Array<{ id: number; name: string }>;
  selectedCategory: "Recommend" | "ALL" | number;
  onCategoryChange: (category: "Recommend" | "ALL" | number) => void;
  showRecommend?: boolean;
}

export function CategoryBar({
  categories,
  selectedCategory,
  onCategoryChange,
  showRecommend = true,
}: CategoryBarProps) {
  const t = useTranslations("PulsePage");
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {/* Recommend button - only show if there are recommendations */}
      {showRecommend && (
        <Button
          variant={selectedCategory === "Recommend" ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoryChange("Recommend")}
          className={cn(
            "shrink-0 whitespace-nowrap",
            selectedCategory === "Recommend" && "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-ghost-green dark:text-black dark:hover:bg-ghost-green/90",
          )}
        >
          <SparklesIcon className="h-3 w-3 mr-1.5" />
          {t("recommend")}
        </Button>
      )}

      {/* ALL button */}
      <Button
        variant={selectedCategory === "ALL" ? "default" : "outline"}
        size="sm"
        onClick={() => onCategoryChange("ALL")}
        className={cn(
          "shrink-0 whitespace-nowrap",
          selectedCategory === "ALL" && "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-ghost-green dark:text-black dark:hover:bg-ghost-green/90",
        )}
      >
        {t("all")}
      </Button>

      {/* Category buttons */}
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoryChange(category.id)}
          className={cn(
            "shrink-0 whitespace-nowrap",
            selectedCategory === category.id && "bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-ghost-green dark:text-black dark:hover:bg-ghost-green/90",
          )}
        >
          {category.name}
        </Button>
      ))}
    </div>
  );
}

