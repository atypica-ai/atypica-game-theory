import { fetchPersonasByScoutUserChatToken } from "@/app/study/actions";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExtractServerActionData } from "@/lib/serverAction";
import { ToolInvocation } from "ai";
import { SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { FC, useCallback, useEffect, useState } from "react";

type TPersonaDetail = ExtractServerActionData<typeof fetchPersonasByScoutUserChatToken>[number];

export const BuildPersonaConsole: FC<{
  toolInvocation: ToolInvocation;
}> = ({ toolInvocation }) => {
  const t = useTranslations("StudyPage.ToolConsole");
  const scoutUserChatToken = toolInvocation.args.scoutUserChatToken as string;
  const [promptPersona, setPromptPersona] = useState<TPersonaDetail | null>(null);
  const [personasDetails, setPersonasDetails] = useState<TPersonaDetail[]>([]);

  const onPromptPersona = useCallback(
    (personaId: number) => {
      const promptPersona = personasDetails.find((persona) => persona.id === personaId);
      if (promptPersona) {
        setPromptPersona(promptPersona);
      }
    },
    [personasDetails],
  );

  const fetchPersonasInProgress = useCallback(async () => {
    const result = await fetchPersonasByScoutUserChatToken({ scoutUserChatToken });
    if (result.success) {
      setPersonasDetails(result.data);
    } else {
      console.error("Failed to fetch personas:", result.message);
    }
  }, [scoutUserChatToken]);

  useEffect(() => {
    if (toolInvocation.state === "result") {
      fetchPersonasInProgress();
      return;
    }
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      timeoutId = setTimeout(poll, 5000); // 要放在前面，不然下面 return () 的时候如果 fetchPersonasInProgress 还没完成就不会 clearTimeout 了
      await fetchPersonasInProgress();
    };
    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [toolInvocation.state, fetchPersonasInProgress]);

  // 因为 scoutTask 就是本次研究的，不重复显示了，这样也可以和 searchPersonas 工具的显示方式区分开
  // if (toolInvocation.state === "result") {
  //   const { personas } = toolInvocation.result as BuildPersonaToolResult;
  //   return (
  //     <div className="py-2 h-full flex flex-col items-stretch justify-start gap-4">
  //       <h3 className="text-sm">🤖 {t("buildPersonaResult", { count: personas.length })}</h3>
  //       <PersonaGridsWithScoutHistory personas={personas} />
  //     </div>
  //   );
  // }

  return (
    <div>
      <div className="mb-4 text-sm">
        🤖 {t("buildPersonaResult", { count: personasDetails.length })}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2 gap-4">
        {personasDetails.map((persona) => (
          <Card key={persona.id} className="duration-300 hover:bg-accent/50 hover:shadow-md p-4">
            <CardHeader className="px-0">
              <CardTitle className="flex items-center gap-2 overflow-hidden">
                <HippyGhostAvatar seed={persona.id} className="size-6" />
                <div className="flex-1 truncate text-sm">{persona.name}</div>
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs h-6 px-1 bg-primary/80"
                  onClick={() => onPromptPersona(persona.id)}
                >
                  <SparklesIcon className="size-3" />
                  {t("personaPrompt")}
                </Button>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t("personaSource")}：{persona.source}
              </CardDescription>
            </CardHeader>
            {/* <CardContent className="px-1">
                <div className="line-clamp-2 text-sm">{persona.prompt}</div>
              </CardContent> */}
            <CardFooter className="mt-auto px-0">
              <div className="flex flex-wrap gap-1.5">
                {(persona.tags as string[])?.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardFooter>
          </Card>
        ))}

        {/* Loading Card */}
        {toolInvocation.state !== "result" && (
          <Card className="flex flex-col p-4 border-dashed border-2 bg-muted/20">
            <CardHeader className="px-0">
              <CardTitle className="flex items-center gap-2 overflow-hidden">
                <div className="size-6 rounded-full bg-muted animate-pulse"></div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">{t("buildingPersona")}</div>
                  <div className="flex gap-1">
                    <span className="animate-bounce">·</span>
                    <span className="animate-bounce [animation-delay:0.2s]">·</span>
                    <span className="animate-bounce [animation-delay:0.4s]">·</span>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardFooter className="mt-auto px-0">
              <div className="flex flex-wrap gap-1.5">
                <div className="h-5 w-12 bg-muted rounded animate-pulse"></div>
                <div className="h-5 w-16 bg-muted rounded animate-pulse"></div>
                <div className="h-5 w-10 bg-muted rounded animate-pulse"></div>
              </div>
            </CardFooter>
          </Card>
        )}
      </div>

      <Dialog open={!!promptPersona} onOpenChange={() => setPromptPersona(null)}>
        {promptPersona && (
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{promptPersona?.name}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("personaSource")}：{promptPersona?.source}
              </DialogDescription>
            </DialogHeader>
            <div className="bg-muted/50 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">{promptPersona?.prompt}</pre>
            </div>
            <DialogFooter className="justify-between sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {(promptPersona?.tags as string[])?.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};
