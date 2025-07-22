"use client";

import { UserChatSession } from "@/components/chat/UserChatSession";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Persona, PersonaImport } from "@/prisma/client";
import { useChat } from "@ai-sdk/react";
import { BotIcon, CalendarIcon, TagIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface PersonaChatPageProps {
  persona: Persona & { personaImport: PersonaImport | null };
}

export function PersonaChatPage({ persona }: PersonaChatPageProps) {
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Chat hooks
  const useChatHelpers = useChat({
    api: "/api/persona/chat",
    body: { id: persona.id },
    onError: (error) => {
      console.error("Chat error:", error);
      toast.error("聊天出现错误，请重试");
    },
  });

  const useChatRef = useRef({
    reload: useChatHelpers.reload,
    setMessages: useChatHelpers.setMessages,
    append: useChatHelpers.append,
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="flex-1 flex flex-row overflow-hidden relative">
      {/* Persona Info Sidebar */}
      <div
        className={cn(
          "bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-10",
          isCollapsed
            ? "w-16 md:flex hidden"
            : "w-80 md:flex absolute md:relative inset-y-0 left-0",
        )}
      >
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <h2 className="text-lg font-semibold text-slate-900 truncate">Persona Details</h2>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="shrink-0"
            >
              {isCollapsed ? "→" : "←"}
            </Button>
          </div>
        </div>
        {!isCollapsed && (
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BotIcon className="size-4" />
                  {persona.name}
                </CardTitle>
                <CardDescription className="text-sm">
                  <div className="flex items-center gap-1 text-slate-600">
                    <CalendarIcon className="size-3" />
                    {formatDate(persona.createdAt)}
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1">Source</div>
                    <div className="text-sm text-slate-700">{persona.source}</div>
                  </div>
                  {persona.tier !== null && (
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1">Tier</div>
                      <Badge variant="secondary" className="text-xs">
                        Tier {persona.tier}
                      </Badge>
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-2 flex items-center gap-1">
                      <TagIcon className="size-3" />
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(persona.tags as string[])?.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Persona Import Info */}
            {persona.personaImport && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Import Details</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1">Import ID</div>
                      <div className="text-sm text-slate-700">#{persona.personaImport.id}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500 mb-1">Created</div>
                      <div className="text-sm text-slate-700">
                        {formatDate(persona.personaImport.createdAt)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Persona Prompt */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Persona Prompt</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="bg-slate-50 rounded-lg p-3 max-h-60 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono text-slate-700">
                    {persona.prompt}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      {/* Chat Area */}
      <div className="flex-1 flex flex-col md:ml-0">
        <div className="bg-white border-b border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <HippyGhostAvatar className="size-8" seed={persona.id} />
            <div className="flex-1">
              <h1 className="font-semibold text-slate-900">{persona.name}</h1>
              <p className="text-sm text-slate-600">Chat with persona</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="md:hidden"
            >
              ☰
            </Button>
          </div>
        </div>
        {/* Use UserChatSession for chat */}
        <UserChatSession
          nickname={{ assistant: persona.name, user: session?.user?.email ?? "You" }}
          avatar={{
            assistant: <HippyGhostAvatar className="size-8" seed={persona.id} />,
            user: session?.user ? (
              <HippyGhostAvatar className="size-8" seed={session.user.id} />
            ) : undefined,
          }}
          useChatHelpers={useChatHelpers}
          useChatRef={useChatRef}
          acceptAttachments={false}
        />
      </div>
    </div>
  );
}
