import { fetchSearchedPersonasInStudy } from "@/app/(study)/study/actions";
import { useStudyContext } from "@/app/(study)/study/hooks/StudyContext";
import { TPersonaForStudy } from "@/app/(study)/tools/buildPersona/types";
import { StudyToolName, StudyUITools } from "@/app/(study)/tools/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExtractServerActionData } from "@/lib/serverAction";
import { ToolUIPart } from "ai";
import { LoaderIcon, UserCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { FC, useCallback, useEffect, useState } from "react";
import { HighPrecisionPersonaMethodology } from "./HighPrecisionPersonaMethodology";
import "./styles/RealPersonCard.css";

type TPersonaDetail = ExtractServerActionData<typeof fetchSearchedPersonasInStudy>[number];

const PersonaGrids: FC<{
  personas: TPersonaForStudy[];
}> = ({ personas }) => {
  const t = useTranslations("StudyPage.ToolConsole");
  const { studyUserChat } = useStudyContext();
  const [promptPersona, setPromptPersona] = useState<TPersonaDetail | null>(null);
  const [personasDetails, setPersonasDetails] = useState<TPersonaDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // const realPersonaIds = useMemo(() => {
  //   const isRealPersonPrompt = (prompt: string) => {
  //     // Count Chinese characters
  //     const chineseChars = (prompt.match(/[\u4e00-\u9fff]/g) || []).length;
  //     // Count English words
  //     const englishText = prompt.replace(/[\u4e00-\u9fff]/g, "");
  //     const englishWords = englishText.trim() ? englishText.trim().split(/\s+/).length : 0;
  //     return chineseChars > 700 || englishWords > 500;
  //   };
  //   const ids = personasDetails
  //     .filter((detail) => isRealPersonPrompt(detail.prompt))
  //     .map((detail) => detail.id);
  //   return new Set(ids);
  // }, [personasDetails]);
  // const isRealPerson = useCallback(
  //   (personaId: number) => {
  //     return realPersonaIds.has(personaId);
  //   },
  //   [realPersonaIds],
  // );
  // const realPersonCount = realPersonaIds.size;

  const tier2Count = personasDetails.filter((persona) => persona.tier === 2).length;
  // const tier3Count = personasDetails.filter((persona) => persona.tier === 3).length;

  const onPromptPersona = useCallback(
    (personaToken: string) => {
      const promptPersona = personasDetails.find((persona) => persona.token === personaToken);
      if (promptPersona) {
        setPromptPersona(promptPersona);
      }
    },
    [personasDetails],
  );

  useEffect(() => {
    setIsLoading(true);
    fetchSearchedPersonasInStudy({
      userChatToken: studyUserChat.token,
      filterByPersonaIds: personas.map(({ personaId }) => personaId),
    })
      .then((result) => {
        if (!result.success) throw result;
        const personas = result.data;
        setPersonasDetails(personas);
      })
      .catch((error) => {
        console.log(error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [personas, studyUserChat.token]);

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
        {tier2Count > 0 && (
          <span className="text-xs font-medium text-violet-700 dark:text-violet-300">
            (
            {t(tier2Count > 1 ? "highPrecisionPersonaCountPlural" : "highPrecisionPersonaCount", {
              count: tier2Count,
            })}
            )
          </span>
        )}
      </h3>
      {tier2Count > 0 && <HighPrecisionPersonaMethodology />}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
        {personasDetails.map((persona) => (
          <Card
            key={persona.token}
            className="duration-300 hover:bg-accent/50 hover:shadow-md p-4 cursor-pointer flex flex-col relative"
            onClick={() => onPromptPersona(persona.token)}
          >
            <CardHeader className="px-0">
              <CardTitle className="flex items-start gap-2 overflow-hidden">
                {persona.tier >= 2 ? (
                  <div className="real-person-avatar p-1">
                    <div className="avatar-inner">
                      <HippyGhostAvatar seed={persona.token} className="size-8" />
                    </div>
                  </div>
                ) : (
                  <HippyGhostAvatar seed={persona.token} className="size-8" />
                )}
                <div className="flex-1 flex flex-col justify-center min-w-0">
                  <div className="truncate text-sm font-medium">{persona.name}</div>
                  {persona.tier >= 2 ? (
                    <div className="text-xs text-violet-700 dark:text-violet-300 flex items-center gap-1 font-normal">
                      {persona.tier === 3 ? t("humanPersonaPrivate") : t("highPrecisionPersona")}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground font-normal truncate">
                      {t("personaSource")}：{persona.source}
                    </div>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardFooter className="mt-auto px-0">
              <div className="flex flex-wrap gap-1.5">
                {persona.tags.map((tag, index) => (
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
                {promptPersona.tier >= 2 ? (
                  <div className="real-person-avatar p-1">
                    <div className="avatar-inner">
                      <HippyGhostAvatar seed={promptPersona.token} className="size-8" />
                    </div>
                  </div>
                ) : (
                  <HippyGhostAvatar seed={promptPersona.token} className="size-8" />
                )}
                <div className="flex items-center gap-3">
                  {promptPersona.name}
                  {promptPersona.tier >= 2 ? (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-linear-to-r from-violet-50 to-fuchsia-50 text-violet-700 border-violet-200 font-semibold dark:from-violet-950/50 dark:to-fuchsia-950/50 dark:text-violet-300 dark:border-violet-800/50"
                    >
                      <UserCheckIcon className="size-3 mr-1" />
                      {promptPersona.tier === 3
                        ? t("humanPersonaPrivate")
                        : t("highPrecisionPersona")}
                    </Badge>
                  ) : null}
                </div>
              </DialogTitle>
            </DialogHeader>
            <div className="bg-muted/50 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">{promptPersona.prompt}</pre>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export const SearchPersonasConsole: FC<{
  toolInvocation: ToolUIPart<Pick<StudyUITools, StudyToolName.searchPersonas>>;
}> = ({ toolInvocation }) => {
  const t = useTranslations("StudyPage.ToolConsole");

  if (toolInvocation.state === "input-streaming" || toolInvocation.state === "input-available") {
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
  } else if (toolInvocation.state === "output-available") {
    return <PersonaGrids personas={toolInvocation.output.personas} />;
  } else {
    // toolInvocation.state === "output-error"
    return null;
  }
};
