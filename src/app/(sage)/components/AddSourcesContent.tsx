"use client";

import { SageSourceContent, SageSourceType } from "@/app/(sage)/types";
import {
  FileUploadButton,
  type FileUploadButtonStatus,
  type FileUploadInfo,
} from "@/components/chat/FileUploadButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { truncateForTitle } from "@/lib/textUtils";
import { cn } from "@/lib/utils";
import { FileTextIcon, GlobeIcon, UploadIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface AddSourcesContentProps {
  sources: SageSourceContent[];
  onSourcesChange: (sources: SageSourceContent[]) => void;
  currentSourceCount: number;
  maxSources?: number;
}

export function AddSourcesContent({
  sources,
  onSourcesChange,
  currentSourceCount,
  maxSources = 30,
}: AddSourcesContentProps) {
  const t = useTranslations("Sage.AddSourcesContent");
  const [uploadStatus, setUploadStatus] = useState<FileUploadButtonStatus>("ready");

  // Modal states for text and website
  const [showTextModal, setShowTextModal] = useState(false);
  const [showWebsiteModal, setShowWebsiteModal] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const remainingSlots = maxSources - currentSourceCount;
  const canAddMore = sources.length < remainingSlots;

  // Handle file upload
  const handleFileUploaded = useCallback(
    (file: FileUploadInfo) => {
      if (!["application/pdf", "text/plain", "text/markdown"].includes(file.mimeType)) {
        toast.error(t("unsupportedFileType"));
        return;
      }
      const fileSource: SageSourceContent = {
        type: SageSourceType.FILE,
        objectUrl: file.objectUrl,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
      };
      onSourcesChange([...sources, fileSource]);
    },
    [sources, onSourcesChange, t],
  );

  // Handle text source
  const handleAddText = useCallback(() => {
    if (!textContent.trim()) {
      toast.error(t("enterText"));
      return;
    }
    onSourcesChange([
      ...sources,
      {
        type: SageSourceType.TEXT,
        text: textContent,
      },
    ]);
    setTextContent("");
    setShowTextModal(false);
  }, [textContent, sources, onSourcesChange, t]);

  // Handle website source
  const handleAddWebsite = useCallback(() => {
    if (!websiteUrl.trim()) {
      toast.error(t("enterWebsiteUrl"));
      return;
    }

    // Simple URL validation
    try {
      new URL(websiteUrl);
    } catch {
      toast.error(t("invalidUrl"));
      return;
    }

    onSourcesChange([
      ...sources,
      {
        type: SageSourceType.URL,
        url: websiteUrl.trim(),
      },
    ]);

    setWebsiteUrl("");
    setShowWebsiteModal(false);
  }, [websiteUrl, sources, onSourcesChange, t]);

  // Remove source
  const handleRemoveSource = useCallback(
    (index: number) => {
      onSourcesChange(sources.filter((_, i) => i !== index));
    },
    [sources, onSourcesChange],
  );

  // Get source display name
  const getSourceDisplayName = (source: SageSourceContent, index: number): string => {
    if (source.type === SageSourceType.FILE) {
      return source.name || `File ${index + 1}`;
    } else if (source.type === SageSourceType.TEXT) {
      const text = source.text || "";
      return truncateForTitle(text, {
        maxDisplayWidth: 50,
        suffix: "...",
      });
    } else if (source.type === SageSourceType.URL) {
      return source.url || `URL ${index + 1}`;
    }
    return `Source ${index + 1}`;
  };

  return (
    <>
      <div className="space-y-4">
        {/* Upload Area */}
        <FileUploadButton
          onFileUploadedAction={handleFileUploaded}
          onStatusChange={setUploadStatus}
          disabled={!canAddMore}
          showLimitsCheck={true}
        >
          <div
            className={cn(
              "border-2 border-dashed rounded-lg",
              "flex flex-col items-center justify-center p-8",
              !canAddMore || uploadStatus !== "ready"
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:bg-accent/50",
            )}
          >
            <div className="flex items-center justify-center mb-3 size-12 rounded-full bg-primary/10">
              <UploadIcon className="size-6 text-primary" />
            </div>
            <h3 className="text-sm font-medium mb-1">{t("uploadFiles")}</h3>
            <p className="text-xs text-muted-foreground">{t("supportedFileTypes")}</p>
          </div>
        </FileUploadButton>

        {/* Source Type Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowWebsiteModal(true)}
            disabled={!canAddMore}
            className={cn(
              "p-3 border rounded-lg hover:bg-accent/50 transition-colors text-left",
              !canAddMore && "opacity-50 cursor-not-allowed",
            )}
          >
            <GlobeIcon className="size-4 mb-2 text-muted-foreground" />
            <div className="font-medium text-sm">{t("addWebsite")}</div>
            <div className="text-xs text-muted-foreground">{t("addWebsiteDesc")}</div>
          </button>

          <button
            onClick={() => setShowTextModal(true)}
            disabled={!canAddMore}
            className={cn(
              "p-3 border rounded-lg hover:bg-accent/50 transition-colors text-left",
              !canAddMore && "opacity-50 cursor-not-allowed",
            )}
          >
            <FileTextIcon className="size-4 mb-2 text-muted-foreground" />
            <div className="font-medium text-sm">{t("addText")}</div>
            <div className="text-xs text-muted-foreground">{t("addTextDesc")}</div>
          </button>
        </div>

        {/* Current Sources */}
        {sources.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">{t("selectedSources")}</div>
            {sources.map((source, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {source.type === "file" ? (
                    <FileTextIcon className="size-4 text-muted-foreground shrink-0" />
                  ) : source.type === "url" ? (
                    <GlobeIcon className="size-4 text-muted-foreground shrink-0" />
                  ) : (
                    <FileTextIcon className="size-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-sm truncate">{getSourceDisplayName(source, index)}</span>
                </div>
                <button
                  onClick={() => handleRemoveSource(index)}
                  className="p-1 hover:bg-accent rounded"
                >
                  <XIcon className="size-4 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{t("sourceLimit")}</span>
            <span className="text-sm font-medium">
              {currentSourceCount + sources.length} / {maxSources}
            </span>
          </div>
          <Progress
            value={((currentSourceCount + sources.length) / maxSources) * 100}
            className="h-2"
          />
        </div>
      </div>

      {/* Text Modal */}
      <Dialog open={showTextModal} onOpenChange={setShowTextModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addTextTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder={t("textPlaceholder")}
              rows={10}
              className="resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowTextModal(false)}>
                {t("cancel")}
              </Button>
              <Button onClick={handleAddText}>{t("add")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Website Modal */}
      <Dialog open={showWebsiteModal} onOpenChange={setShowWebsiteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addWebsiteTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowWebsiteModal(false)}>
                {t("cancel")}
              </Button>
              <Button onClick={handleAddWebsite}>{t("add")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
