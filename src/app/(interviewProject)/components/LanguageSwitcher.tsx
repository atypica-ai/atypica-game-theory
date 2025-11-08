"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Check, Languages } from "lucide-react";
import { Locale, useTranslations } from "next-intl";
import { useState } from "react";

export function LanguageSwitcher({
  currentLocale,
  onLanguageChange,
  disabled = false,
}: {
  currentLocale: Locale;
  onLanguageChange: (locale: Locale) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("InterviewProject.languageSwitcher");
  const [open, setOpen] = useState(false);

  const languageOptions: { locale: Locale; label: string; nativeLabel: string }[] = [
    { locale: "zh-CN", label: "Chinese (Simplified)", nativeLabel: "中文" },
    { locale: "en-US", label: "English", nativeLabel: "English" },
  ];

  const handleLanguageSelect = (locale: Locale) => {
    if (locale !== currentLocale) {
      onLanguageChange(locale);
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          disabled={disabled}
        >
          <Languages className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {languageOptions.map((option) => {
            const isSelected = option.locale === currentLocale;
            return (
              <Button
                key={option.locale}
                variant={isSelected ? "default" : "outline"}
                className={cn(
                  "w-full justify-between",
                  isSelected && "bg-primary text-primary-foreground",
                )}
                onClick={() => handleLanguageSelect(option.locale)}
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium">{option.nativeLabel}</span>
                  <span className="text-sm text-muted-foreground">{option.label}</span>
                </span>
                {isSelected && <Check className="h-4 w-4" />}
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
