"use client";
import { createOrGetUserPersonaChat, fetchPersonaWithDetails } from "@/app/(persona)/actions";
import { AnalysisResult } from "@/app/(persona)/persona/import/[personaImportId]/AnalysisResult";
import { PersonaImportAnalysis } from "@/app/(persona)/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import {
  ArrowRight,
  BrainIcon,
  CalendarIcon,
  FileTextIcon,
  MessageCircleIcon,
  TagIcon,
  UserIcon,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export function PersonaDetailClient({
  persona,
  analysis,
  personaImportId,
}: {
  persona: ExtractServerActionData<typeof fetchPersonaWithDetails>["persona"];
  analysis: Partial<PersonaImportAnalysis> | null;
  personaImportId: number | null;
}) {
  const t = useTranslations("PersonaImport.personaDetails");
  const tCommon = useTranslations("PersonaImport.personaChat");
  const tPersona = useTranslations("PersonaImport.personas");
  const locale = useLocale();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [isChatCreating, setIsChatCreating] = useState(false);
  const [authStatus, setAuthStatus] = useState<"loading" | "authenticated" | "unauthenticated">(
    "loading",
  );

  const handleLogin = () => {
    const currentUrl = window.location.href;
    const callbackUrl = encodeURIComponent(currentUrl);
    router.push(`/auth/signin?callbackUrl=${callbackUrl}`);
  };

  const handleStartChat = useCallback(async () => {
    setIsChatCreating(true);
    try {
      const result = await createOrGetUserPersonaChat(persona.token);
      if (!result.success) {
        throw new Error(result.message);
      }
      router.push(`/persona/chat/${result.data.token}`);
    } catch (error) {
      console.log("Failed to start chat:", error);
      toast.error("Failed to start chat");
    } finally {
      setIsChatCreating(false);
    }
  }, [persona.token, router]);

  const handleViewReport = () => {
    if (personaImportId) {
      router.push(`/persona/import/${personaImportId}`);
    }
  };

  // Update auth status based on session
  useEffect(() => {
    if (sessionStatus === "loading") {
      setAuthStatus("loading");
    } else if (sessionStatus === "authenticated" && session?.user) {
      setAuthStatus("authenticated");
    } else {
      setAuthStatus("unauthenticated");
    }
  }, [sessionStatus, session?.user]);

  const extractSummaryFromPrompt = (prompt: string) => {
    const match = prompt.match(/<persona>([\s\S]*?)<\/persona>/);
    return match ? match[1] : prompt;
  };

  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="space-y-4 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-4">
          <BrainIcon className="w-6 h-6" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{persona.name}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("description")}</p>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
        {authStatus === "authenticated" ? (
          <>
            <Button onClick={handleStartChat} disabled={isChatCreating} size="lg">
              <MessageCircleIcon className="h-4 w-4" />
              {isChatCreating ? tPersona("starting") : t("chatWithPersona")}
            </Button>
            {personaImportId && (
              <Button onClick={handleViewReport} variant="outline" size="lg">
                <FileTextIcon className="h-4 w-4" />
                {t("viewFullReport")}
              </Button>
            )}
          </>
        ) : authStatus === "unauthenticated" ? (
          <Button onClick={handleLogin} size="lg">
            {t("loginToChat")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {/* Details Section */}
      <div className="mt-12 space-y-8">
        {/* Persona Information */}

        <div className="space-y-4 bg-card rounded-lg border p-3 sm:p-6">
          <h2 className="text-xl font-semibold flex items-center gap-3 text-card-foreground">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <UserIcon className="size-3 text-primary-foreground" />
            </div>
            {t("personaInfo")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                {tCommon("created")}
              </div>
              <div className="text-base flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                {formatDate(persona.createdAt, locale)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                {tCommon("source")}
              </div>
              <div className="text-base">{persona.source}</div>
            </div>
          </div>
          {/* 对用户隐藏，现在还没有很好的解释 tier
            <div>
            <div className="text-sm font-medium text-muted-foreground mb-1">{tCommon("tier")}</div>
            <Badge variant="secondary" className="text-sm">
              {tCommon("tier")} {persona.tier}
            </Badge>
          </div>*/}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <TagIcon className="w-4 h-4" />
              {tCommon("tags")}
            </div>
            <div className="flex flex-wrap gap-2">
              {persona.tags?.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-sm">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs max-w-none p-4 bg-muted/50 rounded-lg border">
              <Streamdown>{extractSummaryFromPrompt(persona.prompt)}</Streamdown>
            </div>
          </div>
        </div>

        {/* Analysis Summary, 先隐藏，persona 详情页不需要显示 analysis，重复了 */}
        {false && analysis?.analysis && <AnalysisResult analysis={analysis?.analysis} />}
      </div>
    </div>
  );
}
