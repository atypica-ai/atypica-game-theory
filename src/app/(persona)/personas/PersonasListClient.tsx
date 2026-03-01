"use client";
import { createOrGetUserPersonaChat, fetchUserPersonas } from "@/app/(persona)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn, formatDate } from "@/lib/utils";
import {
  CalendarIcon,
  FileTextIcon,
  Loader2Icon,
  LockIcon,
  MessageCircleIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { SharePersonaButton } from "./SharePersonaButton";

type PersonaWithStatus = ExtractServerActionData<typeof fetchUserPersonas>[number];

export function PersonasListClient() {
  const t = useTranslations("PersonaImport.personas");
  const locale = useLocale();
  const router = useRouter();
  const [personas, setPersonas] = useState<PersonaWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chatCreating, setChatCreating] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const loadPersonas = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchUserPersonas(searchQuery || undefined);
      if (!result.success) throw result;
      setPersonas(result.data);
    } catch (error) {
      console.log("Failed to fetch personas:", error);
      toast.error(t("loadingFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t, searchQuery]);

  useEffect(() => {
    loadPersonas();
    // Only poll when not searching
    if (!searchQuery) {
      const interval = setInterval(() => {
        loadPersonas();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [loadPersonas, searchQuery]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearchQuery(inputRef.current?.value ?? "");
  };

  const clearSearch = () => {
    if (inputRef.current) inputRef.current.value = "";
    setSearchQuery("");
  };

  const handleStartChat = useCallback(
    async (persona: PersonaWithStatus) => {
      if (persona.personaImportProcessing) {
        toast.warning(t("updating"));
        return;
      }
      setChatCreating((prev) => ({ ...prev, [persona.token]: true }));
      try {
        const result = await createOrGetUserPersonaChat(persona.token);
        if (!result.success) throw result;
        router.push(`/persona/chat/${result.data.token}`);
      } catch (error) {
        console.log("Failed to start chat:", error);
        toast.error("Failed to start chat");
      } finally {
        setChatCreating((prev) => ({ ...prev, [persona.token]: false }));
      }
    },
    [router, t],
  );

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
        <Button variant="secondary" asChild className="w-full" size="sm">
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
            <Loader2Icon className="size-8 animate-spin" />
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

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              defaultValue={searchQuery}
              placeholder={t("searchPlaceholder")}
              className="pl-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button type="submit">{t("search")}</Button>
        </form>

        {/* Personas Grid */}
        {personas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <NewPersonaCard />
            {personas.map((persona) => (
              <Card
                key={persona.token}
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
                      {!persona.personaImportProcessing && (
                        <div className="ml-auto">
                          <SharePersonaButton persona={{ token: persona.token }} />
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
                          disabled={persona.token in chatCreating}
                          variant="outline"
                        >
                          <MessageCircleIcon className="size-3" />
                          {persona.token in chatCreating ? t("starting") : t("startChat")}
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1" asChild>
                          {persona.personaImportProcessing ? (
                            <div>{t("updating")}</div>
                          ) : (
                            <Link prefetch={true} href={`/personas/${persona.token}`}>
                              <FileTextIcon className="size-3" />
                              {t("viewDetails")}
                            </Link>
                          )}
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
