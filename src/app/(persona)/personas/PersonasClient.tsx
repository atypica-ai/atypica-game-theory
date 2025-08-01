"use client";
import { createOrGetUserPersonaChat, fetchUserPersonas } from "@/app/(persona)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn, formatDate } from "@/lib/utils";
import {
  BotIcon,
  CalendarIcon,
  FileTextIcon,
  LockIcon,
  MessageCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  UploadIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type PersonaWithStatus = ExtractServerActionData<typeof fetchUserPersonas>[number];

export default function PersonasClient() {
  const t = useTranslations("PersonaImport.personas");
  const locale = useLocale();
  const router = useRouter();
  const [personas, setPersonas] = useState<PersonaWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chatCreating, setChatCreating] = useState<Record<number, boolean>>({});

  const loadPersonas = useCallback(async () => {
    try {
      const result = await fetchUserPersonas();
      if (!result.success) throw result;
      setPersonas(result.data);
    } catch (error) {
      console.log("Failed to fetch personas:", error);
      toast.error(t("loadingFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadPersonas();
    const interval = setInterval(() => {
      loadPersonas();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadPersonas]);

  const handleStartChat = useCallback(
    async (persona: PersonaWithStatus) => {
      if (persona.personaImportProcessing) {
        toast.warning(t("updating"));
        return;
      }
      setChatCreating((prev) => ({ ...prev, [persona.id]: true }));
      try {
        const result = await createOrGetUserPersonaChat(persona.id);
        if (!result.success) {
          throw new Error(result.message);
        }
        router.push(`/persona-chat/${result.data.token}`);
      } catch (error) {
        console.log("Failed to start chat:", error);
        toast.error("Failed to start chat");
      } finally {
        setChatCreating((prev) => ({ ...prev, [persona.id]: false }));
      }
    },
    [router, t],
  );

  const handleViewPersona = (persona: PersonaWithStatus) => {
    if (persona.personaImportProcessing) {
      toast.warning(t("updating"));
      return;
    }
    router.push(`/persona-import/${persona.personaImportId}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-8 py-12 max-w-6xl">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="container mx-auto px-8 py-8 max-w-6xl space-y-6 ">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded bg-slate-900 mb-2">
            <BotIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t("title")}</h1>
          <p className="text-slate-600 max-w-xl mx-auto">{t("subtitle")}</p>
        </div>

        {/* Personas Grid */}
        {personas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Import Interview Quick Action Card */}
            <Card className="transition-all duration-300 hover:shadow-md border-dashed border border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <div className="bg-primary/20 rounded-full p-1">
                    <UploadIcon className="size-4 text-primary" />
                  </div>
                  {t("importInterview")}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 mt-auto">
                <div className="text-sm text-slate-600 text-center mb-4">
                  {t("createNewPersonas")}
                </div>
                <Button asChild className="w-full" size="sm">
                  <Link href="/persona-import" className="flex items-center gap-2">
                    <PlusIcon className="size-3" />
                    {t("importNewInterview")}
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {personas.map((persona) => (
              <Card
                key={persona.id}
                className={cn(
                  "transition-all duration-300",
                  persona.personaImportProcessing
                    ? "opacity-75 cursor-not-allowed border-amber-200 bg-amber-50/30"
                    : "hover:shadow-md",
                )}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{persona.name}</span>
                    <div className="flex items-center gap-2">
                      {persona.personaImportProcessing && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                          <RefreshCwIcon className="w-3 h-3 animate-spin" />
                          {t("updating")}
                        </div>
                      )}
                      {persona.tier !== null && (
                        <Badge variant="secondary" className="text-xs">
                          {t("tier")}
                          {persona.tier}
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="size-3" />
                      {formatDate(persona.createdAt, locale)}
                    </div>
                    <div className="mt-1">Source: {persona.source}</div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {persona.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {persona.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{persona.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    {persona.personaImportProcessing ? (
                      <>
                        <Button size="sm" className="flex-1" disabled variant="outline">
                          <LockIcon className="size-3 mr-2" />
                          {t("updating")}...
                        </Button>
                        <Button size="sm" className="flex-1" disabled variant="outline">
                          <RefreshCwIcon className="size-3 mr-2 animate-spin" />
                          {t("processing")}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleStartChat(persona)}
                          disabled={chatCreating[persona.id]}
                        >
                          <MessageCircleIcon className="size-3 mr-2" />
                          {chatCreating[persona.id] ? t("starting") : t("startChat")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleViewPersona(persona)}
                        >
                          <FileTextIcon className="size-3 mr-2" />
                          {t("viewAnalysis")}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-full max-w-sm">
              <Card className="transition-all duration-300 hover:shadow-md border-dashed border border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2">
                    <div className="bg-primary/20 rounded-full p-1">
                      <UploadIcon className="size-4 text-primary" />
                    </div>
                    {t("importInterview")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 mt-auto">
                  <div className="text-sm text-slate-600 text-center mb-4">
                    {t("createNewPersonas")}
                  </div>
                  <Button asChild className="w-full" size="sm">
                    <Link href="/persona-import" className="flex items-center gap-2">
                      <PlusIcon className="size-3" />
                      {t("importNewInterview")}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
