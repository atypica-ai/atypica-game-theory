"use client";
import { fetchAnalystReportByToken } from "@/app/(study)/study/actions";
import { FileTextIcon, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export function ReportItem({
  reportToken,
  state,
}: {
  reportToken: string;
  state: "completed" | "in-progress";
}) {
  const t = useTranslations("PersonaPanel.DiscussionDetailPage");
  const [coverUrl, setCoverUrl] = useState<string>();

  useEffect(() => {
    if (state !== "completed") return;
    fetchAnalystReportByToken(reportToken).then((result) => {
      if (result.success && result.data.coverCdnHttpUrl) {
        setCoverUrl(result.data.coverCdnHttpUrl);
      }
    });
  }, [reportToken, state]);

  if (state !== "completed") {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border/50 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 shrink-0 animate-spin" />
        {t("reportGenerating")}
      </div>
    );
  }

  return (
    <Link
      href={`/artifacts/report/${reportToken}/share`}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-md border border-border/50 overflow-hidden hover:border-border transition-colors"
    >
      {coverUrl ? (
        <div className="relative w-full aspect-video">
          <Image src={coverUrl} alt="" fill className="object-cover" />
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-3">
          <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="text-xs">{t("clickToView")}</span>
        </div>
      )}
    </Link>
  );
}
