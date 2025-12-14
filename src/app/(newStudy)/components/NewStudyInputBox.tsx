"use client";
import { fetchChatTitlesByTokens } from "@/app/(newStudy)/actions";
import { createStudyUserChat } from "@/app/(study)/study/actions";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useDevice } from "@/hooks/use-device";
import { useFileUploadManager } from "@/hooks/use-file-upload-manager";
import { useMediaQuery } from "@/hooks/use-media-query";
import { trackEvent } from "@/lib/analytics/segment";
import { truncateForTitle } from "@/lib/textUtils";
import { cn } from "@/lib/utils";
import { ArrowRightIcon, NotebookTextIcon, RotateCwIcon, SparklesIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

type TStudyType = "general" | "product-rnd" | "fast-insight";

export function NewStudyInputBox({
  className,
  initialQuestion,
  referenceUserChatTokens,
  fixedStudyType,
}: {
  className?: string;
  initialQuestion?: string;
  referenceUserChatTokens?: string[];
  fixedStudyType?: TStudyType;
}) {
  const { status: sessionStatus, data: session } = useSession();
  const locale = useLocale();
  const t = useTranslations("Components.NewStudyInputBox");
  const router = useRouter();
  const { isMobile } = useDevice();
  const isSM = useMediaQuery("sm");
  const [input, setInput] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [studyType, setStudyType] = useState<TStudyType>(fixedStudyType ?? "general");
  const [showStudyTypeSelector, setShowStudyTypeSelector] = useState(false);
  const [referenceChatTitles, setReferenceChatTitles] = useState<
    { token: string; title: string }[]
  >([]);
  const { uploadedFiles, handleFileUploaded, handleRemoveFile, isUploadDisabled } =
    useFileUploadManager();

  // Create a properly memoized debounced function
  const debouncedSaveToLocalStorage = useDebouncedCallback((value: string) => {
    localStorage.setItem("studyInputCache", value);
  }, 300);

  const trackStudyBriefUpdated = useDebouncedCallback((brief: string) => {
    trackEvent("Study Brief Updated", {
      brief: truncateForTitle(brief, { maxDisplayWidth: 30, suffix: "..." }),
      interview: false,
    });
  }, 2000);

  useEffect(() => {
    // If initialQuestion is provided, use it; otherwise load from cache
    if (initialQuestion) {
      setInput(initialQuestion);
    } else {
      const savedInput = localStorage.getItem("studyInputCache");
      if (savedInput) {
        setInput(savedInput);
      }
    }
  }, [initialQuestion]);

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
          debouncedSaveToLocalStorage(inputValue);
          trackStudyBriefUpdated(inputValue);
        }, 100);
        return inputValue;
      });
    },
    [debouncedSaveToLocalStorage, trackStudyBriefUpdated],
  );

  // Check if user should see study type selector
  useEffect(() => {
    if (sessionStatus === "loading") {
      setShowStudyTypeSelector(false);
    } else if (!!fixedStudyType) {
      // 如果指定了固定研究类型，不显示研究类型选择器
      setShowStudyTypeSelector(false);
    } else {
      // 🎉 这个 commit 里的修改，对 prompt cache 做了优化，现在可以对所有人开放了!
      setShowStudyTypeSelector(true);
    }
    // // } else if (session?.user?.email?.endsWith("@tezign.com")) {
    // //   setShowStudyTypeSelector(true);
    // } else {
    //   setShowStudyTypeSelector(false);
    // }
  }, [sessionStatus, session?.user?.email, fixedStudyType]);

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
        const extra = referenceUserChatTokens
          ? { referenceUserChats: referenceUserChatTokens }
          : undefined;
        const result = await createStudyUserChat(
          { role: "user", content: input, attachments },
          extra,
          studyType,
        );
        if (!result.success) {
          throw result;
        }
        const chat = result.data;
        // Clear input cache after successfully creating chat
        localStorage.removeItem("studyInputCache");
        router.push(`/study/${chat.token}`);
      } catch (error) {
        console.log("Error saving input:", (error as Error).message);
      }
      setIsLoading(false);
    },
    [referenceUserChatTokens, studyType, input, router, uploadedFiles],
  );

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative border border-border bg-background transition-colors",
        "flex flex-col items-stretch gap-3",
        className,
      )}
    >
      {/* Study Type Selector */}
      <div className="h-12 p-2 border-b border-border flex items-center justify-between">
        {showStudyTypeSelector ? (
          isSM ? (
            <RadioGroup
              value={studyType}
              onValueChange={(value) =>
                setStudyType(value as "general" | "product-rnd" | "fast-insight")
              }
              className="flex gap-4 ml-1"
            >
              <div className="flex items-center">
                <RadioGroupItem value="general" id="general" className="h-3 w-3 mr-0.5" />
                <Label htmlFor="general" className="text-xs cursor-pointer p-1">
                  {t("generalStudy")}
                </Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="product-rnd" id="product-rnd" className="h-3 w-3 mr-0.5" />
                <Label htmlFor="product-rnd" className="text-xs cursor-pointer p-1">
                  {t("productRnDStudy")}
                </Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="fast-insight" id="fast-insight" className="h-3 w-3 mr-0.5" />
                <Label htmlFor="fast-insight" className="text-xs cursor-pointer p-1">
                  {t("fastInsightStudy")}
                </Label>
              </div>
            </RadioGroup>
          ) : (
            <Select
              value={studyType}
              onValueChange={(value) =>
                setStudyType(value as "general" | "product-rnd" | "fast-insight")
              }
            >
              <SelectTrigger className="w-auto h-auto text-xs px-2 py-1 border-none bg-transparent shadow-none focus:ring-0 gap-1.5">
                <SelectValue placeholder={t("studyType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general" className="text-xs">
                  {t("generalStudy")}
                </SelectItem>
                <SelectItem value="product-rnd" className="text-xs">
                  {t("productRnDStudy")}
                </SelectItem>
                <SelectItem value="fast-insight" className="text-xs">
                  {t("fastInsightStudy")}
                </SelectItem>
              </SelectContent>
            </Select>
          )
        ) : (
          <div></div>
        )}
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
        placeholder={
          studyType === "product-rnd"
            ? t("productRnDPlaceholder")
            : studyType === "fast-insight"
              ? t("fastInsightPlaceholder")
              : t("placeholder")
        }
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

export function NewStudyButton({
  children,
  initialQuestion,
  referenceUserChatTokens,
  fixedStudyType,
  open,
  onOpenChange,
}: {
  children?: React.ReactNode;
  initialQuestion?: string;
  referenceUserChatTokens?: string[];
  fixedStudyType?: TStudyType;
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
        <NewStudyInputBox
          className="rounded-sm"
          initialQuestion={initialQuestion}
          referenceUserChatTokens={referenceUserChatTokens}
          fixedStudyType={fixedStudyType}
        />
      </DialogContent>
    </Dialog>
  );
}
