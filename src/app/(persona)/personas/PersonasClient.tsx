"use client";
import { createOrGetUserPersonaChat, fetchUserPersonas } from "@/app/(persona)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn, formatDate } from "@/lib/utils";
import {
  CalendarIcon,
  FileTextIcon,
  LockIcon,
  MessageCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  UsersIcon,
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
        router.push(`/personas/chat/${result.data.token}`);
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
    router.push(`/persona/${persona.id}`);
  };

  const NewPersonaCard = () => (
    <Card className="transition-all duration-300 hover:shadow-md border-dashed border-primary/30 min-w-80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-primary/20 rounded-full p-1">
            <PlusIcon className="size-4 text-primary" />
          </div>
          {t("importInterview")}
        </CardTitle>
      </CardHeader>
      <CardContent className="mt-auto">
        <div className="text-sm text-muted-foreground text-center mb-4">
          {t("createNewPersonas")}
        </div>
        <Button asChild className="w-full" size="sm">
          <Link href="/persona" className="flex items-center gap-2">
            <PlusIcon className="size-3" />
            {t("importNewInterview")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="container mx-auto px-8 py-12 max-w-6xl">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin">
      <div className="container mx-auto px-8 py-8 max-w-6xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded bg-primary text-primary-foreground mb-2">
            <UsersIcon className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">{t("subtitle")}</p>
        </div>

        {/* Personas Grid */}
        {personas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <NewPersonaCard />
            {personas.map((persona) => (
              <Card
                key={persona.id}
                className={cn(
                  "transition-all duration-300",
                  persona.personaImportProcessing
                    ? "opacity-75 cursor-not-allowed border-amber-500/30 bg-amber-500/10"
                    : "hover:shadow-md",
                )}
              >
                <CardHeader>
                  <CardTitle>
                    <div className="flex items-center text-xs gap-2 font-normal text-muted-foreground">
                      <CalendarIcon className="h-3 w-3" />
                      {formatDate(persona.createdAt, locale)}
                      {persona.personaImportProcessing && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded text-xs ml-auto">
                          <RefreshCwIcon className="w-3 h-3 animate-spin" />
                          {t("updating")}
                        </div>
                      )}
                    </div>
                  </CardTitle>
                  <CardDescription className="mt-3">
                    <div className="text-sm line-clamp-3 text-foreground font-medium">
                      {persona.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("source")}: {persona.source}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <MessageCircleIcon className="h-3 w-3 mr-1" />
                      Persona
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {persona.tags.slice(0, 2).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {persona.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{persona.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    {persona.personaImportProcessing ? (
                      <>
                        <Button size="sm" className="flex-1" disabled variant="outline">
                          <LockIcon className="size-3" />
                          {t("updating")}
                        </Button>
                        <Button size="sm" className="flex-1" disabled variant="outline">
                          <RefreshCwIcon className="size-3 animate-spin" />
                          {t("processing")}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          className="flex-1 hidden" // 暂时先隐藏，简单点进入详情页再 chat
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartChat(persona);
                          }}
                          disabled={chatCreating[persona.id]}
                          variant="outline"
                        >
                          <MessageCircleIcon className="size-3" />
                          {chatCreating[persona.id] ? t("starting") : t("startChat")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewPersona(persona);
                          }}
                        >
                          <FileTextIcon className="size-3" />
                          {t("viewDetails")}
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
            <NewPersonaCard />
          </div>
        )}
      </div>
    </div>
  );
}
