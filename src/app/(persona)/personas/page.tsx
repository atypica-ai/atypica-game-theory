"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExtractServerActionData } from "@/lib/serverAction";
import {
  BotIcon,
  CalendarIcon,
  MessageCircleIcon,
  PlusIcon,
  TagIcon,
  UploadIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchUserPersonas } from "../actions";

type TPersona = ExtractServerActionData<typeof fetchUserPersonas>[number];

export default function UserPersonasPage() {
  const [personas, setPersonas] = useState<TPersona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<TPersona | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      <div className="container mx-auto px-8 py-12 max-w-6xl space-y-8 ">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-slate-900 mb-4">
            <BotIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">My Personas</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Manage and interact with your generated personas based on imported interview data.
          </p>
        </div>

        {/* Personas Grid */}
        {personas.length > 0 || true ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Import Interview Quick Action Card */}
            <Card className="transition-all duration-300 hover:shadow-md border-dashed border border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="bg-primary/20 rounded-full p-1">
                    <UploadIcon className="size-4 text-primary" />
                  </div>
                  Import Interview
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Create new AI personas from interview data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-slate-700 text-center">
                    Upload and analyze interview transcripts to generate interactive AI personas for
                    research and insights.
                  </div>
                  <div className="flex items-center justify-center">
                    <div className="bg-primary/10 px-2 py-1 rounded-full text-xs text-primary font-medium">
                      Quick Start
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/persona-import" className="flex items-center gap-2">
                    <PlusIcon className="size-4" />
                    Import New Interview
                  </Link>
                </Button>
              </CardFooter>
            </Card>

            {personas.map((persona) => (
              <Card
                key={persona.id}
                className="transition-all duration-300 hover:bg-accent/50 cursor-pointer hover:shadow-md"
                onClick={() => setSelectedPersona(persona)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
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
                <CardContent>
                  <div className="space-y-3">
                    <div className="line-clamp-3 text-sm text-slate-700">{persona.prompt}</div>
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {/* Persona Detail Dialog */}
        <Dialog open={!!selectedPersona} onOpenChange={() => setSelectedPersona(null)}>
          <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BotIcon className="size-5" />
                {selectedPersona?.name}
              </DialogTitle>
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="size-3" />
                    {selectedPersona && formatDate(selectedPersona.createdAt)}
                  </div>
                  <div>Source: {selectedPersona?.source}</div>
                  {selectedPersona?.tier !== null && (
                    <Badge variant="secondary" className="text-xs">
                      Tier {selectedPersona?.tier}
                    </Badge>
                  )}
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Tags */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TagIcon className="size-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Tags</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedPersona?.tags?.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Persona Prompt */}
              <div>
                <div className="text-sm font-medium text-slate-700 mb-2">Persona Prompt</div>
                <div className="bg-slate-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap font-mono text-slate-700">
                    {selectedPersona?.prompt}
                  </pre>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button asChild>
                <Link href={`/personas/${selectedPersona?.id}`} className="flex items-center gap-2">
                  <MessageCircleIcon className="size-4" />
                  Start Chat
                </Link>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
