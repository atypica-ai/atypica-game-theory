import { BuildPersonaToolResult, TPersonaForStudy } from "@/ai/tools/types";
import { fetchPersonasByIds } from "@/app/study/actions";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
import { ToolInvocation } from "ai";
import { LoaderIcon, UserCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { RealPersonAgentsMethodology } from "./RealPersonAgentsMethodology";
import "./styles/RealPersonCard.css";

type TPersonaDetail = ExtractServerActionData<typeof fetchPersonasByIds>[number];

const PersonaGrids: FC<{
  personas: TPersonaForStudy[];
}> = ({ personas }) => {
  const t = useTranslations("StudyPage.ToolConsole");
  const [promptPersona, setPromptPersona] = useState<TPersonaDetail | null>(null);
  const [personasDetails, setPersonasDetails] = useState<TPersonaDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const realPersonaIds = useMemo(() => {
    const isRealPersonPrompt = (prompt: string) => {
      // Count Chinese characters
      const chineseChars = (prompt.match(/[\u4e00-\u9fff]/g) || []).length;
      // Count English words
      const englishText = prompt.replace(/[\u4e00-\u9fff]/g, "");
      const englishWords = englishText.trim() ? englishText.trim().split(/\s+/).length : 0;
      return chineseChars > 700 || englishWords > 500;
    };
    const ids = personasDetails
      .filter((detail) => isRealPersonPrompt(detail.prompt))
      .map((detail) => detail.id);
    return new Set(ids);
  }, [personasDetails]);

  const isRealPerson = useCallback(
    (personaId: number) => {
      return realPersonaIds.has(personaId);
    },
    [realPersonaIds],
  );

  const realPersonCount = realPersonaIds.size;

  const onPromptPersona = useCallback(
    (personaId: number) => {
      const promptPersona = personasDetails.find((persona) => persona.id === personaId);
      if (promptPersona) {
        setPromptPersona(promptPersona);
      }
    },
    [personasDetails],
  );

  useEffect(() => {
    setIsLoading(true);
    fetchPersonasByIds({
      ids: personas.map(({ personaId }) => personaId),
    })
      .then((result) => {
        if (!result.success) {
          throw new Error(result.message);
        }
        const personas = result.data;
        setPersonasDetails(personas);
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [personas]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 w-full">
        <LoaderIcon className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm flex items-center gap-1">
        <span>🤖 {t("searchPersonasResult", { count: personas.length })}</span>
        {realPersonCount > 0 && (
          <span className="text-xs font-medium">
            (
            {t(realPersonCount > 1 ? "realPersonCountPlural" : "realPersonCount", {
              count: realPersonCount,
            })}
            )
          </span>
        )}
      </h3>
      {realPersonCount > 0 && <RealPersonAgentsMethodology />}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {personas.map(({ personaId, name, source, tags }) => (
          <Card
            key={personaId}
            className="duration-300 hover:bg-accent/50 hover:shadow-md p-4 cursor-pointer flex flex-col relative"
            onClick={() => onPromptPersona(personaId)}
          >
            <CardHeader className="px-0">
              <CardTitle className="flex items-start gap-2 overflow-hidden">
                <div className={`${isRealPerson(personaId) ? "real-person-avatar p-1" : ""}`}>
                  <div className={isRealPerson(personaId) ? "avatar-inner" : ""}>
                    <HippyGhostAvatar seed={personaId} className="size-8" />
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="truncate text-sm font-medium">{name}</div>
                  {isRealPerson(personaId) ? (
                    <div className="text-xs text-violet-700 dark:text-violet-300 flex items-center gap-1 font-normal">
                      {t("realPersonAgent")}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground font-normal truncate">
                      {t("personaSource")}：{source}
                    </div>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardFooter className="mt-auto px-0">
              <div className="flex flex-wrap gap-1.5">
                {(tags as string[])?.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={!!promptPersona} onOpenChange={() => setPromptPersona(null)}>
        {promptPersona && (
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className={cn(isRealPerson(promptPersona.id) ? "real-person-avatar p-1" : "")}>
                  <div className={isRealPerson(promptPersona.id) ? "avatar-inner" : ""}>
                    <HippyGhostAvatar seed={promptPersona?.id} className="size-8" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {promptPersona?.name}
                  {isRealPerson(promptPersona.id) && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-gradient-to-r from-violet-50 to-fuchsia-50 text-violet-700 border-violet-200 font-semibold dark:from-violet-950/50 dark:to-fuchsia-950/50 dark:text-violet-300 dark:border-violet-800/50"
                    >
                      <UserCheckIcon className="size-3 mr-1" />
                      {t("realPersonAgent")}
                    </Badge>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="bg-muted/50 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">{promptPersona?.prompt}</pre>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export const SearchPersonasConsole: FC<{
  toolInvocation: ToolInvocation;
}> = ({ toolInvocation }) => {
  const t = useTranslations("StudyPage.ToolConsole");

  if (toolInvocation.state !== "result") {
    return (
      <div className="flex gap-2">
        <div className="text-sm">{t("buildingPersona")}</div>
        <div className="flex gap-1">
          <span className="animate-bounce">·</span>
          <span className="animate-bounce [animation-delay:0.2s]">·</span>
          <span className="animate-bounce [animation-delay:0.4s]">·</span>
        </div>
      </div>
    );
  }

  const { personas } = toolInvocation.result as BuildPersonaToolResult;

  return <PersonaGrids personas={personas} />;
};
