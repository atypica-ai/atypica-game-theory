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
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-1">{t("description")}</p>
      </div>

      <Separator />

      {/* Interviews List */}
      {interviews.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <ClipboardListIcon className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">{t("noInterviewsYet")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("startInterviewWithSage")}</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {interviews.map((interview) => {
            const extra = interview.extra as SageInterviewExtra;
            const isOngoing = extra.ongoing ?? false;
            const lastMessage = interview.userChat.messages[0];
            const lastMessagePreview = lastMessage
              ? lastMessage.content.substring(0, 120) +
                (lastMessage.content.length > 120 ? "..." : "")
              : t("noMessages");

            return (
              <Link
                key={interview.id}
                href={`/sage/interview/${interview.userChat.token}`}
                className="group flex flex-col gap-2 rounded-lg border p-4 hover:bg-muted/50 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-sm truncate">
                      {interview.userChat.title || t("untitledInterview")}
                    </span>
                    {isOngoing ? (
                      <Badge variant="default" className="text-[10px] h-5 px-1.5 font-medium">
                        {t("ongoing")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium">
                        {t("completed")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    <span>
                      {formatDistanceToNow(new Date(interview.userChat.updatedAt), {
                        addSuffix: true,
                      })}
                    </span>
                    <ExternalLinkIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                {lastMessage && (
                  <p className="text-xs text-muted-foreground line-clamp-2 font-mono">
                    {lastMessagePreview}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
