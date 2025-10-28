"use client";
import type { ChatMessageAttachment, Sage, User } from "@/prisma/client";
import type { SageExtra } from "@/app/(sage)/types";
import { UserChatSession } from "@/components/chat/UserChatSession";
import { useTranslations } from "next-intl";

export function SageChatClient({
  userChatToken,
  sage,
}: {
  userChatToken: string;
  sage: Omit<Sage, "expertise" | "attachments" | "extra"> & {
    extra: SageExtra;
    expertise: string[];
    attachments: ChatMessageAttachment[];
    user: Pick<User, "id" | "name" | "email">;
  };
}) {
  const t = useTranslations("Sage.chat");

  return (
    <UserChatSession
      userChatToken={userChatToken}
      apiPath="/api/chat/sage"
      chatTitle={sage.name}
      chatSubtitle={sage.domain}
      showFileUpload={false}
      placeholder={t("placeholder")}
    />
  );
}
