"use client";
import { CONTINUE_ASSISTANT_STEPS } from "@/ai/messageUtilsClient";
import { StatusDisplay } from "@/components/chat/StatusDisplay";
import { VoiceInputButton } from "@/components/chat/VoiceInputButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFileUploadManager } from "@/hooks/use-file-upload-manager";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { fileUrlToDataUrl } from "@/lib/attachments/actions";
import { cn, useDevice } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { ArrowRightIcon, PlayIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ReactNode, RefObject, useCallback } from "react";
import { ChatMessage } from "./ChatMessage";
import { FileAttachment } from "./FileAttachment";
import { FileUploadButton, FileUploadInfo } from "./FileUploadButton";

export function UserChatSession({
  // chatId,
  chatTitle,
  nickname,
  avatar,
  readOnly,
  limit,
  useChatHelpers: { messages, status, error, handleSubmit, input, setInput },
  useChatRef,
  acceptAttachments,
  persistMessages = true,
}: {
  chatId?: string;
  chatTitle?: string;
  nickname?: Partial<{ user: string; assistant: string; system: string; data: string }>;
  avatar?: Partial<{ user: ReactNode; assistant: ReactNode; system: ReactNode; data: ReactNode }>;
  readOnly?: boolean;
  limit?: number; // 向前保留的消息数量
  useChatHelpers: Omit<ReturnType<typeof useChat>, "append" | "reload" | "setMessages">;
  useChatRef: RefObject<Pick<ReturnType<typeof useChat>, "append" | "reload" | "setMessages">>;
  acceptAttachments: boolean;
  persistMessages?: boolean;
}) {
  const t = useTranslations("Components.UserChatSession");
  const locale = useLocale();
  const { uploadedFiles, handleFileUploaded, handleRemoveFile, clearFiles, isUploadDisabled } =
    useFileUploadManager();

  const handleContinueChat = useCallback(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === "user") {
      useChatRef.current.reload();
    } else {
      useChatRef.current.append({ role: "user", content: CONTINUE_ASSISTANT_STEPS });
    }
    // 不要监听 reload, append
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const handleFormSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const filesToAttach = [...uploadedFiles];
      if (filesToAttach.length > 0) {
        if (!persistMessages) {
          useChatRef.current?.append({
            role: "user",
            content: input.trim(),
            experimental_attachments: await Promise.all(
              filesToAttach.map(async ({ name, mimeType, objectUrl }: FileUploadInfo) => {
                const dataUrl = (await fileUrlToDataUrl({ objectUrl, mimeType })) as string;
                return { name, url: dataUrl, contentType: mimeType };
              }),
            ),
          });
        } else {
          throw new Error("Not implemented");
        }
        setInput("");
        clearFiles();
      } else {
        // No files, just submit the text message normally
        handleSubmit(e);
        clearFiles();
      }
    },
    [handleSubmit, uploadedFiles, useChatRef, input, setInput, clearFiles, persistMessages],
  );

  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  const inputDisabled = status === "streaming" || status === "submitted";
  const { isMobile } = useDevice();

  return (
    <div className="w-full h-full overflow-hidden relative pb-4">
      <div
        ref={messagesContainerRef}
        className={cn(
          "h-full w-full overflow-y-auto scrollbar-thin flex flex-col items-center gap-4",
          "pt-16 pb-80 px-3",
        )}
      >
        {(limit ? messages.slice(-limit) : messages)
          .filter(({ role, content }) => !(role === "user" && content === CONTINUE_ASSISTANT_STEPS))
          .map(({ id, role, content, parts, ...extra }) => (
            <ChatMessage
              key={id}
              role={role}
              nickname={nickname ? nickname[role] : undefined}
              avatar={avatar ? avatar[role] : undefined}
              content={content}
              parts={parts}
              extra={extra}
            ></ChatMessage>
          ))}
        {error && (
          <div className="flex justify-center items-center text-red-500 dark:text-red-400 text-sm">
            {error.toString()}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {chatTitle && (
        <div className="absolute top-0 left-0 right-0 p-3 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
          <h1 className="sm:text-lg font-medium text-center truncate">{chatTitle}</h1>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 w-full px-3 max-lg:px-1 pb-3 max-lg:pb-1">
        {!readOnly && (
          <div className="w-fit mx-auto mb-3 max-lg:mb-1.5 px-4 py-2 rounded-full shadow bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
            <StatusDisplay status={status} />
          </div>
        )}
        {!readOnly && (
          <form onSubmit={handleFormSubmit} className="relative bg-background rounded-lg">
            {uploadedFiles.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 flex flex-wrap gap-2 max-w-full">
                {uploadedFiles.map((file, index) => (
                  <FileAttachment
                    key={index}
                    attachment={{
                      url: file.url, // 注意，这里直接用了上传以后的 s3 url, 没用 fileUrlToCdnUrl 以及 fileUrlToDataUrl
                      name: file.name,
                      contentType: file.mimeType,
                    }}
                    onRemove={() => handleRemoveFile(index)}
                  />
                ))}
              </div>
            )}
            <Textarea
              className={cn(
                "block min-h-24 max-lg:min-h-20 resize-none focus-visible:border-primary/20 transition-colors",
                "px-4 pt-3 pb-11",
                "text-[15px] placeholder:text-[15px]", // "text-sm placeholder:text-sm",
              )}
              enterKeyHint="enter"
              value={input}
              disabled={inputDisabled}
              onChange={(event) => {
                setInput(event.target.value);
              }}
              onKeyDown={(e) => {
                if (!isMobile && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  if (input.trim() || uploadedFiles.length > 0) {
                    const form = e.currentTarget.form;
                    if (form) form.requestSubmit();
                  }
                }
              }}
            />
            <div className="absolute right-2 bottom-2 max-lg:right-1 max-lg:bottom-1 max-lg:scale-90 max-lg:origin-bottom-right flex items-center gap-2">
              {!inputDisabled && !input.trim() && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs origin-top-right"
                  onClick={handleContinueChat}
                >
                  <PlayIcon className="size-2.5" />
                  <span>{t("continue")}</span>
                </Button>
              )}
              {acceptAttachments && !inputDisabled && (
                <FileUploadButton
                  onFileUploadedAction={handleFileUploaded}
                  disabled={inputDisabled || isUploadDisabled()}
                  existingFiles={uploadedFiles}
                />
              )}
              <VoiceInputButton
                disabled={inputDisabled}
                onTranscript={(text) => {
                  setInput((current) => (current ? `${current} ${text}` : text));
                }}
                language={locale}
                contextText={input}
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={inputDisabled || (!input.trim() && uploadedFiles.length === 0)}
                className="rounded-full size-9"
              >
                <ArrowRightIcon className="h-5 w-5 text-primary" />
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
