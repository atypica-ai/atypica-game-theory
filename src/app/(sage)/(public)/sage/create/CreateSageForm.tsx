"use client";
import { createSage } from "@/app/(sage)/actions";
import { SageSourceContent, SageSourceType } from "@/app/(sage)/types";
import { FileUploadButton, type FileUploadInfo } from "@/components/chat/FileUploadButton";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { truncateForTitle } from "@/lib/textUtils";
import { cn } from "@/lib/utils";
import { ArrowRightIcon, FileTextIcon, GlobeIcon, UploadIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export function CreateSageForm() {
  const t = useTranslations("Sage.create");
  const router = useRouter();
  const locale = useLocale();

  const [sources, setSources] = useState<SageSourceContent[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Modal states
  const [showTextModal, setShowTextModal] = useState(false);
  const [showWebsiteModal, setShowWebsiteModal] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  // Sage metadata (will be filled after adding sources)
  const [sageName, setSageName] = useState("");
  const [sageDomain, setSageDomain] = useState("");
  const [showMetadataStep, setShowMetadataStep] = useState(false);

  // Handle file upload
  const handleFileUploaded = (file: FileUploadInfo) => {
    const fileSource: SageSourceContent = {
      type: SageSourceType.FILE,
      objectUrl: file.objectUrl,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
    };
    setSources((prev) => [...prev, fileSource]);
  };

  // Handle text source
  const handleAddText = () => {
    if (!textContent.trim()) {
      toast.error(t("enterText"));
      return;
    }
    setSources((prev) => [
      ...prev,
      {
        type: SageSourceType.TEXT,
        text: textContent,
      },
    ]);
    setTextContent("");
    setShowTextModal(false);
    toast.success(t("textAdded"));
  };

  // Handle website source
  const handleAddWebsite = () => {
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

    setSources((prev) => [
      ...prev,
      {
        type: SageSourceType.URL,
        url: websiteUrl.trim(),
      },
    ]);

    setWebsiteUrl("");
    setShowWebsiteModal(false);
    toast.success(t("websiteAdded"));
  };

  // Remove source
  const handleRemoveSource = (index: number) => {
    setSources((prev) => prev.filter((_, i) => i !== index));
  };

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

  // Handle next step
  const handleNext = () => {
    if (sources.length === 0) {
      toast.error(t("addAtLeastOneSource"));
      return;
    }
    setShowMetadataStep(true);
  };

  // Handle create sage
  const handleCreate = useCallback(async () => {
    if (!sageName.trim()) {
      toast.error(t("enterName"));
      return;
    }
    if (!sageDomain.trim()) {
      toast.error(t("enterDomain"));
      return;
    }
    setIsCreating(true);
    try {
      const result = await createSage({
        name: sageName.trim(),
        domain: sageDomain.trim(),
        locale,
        sources,
      });
      if (!result.success) throw result;
      const { sage } = result.data;
      toast.success(t("createSuccess"));
      router.push(`/sage/${sage.token}`);
    } catch (error) {
      console.error("Error creating sage:", error);
      toast.error(t("createFailed"));
      setIsCreating(false);
    }
  }, [router, sageName, sageDomain, sources, locale, t]);

  if (showMetadataStep) {
    return (
      <FitToViewport className="flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            {t("expertInfo")}
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-8">
            {t("expertInfoDescription")}
          </p>

          <div className="space-y-6">
            <div>
              <Label htmlFor="name">{t("expertName")}</Label>
              <Input
                id="name"
                value={sageName}
                onChange={(e) => setSageName(e.target.value)}
                placeholder={t("expertNamePlaceholder")}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="domain">{t("expertDomain")}</Label>
              <Input
                id="domain"
                value={sageDomain}
                onChange={(e) => setSageDomain(e.target.value)}
                placeholder={t("expertDomainPlaceholder")}
                className="mt-2"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowMetadataStep(false)}>
                {t("back")}
              </Button>
              <Button onClick={handleCreate} disabled={isCreating} className="flex-1">
                {isCreating ? t("creating") : t("create")}
              </Button>
            </div>
          </div>
        </div>
      </FitToViewport>
    );
  }

  return (
    <FitToViewport className="flex flex-col items-center justify-start p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{t("title")}</h1>
          <p className="text-zinc-600 dark:text-zinc-400">{t("description")}</p>
        </div>

        {/* Upload Area */}
        <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-12 mb-6 text-center bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex justify-center mb-4">
            <div className="size-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <UploadIcon className="size-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            {t("uploadSources")}
          </h3>

          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
            <FileUploadButton
              onFileUploadedAction={handleFileUploaded}
              disabled={sources.length >= 10}
              showLimitsCheck={true}
              className="text-green-600 hover:underline"
            >
              {t("chooseFilesToUpload")}
            </FileUploadButton>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            {t("supportedFileTypes")}
          </p>
        </div>

        {/* Source Type Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setShowWebsiteModal(true)}
            className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
          >
            <GlobeIcon className="size-5 mb-2 text-zinc-600 dark:text-zinc-400" />
            <div className="font-medium text-zinc-900 dark:text-zinc-100">{t("websiteButton")}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-500">{t("addWebsiteUrl")}</div>
          </button>

          <button
            onClick={() => setShowTextModal(true)}
            className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors text-left"
          >
            <FileTextIcon className="size-5 mb-2 text-zinc-600 dark:text-zinc-400" />
            <div className="font-medium text-zinc-900 dark:text-zinc-100">{t("pasteTextButton")}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-500">{t("pasteTextDirectly")}</div>
          </button>
        </div>

        {/* Source List */}
        {sources.length > 0 && (
          <div className="mb-6 space-y-2">
            {sources.map((source, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {source.type === "file" ? (
                    <FileTextIcon className="size-4 text-zinc-500 flex-shrink-0" />
                  ) : source.type === "url" ? (
                    <GlobeIcon className="size-4 text-zinc-500 flex-shrink-0" />
                  ) : (
                    <FileTextIcon className="size-4 text-zinc-500 flex-shrink-0" />
                  )}
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                    {getSourceDisplayName(source, index)}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveSource(index)}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                >
                  <XIcon className="size-4 text-zinc-500" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Source Limit */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileTextIcon className="size-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t("sourceLimit")}
              </span>
            </div>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {sources.length} / 10
            </span>
          </div>
          <Progress value={(sources.length / 10) * 100} className="h-2" />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => router.back()}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleNext}
            disabled={sources.length === 0}
            className={cn(sources.length === 0 && "opacity-50 cursor-not-allowed")}
          >
            {t("next")}
            <ArrowRightIcon className="size-4 ml-2" />
          </Button>
        </div>

        {/* Text Modal */}
        <Dialog open={showTextModal} onOpenChange={setShowTextModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("pasteTextTitle")}</DialogTitle>
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
                <Button onClick={handleAddText}>{t("addButton")}</Button>
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
                <Button onClick={handleAddWebsite}>{t("addButton")}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </FitToViewport>
  );
}
