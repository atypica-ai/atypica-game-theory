"use client";
import { useSageContext } from "@/app/(sage)/(detail)/hooks/SageContext";
import { discoverKnowledgeGapsAction } from "@/app/(sage)/actions";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChatMessage, UserChat } from "@/prisma/client";
import { formatDistanceToNow } from "date-fns";
import { ExternalLinkIcon, MessageSquareIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function SageChatsPageClient({
  chats,
}: {
  chats: (Pick<UserChat, "id" | "token" | "title" | "updatedAt"> & {
    user: { name: string };
  } & {
    messages: ChatMessage[];
  })[];
}) {
  const t = useTranslations("Sage.ChatsPage");
  const router = useRouter();
  const { sage, processingStatus } = useSageContext();
  const [isRequesting, setIsRequesting] = useState(false);
  const isProcessing = processingStatus === "processing" || isRequesting;

  const handleAnalyze = useCallback(async () => {
    setIsRequesting(true);
    try {
      const result = await discoverKnowledgeGapsAction({ sageId: sage.id });
      if (!result.success) throw result;
      toast.success(t("analyzeSubmitted"));
      setTimeout(() => router.refresh(), 1000);
    } catch (error) {
      console.error("Failed to analyze chats:", error);
      toast.error(t("analyzeFailed"));
    } finally {
      setIsRequesting(false);
    }
  }, [sage.id, router, t]);

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-1">{t("description")}</p>
        </div>
        {chats.length > 0 && (
          <ConfirmDialog
            title={t("confirmAnalyzeTitle")}
            description={t("confirmAnalyzeDesc")}
            onConfirm={handleAnalyze}
          >
            <Button disabled={isProcessing} size="sm" variant="outline">
              <SearchIcon className="size-4" />
              {isProcessing ? t("analyzing") : t("analyzeRecentChats")}
            </Button>
          </ConfirmDialog>
        )}
      </div>

      <Separator />

      {/* Chats List */}
      {chats.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <MessageSquareIcon className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">{t("noChatsYet")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("startChatWithSage")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => {
            const lastMessage = chat.messages[0];
            const lastMessagePreview = lastMessage
              ? lastMessage.content.substring(0, 120) +
                (lastMessage.content.length > 120 ? "..." : "")
              : t("noMessages");

            return (
              <Link
                key={chat.id}
                href={`/sage/chat/view/${chat.token}`}
                className="group flex flex-col gap-2 rounded-lg border p-4 hover:bg-muted/50 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm">
                    {chat.user.name ? `${chat.user.name}` : chat.title || t("untitledChat")}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
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
