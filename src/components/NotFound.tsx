"use client";

import { Button } from "@/components/ui/button";
import { FileQuestionIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function NotFound() {
  const t = useTranslations("NotFoundPage");
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-pulse rounded-full bg-muted p-6 mb-6">
          <FileQuestionIcon className="size-12 text-muted-foreground" />
        </div>

        <h1 className="text-4xl font-medium tracking-tight mb-4">{t("title")}</h1>

        <p className="text-muted-foreground mb-8">{t("description")}</p>

        <div className="space-y-4">
          <Button variant="outline" asChild>
            <Link href="/" className="inline-flex items-center">
              {t("returnHome")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
