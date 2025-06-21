"use client";
import { createStudyUserChat } from "@/app/(study)/study/actions";
import { FileAttachment } from "@/components/chat/FileAttachment";
import {
  FileUploadButton,
  FileUploadInfo,
  MAX_TOTAL_FILE_SIZE,
} from "@/components/chat/FileUploadButton";
import { VoiceInputButton } from "@/components/chat/VoiceInputButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDevice } from "@/lib/utils";
import { ArrowRightIcon, RotateCwIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

export function InputSection() {
  const locale = useLocale();
  const t = useTranslations("HomePage.InputSection");
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
    <div className="max-w-xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <Textarea
          value={input}
          onChange={(e) => {
            const value = e.target.value;
            setInput(value);
            debouncedSaveToLocalStorage(value);
          }}
          placeholder={t("placeholder")}
          className="min-h-48 resize-none focus-visible:border-primary/70 transition-colors rounded-none pt-5 px-5 pb-16 border-2"
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
        <div className="absolute left-0 bottom-0 right-0 flex items-center justify-start gap-2 p-4">
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
          <div className="ml-auto" />
          <VoiceInputButton
            onTranscript={(text) => {
              setInput((current) => (current ? `${current} ${text}` : text));
            }}
            language={locale}
            contextText={input}
            disabled={isLoading}
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={isLoading || !input.trim()}
            className="rounded-full size-9"
          >
            {isLoading ? (
              <RotateCwIcon className="h-4 w-4 text-primary animate-spin" />
            ) : (
              <ArrowRightIcon className="h-4 w-4 text-primary" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
