import { EpisodicMemoryReference, WorkingMemoryItem } from "@/app/(sage)/types";
import { useTranslations } from "next-intl";

export function SageMemoryPageClient({
  sageMemoryDocument,
}: {
  sageMemoryDocument: {
    core: string;
    working: WorkingMemoryItem[];
    episodic: EpisodicMemoryReference[];
  } | null;
}) {
  const t = useTranslations("Sage.detail");

  return (
    <div className="p-6 space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-foreground">{t("memoryDocument")}</h2>
        {sageMemoryDocument && (
          <span className="text-xs text-muted-foreground">
            {sageMemoryDocument.core.length} {t("characters")}
          </span>
        )}
      </div>
      {sageMemoryDocument ? (
        <pre className="text-xs text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed">
          {sageMemoryDocument.core}
        </pre>
      ) : (
        <p className="text-xs text-muted-foreground">{t("noMemoryDocumentYet")}</p>
      )}
    </div>
  );
}
