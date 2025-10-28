"use client";
import type { ChatMessageAttachment, SageInterview, User } from "@/prisma/client";
import { UserChatSession } from "@/components/chat/UserChatSession";
import { MessageCircle, Target } from "lucide-react";
import { useTranslations } from "next-intl";

export function SageInterviewClient({
  userChatToken,
  sage,
  interview,
}: {
  userChatToken: string;
  sage: {
    id: number;
    name: string;
    domain: string;
    expertise: string[];
    attachments: ChatMessageAttachment[];
    user: Pick<User, "id" | "name" | "email">;
  };
  interview: SageInterview & {
    sage: {
      userId: number;
    };
  };
}) {
  const t = useTranslations("Sage.interview");

  return (
    <div className="flex flex-col h-screen">
      {/* Interview Info Bar */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="size-5 text-zinc-600 dark:text-zinc-400" />
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {t("title")}: {sage.name}
                </h2>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {interview.purpose || t("purpose")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-zinc-500" />
                <span className="text-zinc-600 dark:text-zinc-400">
                  {t("progress")}: {Math.round(interview.progress * 100)}%
                </span>
              </div>
              <span
                className={
                  interview.status === "completed"
                    ? "px-2 py-1 text-xs font-medium rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    : "px-2 py-1 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                }
              >
                {interview.status === "completed" ? t("completed") : t("ongoing")}
              </span>
            </div>
          </div>

          {/* Focus Areas */}
          {interview.focusAreas && (interview.focusAreas as string[]).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(interview.focusAreas as string[]).map((area, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded"
                >
                  {area}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-hidden">
        <UserChatSession
          userChatToken={userChatToken}
          apiPath="/api/chat/sage-interview"
          showFileUpload={false}
          placeholder={t("placeholder")}
          hideHeader={true}
        />
      </div>
    </div>
  );
}
