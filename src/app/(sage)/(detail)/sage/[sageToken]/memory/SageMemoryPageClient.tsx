"use client";
import { useSageContext } from "@/app/(sage)/(detail)/hooks/SageContext";
import { WorkingMemoryItem } from "@/app/(sage)/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function SageMemoryPageClient({
  sageMemoryDocument,
}: {
  sageMemoryDocument: {
    core: string;
    working: WorkingMemoryItem[];
  } | null;
}) {
  const t = useTranslations("Sage.MemoryPage");
  const { processingStatus } = useSageContext();
  const router = useRouter();
  const prevProcessingStatusRef = useRef(processingStatus);

  // 处理结束以后，刷新一下 memory document
  useEffect(() => {
    if (prevProcessingStatusRef.current !== "ready" && processingStatus === "ready") {
      router.refresh();
    }
    prevProcessingStatusRef.current = processingStatus;
  }, [processingStatus, router]);

  const pendingWorkingMemory = sageMemoryDocument?.working.filter(
    (item) => item.status === "pending",
  );

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("description")}</p>
      </div>

      {/* Core Memory Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium tracking-tight">{t("coreMemory")}</h2>
          {sageMemoryDocument && (
            <Badge variant="outline" className="text-xs font-normal">
              {sageMemoryDocument.core.length} {t("characters")}
            </Badge>
          )}
        </div>
        <Card className="bg-muted/30 border-muted">
          <div className="p-4">
            {sageMemoryDocument ? (
              <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed">
                {sageMemoryDocument.core}
              </pre>
            ) : (
              <div className="text-sm text-muted-foreground py-8 text-center">
                {t("noMemoryDocumentYet")}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Separator />

      {/* Working Memory Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium tracking-tight">{t("workingMemory")}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              New knowledge derived from interviews awaiting integration
            </p>
          </div>
          {pendingWorkingMemory && pendingWorkingMemory.length > 0 && (
            <Button
              variant="default"
              size="sm"
              disabled={processingStatus === "processing" || true}
            >
              <SparklesIcon className="size-3.5" />
              {t("integrateWorkingMemory")}
            </Button>
          )}
        </div>

        {pendingWorkingMemory && pendingWorkingMemory.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingWorkingMemory.map((item) => (
              <Card key={item.id} className="flex flex-col">
                <div className="p-4 flex-1 space-y-3">
                  <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed text-muted-foreground">
                    {item.content}
                  </pre>
                </div>
                <div className="px-4 py-3 bg-muted/30 border-t text-xs flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {item.relatedGapIds.length} gap{item.relatedGapIds.length !== 1 ? "s" : ""}{" "}
                    resolved
                  </span>
                  <Link
                    href={`/sage/interview/${item.sourceChat.token}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {t("viewSourceInterview")}
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">{t("noWorkingMemory")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("noWorkingMemoryDescription")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
