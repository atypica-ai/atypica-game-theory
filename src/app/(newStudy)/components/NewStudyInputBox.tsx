"use client";
import { fetchChatTitlesByTokens } from "@/app/(newStudy)/actions";
import { trackTemplateUsage } from "@/app/(newStudy)/newstudy/actions";
import { createStudyUserChatAction } from "@/app/(study)/study/actions";
import { FileAttachment } from "@/components/chat/FileAttachment";
import { FileUploadButton } from "@/components/chat/FileUploadButton";
import { FileUploadStatus } from "@/components/chat/FileUploadStatus";
import { RecordButton } from "@/components/chat/RecordButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useDevice } from "@/hooks/use-device";
import { useFileUploadManager } from "@/hooks/use-file-upload-manager";
import { trackEvent } from "@/lib/analytics/segment";
import { truncateForTitle } from "@/lib/textUtils";
import { cn } from "@/lib/utils";
import { ArrowRightIcon, NotebookTextIcon, RotateCwIcon, SparklesIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { JSX, useCallback, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

export function NewStudyInputBox(args: {
  className?: string;
  initialBrief?: string;
  templateId?: number;
}): JSX.Element;

export function NewStudyInputBox(args: {
  className?: string;
  initialBrief?: string;
  referenceUserChatTokens: string[];
  templateId?: number;
}): JSX.Element;

export function NewStudyInputBox({
  className,
  initialBrief,
  referenceUserChatTokens,
  templateId,
}: {
  className?: string;
  initialBrief?: string;
  referenceUserChatTokens?: string[];
  templateId?: number;
}) {
  const locale = useLocale();
  const t = useTranslations("Components.NewStudyInputBox");
  const router = useRouter();
  const { isMobile } = useDevice();
  const [input, setInput] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [referenceChatTitles, setReferenceChatTitles] = useState<
    { token: string; title: string }[]
  >([]);
  const { uploadedFiles, handleFileUploaded, handleRemoveFile, isUploadDisabled } =
    useFileUploadManager();

  const trackStudyBriefUpdated = useDebouncedCallback((brief: string) => {
    trackEvent("Study Brief Updated", {
      brief: truncateForTitle(brief, { maxDisplayWidth: 30, suffix: "..." }),
      interview: false,
    });
  }, 2000);

  useEffect(() => {
    // Set initial brief if provided
    if (initialBrief) {
      setInput(initialBrief);
    }
  }, [initialBrief]);

  const setStudyBrief = useCallback(
    ({ text, append = false }: { text: string; append?: boolean }) => {
      setInput((current) => {
        let inputValue: string;
        if (append) {
          inputValue = current ? `${current} ${text}` : text;
        } else {
          inputValue = text;
        }
        setTimeout(() => {
          trackStudyBriefUpdated(inputValue);
        }, 100);
        return inputValue;
      });
    },
    [trackStudyBriefUpdated],
  );

  // Load reference chat titles
  useEffect(() => {
    const loadReferenceChatTitles = async () => {
      if (referenceUserChatTokens && referenceUserChatTokens.length > 0) {
        const result = await fetchChatTitlesByTokens(referenceUserChatTokens);
        if (result.success) {
          setReferenceChatTitles(result.data);
        }
      }
    };
    loadReferenceChatTitles();
  }, [referenceUserChatTokens]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;
      setIsLoading(true);
      try {
        const attachments = uploadedFiles.map((file) => ({
          objectUrl: file.objectUrl,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
        }));
        const result = await createStudyUserChatAction({
          role: "user",
          content: input,
          attachments,
          context: {
            ...(referenceUserChatTokens ? { referenceUserChats: referenceUserChatTokens } : {}),
            ...(templateId ? { researchTemplateId: templateId } : {}),
          },
        });
        if (!result.success) {
          throw result;
        }
        const userChat = result.data;

        // Track template usage if templateId is provided
        if (templateId) {
          trackTemplateUsage(templateId);
        }

        router.push(`/study/${userChat.token}`);
      } catch (error) {
        console.log("Error saving input:", (error as Error).message);
      }
      setIsLoading(false);
    },
    [referenceUserChatTokens, templateId, input, router, uploadedFiles],
  );

  return (
    <form
      data-product-tour="newstudy-box"
      onSubmit={handleSubmit}
      className={cn(
        "relative border border-border bg-background transition-colors",
        "flex flex-col items-stretch gap-3",
        className,
      )}
    >
      {/* Top toolbar */}
      <div className="h-12 p-2 border-b border-border flex items-center justify-end">
        <Link
          href="/newstudy?interview=1"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors group"
        >
          <SparklesIcon className="h-3 w-3 text-primary/80 group-hover:scale-110 group-hover:text-primary transition-all" />
          <span>{t("needHelpToClarify")}</span>
        </Link>
      </div>

      {/* Reference Chats Display */}
      {referenceChatTitles.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap px-2">
          {referenceChatTitles.map((chat) => (
            <div
              key={chat.token}
              className="text-sm px-2 pl-1 bg-muted rounded-full max-w-3/4 truncate font-medium"
            >
              @ {chat.title}
            </div>
          ))}
        </div>
      )}

      <Textarea
        name="study-brief"
        value={input}
        onChange={(e) => setStudyBrief({ text: e.target.value })}
        placeholder={t("placeholder")}
        className={cn(
          "resize-none border-0 shadow-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60",
          "flex-1 min-h-48 sm:min-h-32 max-h-80 w-full px-4 scrollbar-thin",
        )}
        enterKeyHint="enter"
        disabled={isLoading}
        onKeyDown={(e) => {
          if (!isMobile && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (input.trim()) {
              const form = e.currentTarget.form;
              if (form) form.requestSubmit();
            }
          }
        }}
      />

      {/* Partial transcript indicator */}
      {partialTranscript && (
        <div className="absolute bottom-20 left-4 right-4 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
            <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
            <span className="font-medium">正在识别:</span>
            <span className="flex-1 truncate">{partialTranscript}</span>
          </div>
        </div>
      )}

      {/* Bottom toolbar */}
      {uploadedFiles.length > 0 && (
        <div className="flex items-center px-3 overflow-hidden w-full">
          <div className="flex-1 flex items-center gap-2 py-2 overflow-auto scrollbar-thin">
            {uploadedFiles.map((file, index) => (
              <FileAttachment
                key={index}
                attachment={{
                  url: file.url,
                  filename: file.name,
                  mediaType: file.mimeType,
                }}
                onRemove={() => handleRemoveFile(index)}
              />
            ))}
          </div>
          <FileUploadStatus files={uploadedFiles} className="ml-2 shrink-0" />
        </div>
      )}
      <div className="flex items-center gap-2 p-3 border-t border-border">
        <FileUploadButton
          onFileUploadedAction={handleFileUploaded}
          disabled={isLoading || isUploadDisabled()}
          existingFiles={uploadedFiles}
        />
        <div className="ml-auto" />
        <RecordButton
          onTranscript={(text) => {
            setStudyBrief({ text, append: true });
            setPartialTranscript(""); // Clear partial transcript when final transcript is set
          }}
          onPartialTranscript={(text) => {
            setPartialTranscript(text);
          }}
          language={locale}
          disabled={isLoading}
          className="h-9 w-9"
        />
        <div className="text-xs text-muted-foreground hidden sm:block">
          {isMobile ? t("tapToSend") : t("enterToSend")}
        </div>
        <Button
          type="submit"
          variant="default"
          disabled={isLoading || !input.trim()}
          className="h-8 px-4"
        >
          {isLoading ? (
            <RotateCwIcon className="size-4 animate-spin" />
          ) : (
            <>
              <span className="text-xs">{t("sendLabel")}</span>
              <ArrowRightIcon className="size-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export function NewStudyButton(args: {
  children?: React.ReactNode;
  initialBrief?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}): JSX.Element;

export function NewStudyButton(args: {
  children?: React.ReactNode;
  initialBrief?: string;
  referenceUserChatTokens?: string[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}): JSX.Element;

export function NewStudyButton({
  children,
  initialBrief,
  referenceUserChatTokens,
  open,
  onOpenChange,
}: {
  children?: React.ReactNode;
  initialBrief?: string;
  referenceUserChatTokens?: string[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const t = useTranslations("Components.NewStudyInputBox");
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled or uncontrolled state
  const isOpen = open !== undefined ? open : internalOpen;
  const setIsOpen = onOpenChange || setInternalOpen;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <NotebookTextIcon className="h-4 w-4" />
            {t("startNewStudy")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className={cn(
          "p-0 shadow-none border-none gap-0 rounded-sm max-h-[90dvh] flex flex-col overflow-y-auto scrollbar-thin",
          "[&_>button]:hidden", // hide close button
        )}
      >
        <DialogHeader className="invisible">
          <DialogTitle />
        </DialogHeader>
        {referenceUserChatTokens ? (
          <NewStudyInputBox
            className="rounded-sm"
            initialBrief={initialBrief}
            referenceUserChatTokens={referenceUserChatTokens}
          />
        ) : (
          <NewStudyInputBox className="rounded-sm" initialBrief={initialBrief} />
        )}
      </DialogContent>
    </Dialog>
  );
}
