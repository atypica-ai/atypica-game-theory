"use client";
import {
  fetchFollowUpInterviewChatMessages,
  fetchFollowUpInterviewHistory,
} from "@/app/(persona)/actions";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Message } from "ai";
import { MessageSquareIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function FollowUpChatList({ personaImportId }: { personaImportId: number }) {
  const t = useTranslations("PersonaImport.followUpChat");
  const router = useRouter();
  const [followUpHistory, setFollowUpHistory] = useState<{
    hasHistory: boolean;
    userChatToken?: string;
    messageCount?: number;
    lastMessageAt?: Date;
  } | null>(null);
  const [loadingFollowUpHistory, setLoadingFollowUpHistory] = useState(false);
  const [followUpChatOpen, setFollowUpChatOpen] = useState(false);
  const [followUpChatMessages, setFollowUpChatMessages] = useState<Message[]>([]);
  const [loadingFollowUpChat, setLoadingFollowUpChat] = useState(false);

  const loadFollowUpHistory = useCallback(async () => {
    setLoadingFollowUpHistory(true);
    try {
      const result = await fetchFollowUpInterviewHistory(personaImportId);
      if (!result.success) throw result;
      setFollowUpHistory(result.data);
    } catch (error) {
      console.log("Failed to load follow-up history:", error);
    } finally {
      setLoadingFollowUpHistory(false);
    }
  }, [personaImportId]);

  // 加载后续访谈历史记录 - 组件加载后就检查
  useEffect(() => {
    loadFollowUpHistory();
  }, [loadFollowUpHistory]);

  // 加载后续访谈聊天记录详情
  const loadFollowUpChatMessages = async () => {
    setLoadingFollowUpChat(true);
    try {
      const result = await fetchFollowUpInterviewChatMessages(personaImportId);
      if (!result.success) throw result;
      setFollowUpChatMessages(result.data.messages);
    } catch (error) {
      console.log("Failed to load follow-up chat messages:", error);
      toast.error(t("loading"));
    } finally {
      setLoadingFollowUpChat(false);
    }
  };

  // 打开聊天记录对话框
  const handleViewFollowUpHistory = () => {
    setFollowUpChatOpen(true);
    loadFollowUpChatMessages();
  };

  // 继续对话
  const handleContinueChat = () => {
    if (followUpHistory?.userChatToken) {
      router.push(`/personas/followup/${followUpHistory.userChatToken}`);
    }
  };

  // 只有有历史记录时才显示组件
  if (!followUpHistory?.hasHistory) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold flex items-center gap-3 text-slate-900">
            <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center">
              <MessageSquareIcon className="size-3 text-white" />
            </div>
            {t("title")}
          </h2>
          <p className="text-slate-600 ml-9 text-sm">{t("description")}</p>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            <MessageSquareIcon className="size-4 text-slate-600" />
            <div>
              <p className="font-medium text-slate-900">{t("followUpConversation")}</p>
              <p className="text-sm text-slate-600">{t("viewCompleteRecord")}</p>
            </div>
          </div>
          <Dialog open={followUpChatOpen} onOpenChange={setFollowUpChatOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewFollowUpHistory}
                disabled={loadingFollowUpHistory}
              >
                {loadingFollowUpHistory ? t("loading") : t("viewRecord")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>{t("conversationHistory")}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {loadingFollowUpChat ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-slate-500">{t("loading")}</div>
                  </div>
                ) : followUpChatMessages.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-slate-500">{t("noRecord")}</div>
                  </div>
                ) : (
                  followUpChatMessages.map(({ id, role, content, parts, ...extra }) => (
                    <ChatMessage
                      key={id}
                      role={role}
                      content={content}
                      parts={parts}
                      extra={extra}
                    ></ChatMessage>
                  ))
                )}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setFollowUpChatOpen(false)}>
                  {t("close")}
                </Button>
                <Button onClick={handleContinueChat} disabled={!followUpHistory?.userChatToken}>
                  {t("continueConversation")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
