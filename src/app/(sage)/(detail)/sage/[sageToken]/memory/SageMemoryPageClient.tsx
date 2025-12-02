"use client";
import { useSageContext } from "@/app/(sage)/(detail)/hooks/SageContext";
import { WorkingMemoryItem } from "@/app/(sage)/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

export function SageMemoryPageClient({
  sageMemoryDocument,
}: {
  sageMemoryDocument: {
    core: string;
    working: WorkingMemoryItem[];
  } | null;
}) {
  const t = useTranslations("Sage.MemoryPage");
  const { status: sageStatus } = useSageContext();

  const pendingWorkingMemory = sageMemoryDocument?.working.filter(
    (item) => item.status === "pending",
  );

  return (
    <div className="p-6 space-y-8">
      {/* Core Memory Section */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-foreground">{t("coreMemory")}</h2>
          {sageMemoryDocument && (
            <span className="text-xs text-muted-foreground">
              {sageMemoryDocument.core.length} {t("characters")}
            </span>
          )}
        </div>
        {sageMemoryDocument ? (
          <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed bg-muted/30 p-4 rounded-lg">
            {sageMemoryDocument.core}
          </pre>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noMemoryDocumentYet")}</p>
        )}
      </div>

      <Separator />

      {/* Working Memory Section */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-foreground">{t("workingMemory")}</h2>
          {pendingWorkingMemory && pendingWorkingMemory.length > 0 && (
            <Button variant="default" size="sm" disabled={sageStatus === "processing"}>
              {t("integrateWorkingMemory")}
            </Button>
          )}
        </div>

        {pendingWorkingMemory && pendingWorkingMemory.length > 0 ? (
          <div className="space-y-3">
            {pendingWorkingMemory.map((item) => (
              <Card key={item.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
                        {item.content}
                      </pre>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>
                    {item.relatedGapIds.length} gap{item.relatedGapIds.length !== 1 ? "s" : ""}{" "}
                    resolved
                  </span>
                  <Link
                    href={`/sage/interview/${item.sourceChat.token}`}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    {t("viewSourceInterview")}
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 space-y-2">
            <p className="text-sm text-muted-foreground">{t("noWorkingMemory")}</p>
            <p className="text-xs text-muted-foreground">{t("noWorkingMemoryDescription")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
