import { TPersonaForStudy } from "@/ai/tools/experts/buildPersona";
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
import { SparklesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { FC, useCallback, useEffect, useState } from "react";
import { fetchPersonasByIds } from "../actions";

type TPersonaDetail = ExtractServerActionData<typeof fetchPersonasByIds>[number];

export const PersonaGrids: FC<{
  personas: TPersonaForStudy[];
}> = ({ personas }) => {
  const t = useTranslations("StudyPage.ToolConsole");
  const [selectedPersona, setSelectedPersona] = useState<TPersonaDetail | null>(null);
  const [personasDetails, setPersonasDetails] = useState<TPersonaDetail[]>([]);

  const onSelectPersona = useCallback(
    (personaId: number) => {
      const selectedPersona = personasDetails.find((persona) => persona.id === personaId);
      if (selectedPersona) {
        setSelectedPersona(selectedPersona);
      }
    },
    [personasDetails],
  );

  useEffect(() => {
    fetchPersonasByIds({
      ids: personas.map(({ personaId }) => personaId),
    }).then((result) => {
      if (!result.success) {
        throw new Error(result.message);
      }
      setPersonasDetails(result.data);
    });
  }, [personas]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-5">
        {personas.map((persona) => (
          <Card
            key={persona.personaId}
            className="transition-all duration-300 hover:bg-accent/50 hover:shadow-md p-4"
          >
            <CardHeader className="px-0">
              <CardTitle className="flex items-center gap-2 overflow-hidden">
                <HippyGhostAvatar seed={persona.personaId} className="size-7 mt-0.5" />
                <div className="flex-1 truncate text-base">{persona.name}</div>
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs h-7 bg-primary/80"
                  onClick={() => onSelectPersona(persona.personaId)}
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
      </div>
      <Dialog open={!!selectedPersona} onOpenChange={() => setSelectedPersona(null)}>
        {selectedPersona && (
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedPersona?.name}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t("personaSource")}：{selectedPersona?.source}
              </DialogDescription>
            </DialogHeader>
            <div className="bg-muted/50 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap font-mono">{selectedPersona?.prompt}</pre>
            </div>
            <DialogFooter className="justify-between sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {(selectedPersona?.tags as string[])?.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
};
