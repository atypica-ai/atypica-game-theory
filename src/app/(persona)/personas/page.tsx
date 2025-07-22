"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExtractServerActionData } from "@/lib/serverAction";
import {
  BotIcon,
  CalendarIcon,
  FileTextIcon,
  MessageCircleIcon,
  PlusIcon,
  UploadIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createOrGetUserPersonaChat, fetchUserPersonas } from "../actions";

type TPersona = ExtractServerActionData<typeof fetchUserPersonas>[number];

export default function UserPersonasPage() {
  const router = useRouter();
  const [personas, setPersonas] = useState<TPersona[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chatCreating, setChatCreating] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const loadPersonas = async () => {
      try {
        const result = await fetchUserPersonas();
        if (!result.success) {
          throw new Error(result.message);
        }
        setPersonas(result.data);
      } catch (error) {
        console.error("Failed to fetch personas:", error);
        toast.error("Failed to load personas");
      } finally {
        setIsLoading(false);
      }
    };

    loadPersonas();
  }, []);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  const handleStartChat = async (personaId: number) => {
    setChatCreating((prev) => ({ ...prev, [personaId]: true }));
    try {
      const result = await createOrGetUserPersonaChat(personaId);
      if (!result.success) {
        throw new Error(result.message);
      }
      router.push(`/persona-chat/${result.data.token}`);
    } catch (error) {
      console.error("Failed to start chat:", error);
      toast.error("Failed to start chat");
    } finally {
      setChatCreating((prev) => ({ ...prev, [personaId]: false }));
    }
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
          <h1 className="text-2xl font-bold text-slate-900">My Personas</h1>
          <p className="text-slate-600 max-w-xl mx-auto">
            Manage and interact with your generated personas
          </p>
        </div>

        {/* Personas Grid */}
        {personas.length > 0 || true ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Import Interview Quick Action Card */}
            <Card className="transition-all duration-300 hover:shadow-md border-dashed border border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <div className="bg-primary/20 rounded-full p-1">
                    <UploadIcon className="size-4 text-primary" />
                  </div>
                  Import Interview
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 mt-auto">
                <div className="text-sm text-slate-600 text-center mb-4">
                  Create new personas from interview data
                </div>
                <Button asChild className="w-full" size="sm">
                  <Link href="/persona-import" className="flex items-center gap-2">
                    <PlusIcon className="size-3" />
                    Import New Interview
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {personas.map((persona) => (
              <Card key={persona.id} className="transition-all duration-300 hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{persona.name}</span>
                    {persona.tier !== null && (
                      <Badge variant="secondary" className="text-xs">
                        T{persona.tier}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="size-3" />
                      {formatDate(persona.createdAt)}
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
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleStartChat(persona.id)}
                      disabled={chatCreating[persona.id]}
                    >
                      <MessageCircleIcon className="size-3 mr-2" />
                      {chatCreating[persona.id] ? "Starting..." : "Start Chat"}
                    </Button>
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link
                        href={`/persona-import/${persona.personaImportId}`}
                        target="_blank"
                        className="flex items-center gap-2"
                      >
                        <FileTextIcon className="size-3" />
                        View Analysis
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
