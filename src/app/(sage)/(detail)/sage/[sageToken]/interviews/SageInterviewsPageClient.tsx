"use client";

import type { SageInterviewExtra } from "@/app/(sage)/types";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ChatMessage, SageInterview, UserChat } from "@/prisma/client";
import { formatDistanceToNow } from "date-fns";
import { ClipboardListIcon, ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";

type InterviewWithUserChat = SageInterview & {
  userChat: UserChat & { messages: ChatMessage[] };
};

export function SageInterviewsPageClient({ interviews }: { interviews: InterviewWithUserChat[] }) {
  const t = useTranslations("Sage.InterviewsPage");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">{t("interviewHistory")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {interviews.length} {t("totalInterviews")}
        </p>
      </div>

      <Separator />

      {/* Interviews List */}
      {interviews.length === 0 ? (
        <div className="py-12 text-center">
          <ClipboardListIcon className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">{t("noInterviewsYet")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("startInterviewWithSage")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {interviews.map((interview) => {
            const extra = interview.extra as SageInterviewExtra;
            const isOngoing = extra.ongoing ?? false;
            const lastMessage = interview.userChat.messages[0];
            const lastMessagePreview = lastMessage
              ? lastMessage.content.substring(0, 80) +
                (lastMessage.content.length > 80 ? "..." : "")
              : t("noMessages");

            return (
              <Link
                key={interview.id}
                href={`/sage/interview/${interview.userChat.token}`}
                className="block py-2 px-3 rounded hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium truncate">
                        {interview.userChat.title || t("untitledInterview")}
                      </div>
                      {isOngoing ? (
                        <Badge variant="default" className="text-xs">
                          {t("ongoing")}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {t("completed")}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground/70 mt-0.5">
                      {formatDistanceToNow(new Date(interview.userChat.updatedAt), {
                        addSuffix: true,
                      })}
                    </div>
                    {lastMessage && (
                      <p className="text-xs text-muted-foreground/60 line-clamp-1 mt-1">
                        {lastMessagePreview}
                      </p>
                    )}
                  </div>
                  <ExternalLinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
