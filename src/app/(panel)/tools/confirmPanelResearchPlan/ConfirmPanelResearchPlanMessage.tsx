"use client";

import {
  TAddUniversalUIToolResult,
  TUniversalMessageWithTool,
  UniversalToolName,
} from "@/app/(universal)/tools/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckIcon, Loader2Icon, MessageCircle, Mic, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

type ConfirmPanelResearchPlanToolUIPart = Extract<
  TUniversalMessageWithTool["parts"][number],
  { type: `tool-${typeof UniversalToolName.confirmPanelResearchPlan}` }
>;

export function ConfirmPanelResearchPlanMessage({
  toolInvocation,
  addToolResult,
}: {
  toolInvocation: ConfirmPanelResearchPlanToolUIPart;
  addToolResult?: TAddUniversalUIToolResult;
}) {
  const tWizard = useTranslations("PersonaPanel.ResearchWizard");
  const tPanel = useTranslations("PersonaPanel.DetailPage");

  const [question, setQuestion] = useState(toolInvocation.input?.question ?? "");
  const [executionPlan, setExecutionPlan] = useState(toolInvocation.input?.executionPlan ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const raw = toolInvocation.input?.researchType;
  const researchType =
    raw === "focusGroup" || raw === "userInterview" || raw === "expertInterview"
      ? raw
      : "focusGroup";

  const researchTypeIcons = {
    focusGroup: Users,
    userInterview: MessageCircle,
    expertInterview: Mic,
  } as const;

  const personaCount = toolInvocation.input?.personaCount ?? 0;
  const Icon = researchTypeIcons[researchType];

  const handleConfirm = useCallback(async () => {
    if (!addToolResult || !question.trim()) return;
    setSubmitting(true);

    await addToolResult({
      tool: UniversalToolName.confirmPanelResearchPlan,
      toolCallId: toolInvocation.toolCallId,
      output: {
        confirmed: true,
        question,
        executionPlan,
        plainText: `Research plan confirmed. Type: ${researchType}, Question: ${question}, Participants: ${personaCount}, Plan: ${executionPlan}`,
      },
    });

    setConfirmed(true);
    setSubmitting(false);
  }, [
    addToolResult,
    question,
    executionPlan,
    toolInvocation.toolCallId,
    researchType,
    personaCount,
  ]);

  // Output available or just confirmed — read-only summary
  if (confirmed || toolInvocation.state === "output-available") {
    return (
      <div className="p-3 rounded-lg border border-green-500/20 bg-green-500/5">
        <div className="flex items-center gap-2 text-sm">
          <CheckIcon className="size-4 text-green-600" />
          <span>{tWizard("confirmPlan.confirm")}</span>
        </div>
      </div>
    );
  }

  // Input available — interactive form
  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin">
      <div className="space-y-3">
        {/* Research Type (read-only) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {tWizard("confirmPlan.researchType")}
          </span>
          <Badge variant="outline" className="gap-1.5">
            <Icon className="size-3" />
            {tPanel(`projectType.${researchType}`)}
          </Badge>
        </div>

        {/* Question (editable) */}
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {tWizard("confirmPlan.question")}
          </span>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="text-sm resize-none min-h-[60px] max-h-[150px]"
            disabled={submitting}
          />
        </div>

        {/* Participants (read-only) */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {tWizard("confirmPlan.participants")}
          </span>
          <p className="text-sm font-medium">{personaCount} personas</p>
        </div>

        {/* Execution Plan (editable) */}
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {tWizard("confirmPlan.executionPlan")}
          </span>
          <Textarea
            value={executionPlan}
            onChange={(e) => setExecutionPlan(e.target.value)}
            className="text-sm resize-none min-h-[120px] max-h-[200px]"
            disabled={submitting}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <Button size="sm" onClick={handleConfirm} disabled={submitting || !question.trim()}>
          {submitting ? (
            <>
              <Loader2Icon className="size-3.5 animate-spin mr-1.5" />
              {tWizard("confirmPlan.confirming")}
            </>
          ) : (
            tWizard("confirmPlan.confirm")
          )}
        </Button>
      </div>
    </div>
  );
}
