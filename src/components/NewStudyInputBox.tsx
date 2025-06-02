"use client";
import { createStudyUserChat } from "@/app/study/actions";
import { FileAttachment } from "@/components/chat/FileAttachment";
import {
  FileUploadButton,
  FileUploadInfo,
  MAX_TOTAL_FILE_SIZE,
} from "@/components/chat/FileUploadButton";
import { VoiceInputButton } from "@/components/chat/VoiceInputButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn, useDevice } from "@/lib/utils";
import { ArrowRightIcon, NotebookTextIcon, RotateCwIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

export function NewStudyInputBox({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useTranslations("Components.NewStudyInputBox");
  const router = useRouter();
  const { isMobile } = useDevice();
  const [input, setInput] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Create a properly memoized debounced function
  const debouncedSaveToLocalStorage = useDebouncedCallback((value: string) => {
    localStorage.setItem("studyInputCache", value);
  }, 300);

  useEffect(() => {
    const savedInput = localStorage.getItem("studyInputCache");
    if (savedInput) {
      setInput(savedInput);
    }
  }, []);

  const handleFileUploaded = useCallback((fileInfo: FileUploadInfo) => {
    setUploadedFiles((prev) => [...prev, fileInfo]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setIsLoading(true);
    try {
      const result = await createStudyUserChat(
        {
          role: "user",
          content: input,
        },
        uploadedFiles.map((file) => ({
          objectUrl: file.objectUrl,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
        })),
      );
      if (!result.success) {
        throw result;
      }
      const chat = result.data;
      // Clear input cache after successfully creating chat
      localStorage.removeItem("studyInputCache");
      router.push(`/study/?id=${chat.id}`);
    } catch (error) {
      console.error("Error saving input:", (error as Error).message);
    }
    setIsLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative group border border-border bg-background transition-colors",
        // "hover:border-primary focus-within:border-primary",
        className,
      )}
    >
      <Textarea
        value={input}
        onChange={(e) => {
          const value = e.target.value;
          setInput(value);
          debouncedSaveToLocalStorage(value);
        }}
        placeholder={t("placeholder")}
        className="min-h-48 resize-none border-0 bg-transparent pt-4 px-4 pb-18 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 w-full"
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

      {/* Bottom toolbar */}
      <div className="absolute left-0 bottom-0 right-0 flex items-center justify-between p-3 border-t border-border">
        <div className="flex items-center gap-2">
          <FileUploadButton
            onFileUploadedAction={handleFileUploaded}
            disabled={
              isLoading ||
              uploadedFiles.reduce((acc, file) => acc + file.size, 0) > MAX_TOTAL_FILE_SIZE
            }
          />
          {uploadedFiles.map((file, index) => (
            <FileAttachment
              key={index}
              attachment={{
                url: file.url,
                name: file.name,
                contentType: file.mimeType,
              }}
              onRemove={() => handleRemoveFile(index)}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          <VoiceInputButton
            onTranscript={(text) => {
              setInput((current) => (current ? `${current} ${text}` : text));
            }}
            language={locale}
            contextText={input}
            disabled={isLoading}
          />
          <div className="text-xs text-muted-foreground hidden sm:block">
            {isMobile ? t("tapToSend") : t("enterToSend")}
          </div>
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {isLoading ? (
              <RotateCwIcon className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <span className="text-xs">{t("sendLabel")}</span>
                <ArrowRightIcon className="h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function NewStudyButton({ children }: { children?: React.ReactNode }) {
  const t = useTranslations("Components.NewStudyInputBox");
  const [isOpen, setIsOpen] = useState(false);
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
          "p-0 shadow-none border-none gap-0 rounded-sm",
          "[&_>button]:hidden", // hide close button
        )}
      >
        <DialogHeader className="invisible">
          <DialogTitle />
        </DialogHeader>
        <NewStudyInputBox className="rounded-sm overflow-hidden" />
      </DialogContent>
    </Dialog>
  );
}
