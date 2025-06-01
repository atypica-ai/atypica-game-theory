"use client";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

export function DemoSection() {
  const t = useTranslations("HomePage.DemoSection");

  return (
    <div className="py-24 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="mb-4">
            {t("badge")}
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold heading-serif">{t("title")}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("description")}</p>
        </div>

        <div className="mb-8">
          <div className="code-block-style p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-red-500"></div>
              <div className="w-2 h-2 bg-yellow-500"></div>
              <div className="w-2 h-2 bg-green-500"></div>
              <span className="ml-4 text-sm text-muted-foreground heading-mono">
                {t("terminal.title")}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="heading-mono text-primary">{t("terminal.command")}</div>
              <div className="text-muted-foreground">{t("terminal.steps.scout")}</div>
              <div className="text-muted-foreground">{t("terminal.steps.builder")}</div>
              <div className="text-muted-foreground">{t("terminal.steps.expert")}</div>
              <div className="text-muted-foreground">{t("terminal.steps.analyst")}</div>
              <div className="text-foreground font-medium">{t("terminal.steps.complete")}</div>
            </div>
          </div>
        </div>

        <div className="bg-background border border-border p-6">
          <h3 className="text-lg font-semibold mb-4 heading-serif">{t("interview.title")}</h3>
          <div className="space-y-4 text-sm">
            <div className="bg-muted/30 p-3 border-l-2 border-primary">
              <div className="font-medium text-xs text-primary mb-1">
                {t("interview.profile.label")}
              </div>
              <div className="text-muted-foreground">
                <strong>{t("interview.profile.name")}</strong> - {t("interview.profile.details")}
                <br />
                <em>{t("interview.profile.pattern")}</em>
              </div>
            </div>
            <div className="border-l-2 border-primary pl-4">
              <div className="font-medium text-primary">{t("interview.conversation.expert")}</div>
              <div className="text-muted-foreground italic">
                &quot;{t("interview.conversation.question1")}&quot;
              </div>
            </div>
            <div className="border-l-2 border-muted pl-4">
              <div className="font-medium">{t("interview.conversation.persona")}</div>
              <div className="text-muted-foreground">
                &quot;{t("interview.conversation.answer1")}&quot;
              </div>
            </div>
            <div className="border-l-2 border-primary pl-4">
              <div className="font-medium text-primary">{t("interview.conversation.expert")}</div>
              <div className="text-muted-foreground italic">
                &quot;{t("interview.conversation.question2")}&quot;
              </div>
            </div>
            <div className="border-l-2 border-muted pl-4">
              <div className="font-medium">{t("interview.conversation.persona")}</div>
              <div className="text-muted-foreground">
                &quot;{t("interview.conversation.answer2")}&quot;
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
