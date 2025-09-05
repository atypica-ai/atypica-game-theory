"use client";
import { createStudyUserChat } from "@/app/(study)/study/actions";
import { FileAttachment } from "@/components/chat/FileAttachment";
import { FileUploadButton } from "@/components/chat/FileUploadButton";
import { FileUploadStatus } from "@/components/chat/FileUploadStatus";
import { RecordButton } from "@/components/chat/RecordButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFileUploadManager } from "@/hooks/use-file-upload-manager";
import { useDevice } from "@/lib/utils";
import { ArrowRightIcon, RotateCwIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

export function InputSection() {
  const locale = useLocale();
  const t = useTranslations("HomePage.InputSection");
  const router = useRouter();
  const { isMobile } = useDevice();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState("");
  const { uploadedFiles, handleFileUploaded, handleRemoveFile, isUploadDisabled } =
    useFileUploadManager();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setIsLoading(true);
    try {
      const result = await createStudyUserChat({
        role: "user",
        content: input,
        attachments: uploadedFiles.map((file) => ({
          objectUrl: file.objectUrl,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
        })),
      });
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
        {/* Partial transcript indicator */}
        {partialTranscript && (
          <div className="absolute bottom-16 left-4 right-4 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
              <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
              <span className="font-medium">正在识别:</span>
              <span className="flex-1 truncate">{partialTranscript}</span>
            </div>
          </div>
        )}
        <div className="absolute left-0 bottom-0 right-0 flex items-center justify-start gap-2 p-4">
          <FileUploadButton
            onFileUploadedAction={handleFileUploaded}
            disabled={isLoading || isUploadDisabled()}
            existingFiles={uploadedFiles}
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
          {uploadedFiles.length > 0 && <FileUploadStatus files={uploadedFiles} className="ml-2" />}
          <div className="ml-auto" />
          <RecordButton
            onTranscript={(text) => {
              setInput((current) => (current ? `${current} ${text}` : text));
              setPartialTranscript(""); // Clear partial transcript when final transcript is set
            }}
            onPartialTranscript={(text) => {
              setPartialTranscript(text);
            }}
            language={locale}
            disabled={isLoading}
            className="h-9 w-9"
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
