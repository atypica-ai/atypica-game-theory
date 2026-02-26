"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, MessageCircle, Mic, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { createUniversalAgentFromPanel } from "./actions";

type ResearchType = "focusGroup" | "userInterview" | "expertInterview";

interface ResearchWizardClientProps {
  panelId: number;
  panelTitle: string;
  personas: Array<{ id: number; name: string }>;
}

export function ResearchWizardClient({
  panelId,
  panelTitle,
  personas,
}: ResearchWizardClientProps) {
  const tWizard = useTranslations("PersonaPanel.ResearchWizard");
  const tPanel = useTranslations("PersonaPanel");
  const router = useRouter();

  const [researchType, setResearchType] = useState<ResearchType>("focusGroup");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const researchTypeOptions = [
    {
      type: "focusGroup" as const,
      icon: Users,
      label: tPanel("DetailPage.projectType.focusGroup"),
    },
    {
      type: "userInterview" as const,
      icon: MessageCircle,
      label: tPanel("DetailPage.projectType.userInterview"),
    },
    {
      type: "expertInterview" as const,
      icon: Mic,
      label: tPanel("DetailPage.projectType.expertInterview"),
    },
  ];

  const handleSubmit = useCallback(async () => {
    if (!question.trim()) return;

    setSubmitting(true);
    const result = await createUniversalAgentFromPanel(panelId, researchType, question.trim(), personas);

    if (result.success) {
      // Redirect immediately to project detail page
      router.push(`/panel/project/${result.data.token}`);
    } else {
      toast.error(result.message ?? "Failed to create research");
      setSubmitting(false);
    }
  }, [panelId, researchType, question, personas, router]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {/* Header */}
      <Link
        href={`/panel/${panelId}`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="size-3" />
        {panelTitle || `Panel #${panelId}`}
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight mb-1">{tWizard("title")}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {personas.length} {tPanel("personaCount", { count: personas.length })}
      </p>

      {/* Form */}
      <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {tWizard("researchType")} <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {researchTypeOptions.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => setResearchType(type)}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all",
                  researchType === type
                    ? "border-foreground/20 bg-accent"
                    : "border-border hover:border-foreground/20",
                )}
              >
                <Icon className="size-5 text-muted-foreground" />
                <span className="text-xs font-medium text-center">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {tWizard("question")} <span className="text-red-500">*</span>
          </label>
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={tWizard("questionPlaceholder")}
            className="min-h-[120px] text-sm resize-none"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/panel/${panelId}`}>{tWizard("cancel")}</Link>
          </Button>
          <Button onClick={handleSubmit} disabled={!question.trim() || submitting} size="sm">
            {submitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
                {tPanel("ListPage.creating")}
              </>
            ) : (
              tWizard("start")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
