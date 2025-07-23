"use client";

import { personaChatBodySchema } from "@/app/(persona)/types";
import { UserChatSession } from "@/components/chat/UserChatSession";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Persona } from "@/prisma/client";
import { useChat } from "@ai-sdk/react";
import { Message } from "ai";
import { BotIcon, CalendarIcon, FileTextIcon, InfoIcon, TagIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { z } from "zod";

export function PersonaChatClient({
  userChatToken,
  persona,
  initialMessages = [],
}: {
  userChatToken: string;
  persona: Persona;
  initialMessages?: Message[];
}) {
  const { data: session } = useSession();
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const initialRequestBody = {
    userChatToken,
  };

  // Chat hooks
  const useChatHelpers = useChat({
    api: "/api/persona/chat",
    initialMessages,
    body: {
      userChatToken: userChatToken,
    },
    experimental_prepareRequestBody({ messages, requestBody: _requestBody }) {
      const requestBody: typeof initialRequestBody = { ...initialRequestBody, ..._requestBody };
      const body: z.infer<typeof personaChatBodySchema> = {
        message: messages[messages.length - 1],
        ...requestBody,
      };
      return body;
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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Chat Header */}
      <div className="px-3 pt-4 pb-2">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HippyGhostAvatar className="w-7 h-7" seed={persona.id} />
            <div>
              <h1 className="font-medium text-slate-700 text-sm">{persona.name}</h1>
            </div>
          </div>

          {/* Detail Modal Trigger */}
          <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-slate-500 hover:text-slate-700"
              >
                <InfoIcon className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">Details</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BotIcon className="w-5 h-5" />
                  {persona.name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-medium text-slate-500 mb-1">Created</div>
                    <div className="text-sm text-slate-700 flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" />
                      {formatDate(persona.createdAt)}
                    </div>
                  </div>

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
                      <TagIcon className="w-3 h-3" />
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

                {/* Import Analysis */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-slate-900 mb-1">Import Analysis</div>
                      <div className="text-xs text-slate-500">
                        View original analysis and questions
                      </div>
                    </div>

                    {persona.personaImportId && (
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link
                          href={`/persona-import/${persona.personaImportId}`}
                          className="flex items-center gap-2"
                        >
                          <FileTextIcon className="w-4 h-4" />
                          View Analysis
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Centered Chat Area */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full">
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
    </div>
  );
}
