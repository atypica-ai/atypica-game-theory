"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Mic, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ConfirmPanelResearchPlanInput, ConfirmPanelResearchPlanOutput } from "./types";

interface ConfirmPlanMessageProps {
  input: ConfirmPanelResearchPlanInput;
  onConfirm: (output: ConfirmPanelResearchPlanOutput) => void;
}

export function ConfirmPlanMessage({ input, onConfirm }: ConfirmPlanMessageProps) {
  const tWizard = useTranslations("PersonaPanel.ResearchWizard");
  const tPanel = useTranslations("PersonaPanel.DetailPage");

  // Editable state — initialized from agent's plan
  const [question, setQuestion] = useState(input.question);
  const [executionPlan, setExecutionPlan] = useState(input.executionPlan);
  const [submitting, setSubmitting] = useState(false);

  const researchTypeIcons = {
    focusGroup: Users,
    userInterview: MessageCircle,
    expertInterview: Mic,
  };

  const Icon = researchTypeIcons[input.researchType];

  const handleConfirm = () => {
    setSubmitting(true);
    onConfirm({
      confirmed: true,
      question,
      executionPlan,
      plainText: `Research plan confirmed. Type: ${input.researchType}, Question: ${question}, Participants: ${input.personaCount}, Plan: ${executionPlan}`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* Research Type (read-only) */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {tWizard("confirmPlan.researchType")}
          </span>
          <Badge variant="outline" className="gap-1.5">
            <Icon className="size-3" />
            {tPanel(`projectType.${input.researchType}`)}
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
            className="text-sm resize-none min-h-[60px]"
            disabled={submitting}
          />
        </div>

        {/* Participants (read-only) */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {tWizard("confirmPlan.participants")}
          </span>
          <p className="text-sm font-medium">{input.personaCount} personas</p>
        </div>

        {/* Execution Plan (editable) */}
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {tWizard("confirmPlan.executionPlan")}
          </span>
          <Textarea
            value={executionPlan}
            onChange={(e) => setExecutionPlan(e.target.value)}
            className="text-sm resize-none min-h-[120px]"
            disabled={submitting}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <Button size="sm" onClick={handleConfirm} disabled={submitting || !question.trim()}>
          {submitting ? tWizard("confirmPlan.confirming") : tWizard("confirmPlan.confirm")}
        </Button>
      </div>
    </div>
  );
}
