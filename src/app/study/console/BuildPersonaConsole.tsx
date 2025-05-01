import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BuildPersonaToolResult } from "@/tools/experts/buildPersona";
import { ToolInvocation } from "ai";
import { useTranslations } from "next-intl";
import { FC } from "react";

export const BuildPersonaConsole: FC<{
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
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Personas</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
        {personas.map((persona) => (
          <Card
            key={persona.personaId}
            className="transition-all duration-300 hover:bg-accent/50 cursor-pointer hover:shadow-md"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 overflow-hidden">
                <HippyGhostAvatar seed={persona.personaId} className="mt-0.5" />
                <div className="flex-1 truncate text-lg">{persona.name}</div>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {t("personaSource")}：{persona.source}
              </CardDescription>
            </CardHeader>
            {/* <CardContent>
              <div className="line-clamp-2 text-sm">{persona.prompt}</div>
            </CardContent> */}
            <CardFooter>
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
    </div>
  );
};
