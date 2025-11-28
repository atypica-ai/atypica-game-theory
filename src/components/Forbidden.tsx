"use client";

import { Button } from "@/components/ui/button";
import { ShieldXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function Forbidden() {
  const t = useTranslations("ForbiddenPage");
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-pulse rounded-full bg-destructive/10 p-6 mb-6">
          <ShieldXIcon className="size-12 text-destructive" />
        </div>

        <h1 className="text-4xl font-medium tracking-tight mb-4 bg-linear-to-r from-destructive/80 to-destructive bg-clip-text text-transparent">
          {t("title")}
        </h1>

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
