"use client";
import { Button } from "@/components/ui/button";
import type { Sage } from "@/prisma/client";
import { Brain, MessageCircle, Plus, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function SagesListClient({
  sages,
}: {
  sages: Array<Sage & { _count: { chats: number; interviews: number } }>;
}) {
  const t = useTranslations("Sage.list");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{t("title")}</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">{t("subtitle")}</p>
          </div>
          <Button asChild>
            <Link href="/sage/create">
              <Plus className="size-4" />
              {t("createNew")}
            </Link>
          </Button>
        </div>

        {/* Sages List */}
        {sages.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-12 text-center">
            <Brain className="size-12 text-zinc-400 dark:text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              {t("noSages")}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
              {t("noSagesDescription")}
            </p>
            <Button asChild>
              <Link href="/sage/create">
                <Plus className="size-4" />
                {t("createFirstSage")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sages.map((sage) => (
              <Link
                key={sage.id}
                href={`/sage/${sage.token}`}
                className="block bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <Brain className="size-5 text-zinc-600 dark:text-zinc-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {sage.name}
                        </h3>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                          {sage.domain}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-500">
                    <div className="flex items-center gap-1">
                      <MessageCircle className="size-3" />
                      <span>
                        {sage._count.chats} {t("chats")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <RefreshCw className="size-3" />
                      <span>
                        {sage._count.interviews} {t("interviews")}
                      </span>
                    </div>
                  </div>

                  {/* Expertise Tags */}
                  {sage.expertise && (sage.expertise as string[]).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(sage.expertise as string[]).slice(0, 3).map((exp, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded"
                        >
                          {exp}
                        </span>
                      ))}
                      {(sage.expertise as string[]).length > 3 && (
                        <span className="px-2 py-1 text-xs text-zinc-500 dark:text-zinc-500">
                          +{(sage.expertise as string[]).length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
