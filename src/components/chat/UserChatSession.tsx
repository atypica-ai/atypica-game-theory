import { CONTINUE_ASSISTANT_STEPS } from "@/ai/messageUtilsClient";
import { TMessageWithPlainTextTool } from "@/ai/tools/types";
import { RecordButton } from "@/components/chat/RecordButton";
import { StatusDisplay } from "@/components/chat/StatusDisplay";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDevice } from "@/hooks/use-device";
import { useFileUploadManager } from "@/hooks/use-file-upload-manager";
import { useScrollToBottom } from "@/hooks/use-scroll-to-bottom";
import { cn } from "@/lib/utils";
import { useChat } from "@ai-sdk/react";
import { ArrowRightIcon, PlayIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ReactNode, RefObject, useCallback, useState } from "react";
import { ChatMessage } from "./ChatMessage";
import { FileAttachment } from "./FileAttachment";
import { FileUploadButton } from "./FileUploadButton";

export function UserChatSession<UI_MESSAGE extends TMessageWithPlainTextTool>({
  chatTitle,
  nickname,
  avatar,
  readOnly,
  limit,
  useChatHelpers: { messages, status, error },
  useChatRef,
  renderToolUIPart,
  acceptAttachments,
  persistMessages = true,
}: {
  chatTitle?: string;
  nickname?: Partial<{ user: string; assistant: string; system: string; data: string }>;
  avatar?: Partial<{ user: ReactNode; assistant: ReactNode; system: ReactNode; data: ReactNode }>;
  readOnly?: boolean;
  limit?: number; // 向前保留的消息数量
  useChatHelpers: Pick<
    ReturnType<typeof useChat<UI_MESSAGE>>,
    "messages" | "status" | "stop" | "error"
  >;
  useChatRef: RefObject<
    Pick<ReturnType<typeof useChat<UI_MESSAGE>>, "regenerate" | "setMessages" | "sendMessage">
  >;
  renderToolUIPart: (toolPart: UI_MESSAGE["parts"][number]) => ReactNode;
  acceptAttachments: boolean;
  persistMessages?: boolean;
}) {
  const t = useTranslations("Components.UserChatSession");
  const tCompliance = useTranslations("AICompliance");
  const locale = useLocale();
  const { uploadedFiles, handleFileUploaded, handleRemoveFile, clearFiles, isUploadDisabled } =
    useFileUploadManager();

  const handleContinueChat = useCallback(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === "user") {
      useChatRef.current.regenerate();
    } else {
      useChatRef.current.sendMessage({ text: CONTINUE_ASSISTANT_STEPS });
    }
    // 不要监听 reload, append
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const [input, setInput] = useState("");

  const handleSubmitMessage = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const filesToAttach = [...uploadedFiles];
      if (filesToAttach.length > 0) {
        if (!persistMessages) {
          /* FIXME(@ai-sdk-upgrade-v5): The `experimental_attachments` property has been replaced with the parts array. Please manually migrate following https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0#attachments--file-parts */
          // useChatRef.current?.append({
          //   role: "user",
          //   content: input.trim(),
          //   experimental_attachments: await Promise.all(
          //     filesToAttach.map(async ({ name, mimeType, objectUrl }: FileUploadInfo) => {
          //       const dataUrl = (await fileUrlToDataUrl({ objectUrl, mimeType })) as string;
          //       return { name, url: dataUrl, contentType: mimeType };
          //     }),
          //   ),
          // });
          /**
           * @todo: 目前禁用文件上传，哪怕是不保存 message 的情况，之后要改成把 attachments 放进 message.parts 的 type: file 里
           */
          throw new Error("Not implemented");
        } else {
          /**
           * @todo: 目前禁用文件上传，之后要改成 message 和 attachments 分开提交给 chat api ，然后调用 persistentAIMessageToDB
           */
          throw new Error("Not implemented");
        }
        setInput("");
        clearFiles();
      } else {
        // No files, just submit the text message normally
        useChatRef.current.sendMessage({ text: input });
        setInput("");
        clearFiles();
      }
    },
    [uploadedFiles, useChatRef, input, setInput, clearFiles, persistMessages],
  );

  const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
  const inputDisabled = status === "streaming" || status === "submitted";
  const { isMobile } = useDevice();
  const [partialTranscript, setPartialTranscript] = useState("");

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
          .filter(
            ({ role, parts }) =>
              !(
                role === "user" &&
                parts[0]?.type === "text" &&
                parts[0].text === CONTINUE_ASSISTANT_STEPS
              ),
          )
          .map(({ id, role, parts, ...extra }) => (
            <ChatMessage
              key={id}
              nickname={nickname ? nickname[role] : undefined}
              avatar={avatar ? avatar[role] : undefined}
              message={{ role, parts }}
              extra={extra}
              renderToolUIPart={renderToolUIPart}
            ></ChatMessage>
          ))}
        {/* AI Compliance Disclaimer */}
        {messages.length > 0 && status === "ready" ? (
          <div className="w-full text-xs text-center text-zinc-500 dark:text-zinc-400 px-4 mt-4 mb-8">
            {tCompliance("fullDisclaimer")}
          </div>
        ) : null}
        {error ? (
          <div className="flex justify-center items-center text-red-500 dark:text-red-400 text-sm">
            {error.toString()}
          </div>
        ) : null}
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
          <form onSubmit={handleSubmitMessage} className="relative bg-background rounded-lg">
            {uploadedFiles.length > 0 && (
              <div className="absolute bottom-full left-0 mb-2 flex flex-wrap gap-2 max-w-full">
                {uploadedFiles.map((file, index) => (
                  <FileAttachment
                    key={index}
                    attachment={{
                      url: file.url, // 注意，这里直接用了上传以后的 s3 url, 没用 fileUrlToCdnUrl 以及 fileUrlToDataUrl
                      filename: file.name,
                      mediaType: file.mimeType,
                    }}
                    onRemove={() => handleRemoveFile(index)}
                  />
                ))}
              </div>
            )}
            {/* Partial transcript indicator */}
            {partialTranscript && (
              <div className="absolute bottom-full left-0 mb-1 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg max-w-xs">
                <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                  <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                  <span className="font-medium">🎤 </span>
                  <span className="flex-1 truncate">{partialTranscript}</span>
                </div>
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
              <RecordButton
                disabled={inputDisabled}
                onTranscript={(text) => {
                  setInput((current) => (current ? `${current} ${text}` : text));
                  setPartialTranscript(""); // Clear partial transcript when final transcript is set
                }}
                onPartialTranscript={(text) => {
                  setPartialTranscript(text);
                }}
                language={locale}
                className="h-9 w-9"
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
