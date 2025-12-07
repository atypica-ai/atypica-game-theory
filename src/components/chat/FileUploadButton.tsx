import { proxiedObjectCdnUrl } from "@/app/(system)/cdn/lib";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { getAttachmentFiles } from "@/lib/attachments/actions";
import { clientUploadFileToS3 } from "@/lib/attachments/client";
import {
  checkFileUploadLimits,
  DOCUMENT_MIME_TYPES,
  IMAGE_MIME_TYPES,
} from "@/lib/fileUploadLimits";
import { cn } from "@/lib/utils";
import { AttachmentFile } from "@/prisma/client";
import { FileText, ImageIcon, Library, Loader2, PaperclipIcon, Search, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export type FileUploadInfo = {
  objectUrl: string; // s3 object url without signature
  url: string;
  name: string;
  mimeType: string;
  size: number; // bytes
};

export type FileUploadButtonStatus = "uploading" | "ready";

export function FileUploadButton(props: {
  onFileUploadedAction: (fileInfo: FileUploadInfo) => void;
  disabled?: boolean;
  existingFiles?: FileUploadInfo[];
  showLimitsCheck?: boolean;
  children?: React.ReactNode;
  onStatusChange?: (status: FileUploadButtonStatus) => void;
}): JSX.Element;

export function FileUploadButton(props: {
  onFileUploadedAction: (fileInfo: FileUploadInfo) => void;
  disabled?: boolean;
  existingFiles?: FileUploadInfo[];
  showLimitsCheck?: boolean;
  buttonText?: string;
  className?: string;
  onStatusChange?: (status: FileUploadButtonStatus) => void;
}): JSX.Element;

export function FileUploadButton({
  onFileUploadedAction,
  disabled,
  existingFiles = [],
  showLimitsCheck = true,
  children,
  buttonText,
  className,
  onStatusChange,
}: {
  onFileUploadedAction: (fileInfo: FileUploadInfo) => void;
  disabled?: boolean;
  existingFiles?: FileUploadInfo[];
  showLimitsCheck?: boolean;
  children?: React.ReactNode;
  buttonText?: string;
  className?: string;
  onStatusChange?: (status: FileUploadButtonStatus) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [isLibraryOpen, setLibraryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("FileUploadLimits");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (showLimitsCheck) {
      const limitCheck = checkFileUploadLimits(existingFiles, {
        mimeType: file.type,
        size: file.size,
      });
      if (!limitCheck.canUpload) {
        let message = "";
        if (limitCheck.reason === "max-images") {
          message = t("maxImages");
        } else if (limitCheck.reason === "max-documents") {
          message = t("maxDocuments");
        } else if (limitCheck.reason === "max-total-size") {
          message = t("maxTotalSize");
        } else if (limitCheck.reason === "unsupported-type") {
          message = t("unsupportedType");
        } else if (limitCheck.reason === "max-single-file-size") {
          message = t("fileSizeExceeds3MB");
        }
        toast.error(message);
        return;
      }
    }

    setIsUploading(true);
    onStatusChange?.("uploading");

    try {
      const { objectUrl, getObjectUrl } = await clientUploadFileToS3(file);
      toast.success(t("fileUploadedSuccessfully"));
      onFileUploadedAction({
        objectUrl: objectUrl,
        url: getObjectUrl,
        name: file.name,
        mimeType: file.type,
        size: file.size,
      });
    } catch (error) {
      console.log("Error uploading file:", error);
      toast.error(error instanceof Error ? error.message : t("failedToUploadFile"));
    } finally {
      setIsUploading(false);
      onStatusChange?.("ready");
      // Clear the input value to allow uploading the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileSelectedFromLibrary = (fileInfo: FileUploadInfo) => {
    onFileUploadedAction(fileInfo);
    setLibraryOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled || isUploading}>
          {children ?? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={cn("h-8 text-xs", className)}
              disabled={disabled || isUploading}
            >
              {isUploading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <PaperclipIcon className="size-3" />
              )}
              {buttonText ? <span>{buttonText}</span> : null}
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
            <Upload className="size-4" />
            <span>{t("uploadNew")}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setLibraryOpen(true)}>
            <Library className="size-4" />
            <span>{t("selectFromLibrary")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={[...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES].join(",")}
        className="hidden"
        disabled={isUploading}
      />

      <SelectFromLibraryDialog
        open={isLibraryOpen}
        onOpenChange={setLibraryOpen}
        onFileSelectedAction={handleFileSelectedFromLibrary}
        existingFiles={existingFiles}
        showLimitsCheck={showLimitsCheck}
      />
    </>
  );
}

// Dialog for selecting from the library
function SelectFromLibraryDialog({
  open,
  onOpenChange,
  onFileSelectedAction,
  existingFiles,
  showLimitsCheck,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelectedAction: (fileInfo: FileUploadInfo) => void;
  existingFiles: FileUploadInfo[];
  showLimitsCheck: boolean;
}) {
  const [attachmentFiles, setAttachmentFiles] = useState<
    { file: AttachmentFile; thumbnailHttpUrl?: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const t = useTranslations("FileUploadLimits");

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    const result = await getAttachmentFiles();
    if (result.success) {
      setAttachmentFiles(result.data);
    } else {
      toast.error(result.message);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      fetchFiles();
    }
  }, [open, fetchFiles]);

  const filteredFiles = useMemo(() => {
    return attachmentFiles.filter(({ file }) =>
      file.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [attachmentFiles, searchTerm]);

  const handleSelectFile = async (file: AttachmentFile) => {
    if (showLimitsCheck) {
      const limitCheck = checkFileUploadLimits(existingFiles, {
        mimeType: file.mimeType,
        size: file.size,
      });
      if (!limitCheck.canUpload) {
        let message = "";
        if (limitCheck.reason === "max-images") {
          message = t("maxImages");
        } else if (limitCheck.reason === "max-documents") {
          message = t("maxDocuments");
        } else if (limitCheck.reason === "max-total-size") {
          message = t("maxTotalSize");
        } else if (limitCheck.reason === "unsupported-type") {
          message = t("unsupportedType");
        } else if (limitCheck.reason === "max-single-file-size") {
          message = t("fileSizeExceeds3MB");
        }
        toast.error(message);
        return;
      }
    }

    setIsSelecting(true);
    try {
      const fileHttpUrl = proxiedObjectCdnUrl({
        name: file.name,
        objectUrl: file.objectUrl,
        mimeType: file.mimeType,
      });
      onFileSelectedAction({
        objectUrl: file.objectUrl,
        url: fileHttpUrl,
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
      });
    } catch (error) {
      console.log("Error selecting file:", error);
      toast.error(error instanceof Error ? error.message : t("failedToSelectFile"));
    } finally {
      setIsSelecting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="px-0">
        <DialogHeader className="px-6">
          <DialogTitle>{t("selectFromLibrary")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col overflow-hidden gap-4">
          <div className="relative mx-6">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t("searchPlaceholder")}
              className="w-full rounded-lg bg-background pl-8"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredFiles.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{t("noFilesFound")}</p>
          ) : (
            <div className="max-h-60 overflow-y-auto px-6">
              <ul className="flex flex-col gap-2">
                {filteredFiles.map(({ file, thumbnailHttpUrl }) => (
                  <li key={file.id}>
                    <Button
                      variant="outline"
                      className="w-full justify-start h-auto"
                      onClick={() => handleSelectFile(file)}
                      disabled={isSelecting}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {file.mimeType.startsWith("image/") ? (
                          thumbnailHttpUrl ? (
                            <div className="size-8 shrink-0 relative">
                              <Image
                                src={thumbnailHttpUrl}
                                alt="User Avatar"
                                className="object-cover"
                                sizes="100px"
                                fill
                              />
                            </div>
                          ) : (
                            <ImageIcon className="size-8 shrink-0" />
                          )
                        ) : (
                          <FileText className="size-8 shrink-0" />
                        )}
                        <div className="grow text-left overflow-hidden">
                          <p className="text-sm font-medium truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
