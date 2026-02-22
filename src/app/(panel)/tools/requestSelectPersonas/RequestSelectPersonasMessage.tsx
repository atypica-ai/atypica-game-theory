"use client";

import {
  TAddUniversalUIToolResult,
  TUniversalMessageWithTool,
  UniversalToolName,
} from "@/app/(universal)/tools/types";
import { SelectPersonaDialog } from "@/components/SelectPersonaDialog";
import { Button } from "@/components/ui/button";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { CheckIcon, Loader2Icon, PlusIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { fetchPersonasByIds, fetchPersonasByTokens, PanelPersonaSummary } from "./actions";

type RequestSelectPersonasToolUIPart = Extract<
  TUniversalMessageWithTool["parts"][number],
  { type: `tool-${typeof UniversalToolName.requestSelectPersonas}` }
>;

export function RequestSelectPersonasMessage({
  toolInvocation,
  addToolResult,
}: {
  toolInvocation: RequestSelectPersonasToolUIPart;
  addToolResult?: TAddUniversalUIToolResult;
}) {
  const t = useTranslations("PersonaPanel.CreatePanelTool");
  const [personas, setPersonas] = useState<PanelPersonaSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);

  // Pre-populate personas from input personaIds (if provided by searchPersonas)
  useEffect(() => {
    if (toolInvocation.state === "output-available") return;
    const inputIds: number[] = (toolInvocation.input?.personaIds ?? []).filter(
      (id): id is number => typeof id === "number",
    );
    if (inputIds.length === 0) return;
    fetchPersonasByIds(inputIds).then((result) => {
      if (result.success && result.data.length > 0) {
        setPersonas((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newPersonas = result.data.filter((p) => !existingIds.has(p.id));
          return prev.length === 0 ? result.data : [...prev, ...newPersonas];
        });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only on mount

  const removePersona = useCallback((id: number) => {
    setPersonas((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleAddPersonas = useCallback(async (tokens: string[]) => {
    if (tokens.length === 0) return;
    const result = await fetchPersonasByTokens(tokens);
    if (result.success) {
      setPersonas((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newPersonas = result.data.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newPersonas];
      });
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!addToolResult || personas.length === 0) return;
    setSubmitting(true);

    const personaIds = personas.map((p) => p.id);
    await addToolResult({
      tool: UniversalToolName.requestSelectPersonas,
      toolCallId: toolInvocation.toolCallId,
      output: {
        personaIds,
        plainText: `User selected ${personaIds.length} personas: [${personaIds.join(", ")}]`,
      },
    });

    setSubmitting(false);
  }, [addToolResult, personas, toolInvocation.toolCallId]);

  // Output available — read-only summary
  if (toolInvocation.state === "output-available") {
    const output = toolInvocation.output;
    return (
      <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
        <div className="flex items-center gap-2 text-sm">
          <CheckIcon className="size-4 text-green-600" />
          <span>{t("personaCount", { count: output.personaIds.length })}</span>
        </div>
      </div>
    );
  }

  // Input available — interactive selector
  return (
    <>
      <div className="space-y-3">
        {personas.length > 0 ? (
          <div className="space-y-1 max-h-[320px] overflow-y-auto scrollbar-thin">
            {personas.map((persona) => (
              <div
                key={persona.id}
                className="group flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors"
              >
                <HippyGhostAvatar seed={persona.id} className="size-6 shrink-0" />
                <div className="flex-1 min-w-0 flex items-baseline gap-2">
                  <span className="text-sm font-medium truncate">{persona.name}</span>
                  {persona.tags?.length > 0 && (
                    <span className="text-[11px] text-muted-foreground/60 truncate shrink-0">
                      {persona.tags
                        .slice(0, 2)
                        .map((tag) => `#${tag}`)
                        .join(" ")}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => removePersona(persona.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"
                >
                  <XIcon className="size-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground py-2">{t("loadingPersonas")}</div>
        )}

        <div className="flex items-center gap-2 pt-1 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectDialogOpen(true)}
            className="gap-1.5 text-muted-foreground"
          >
            <PlusIcon className="size-3.5" />
            {t("addMore")}
          </Button>
          <div className="flex-1" />
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={personas.length === 0 || submitting}
            className="gap-1.5"
          >
            {submitting ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <CheckIcon className="size-3.5" />
            )}
            {t("confirm", { count: personas.length })}
          </Button>
        </div>
      </div>

      <SelectPersonaDialog
        open={selectDialogOpen}
        onOpenChange={setSelectDialogOpen}
        onSelect={handleAddPersonas}
      />
    </>
  );
}
