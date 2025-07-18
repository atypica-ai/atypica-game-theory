export const FILE_UPLOAD_LIMITS = {
  MAX_IMAGES: 5,
  MAX_DOCUMENTS: 3,
  MAX_TOTAL_SIZE: 50 * 1024 * 1024, // 50MB
} as const;

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/svg+xml",
] as const;

export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "application/json",
] as const;

import { FileUploadInfo } from "@/components/chat/FileUploadButton";

export interface FileUploadLimitsResult {
  canUpload: boolean;
  reason?: "max-images" | "max-documents" | "max-total-size" | "unsupported-type";
}

export function isImageFile(mimeType: string): boolean {
  return IMAGE_MIME_TYPES.includes(mimeType as any);
}

export function isDocumentFile(mimeType: string): boolean {
  return DOCUMENT_MIME_TYPES.includes(mimeType as any);
}

export function categorizeFiles(files: FileUploadInfo[]) {
  const images = files.filter((file) => isImageFile(file.mimeType));
  const documents = files.filter((file) => isDocumentFile(file.mimeType));
  const others = files.filter(
    (file) => !isImageFile(file.mimeType) && !isDocumentFile(file.mimeType),
  );

  return { images, documents, others };
}

export function checkFileUploadLimits(
  existingFiles: FileUploadInfo[],
  newFile: { mimeType: string; size: number },
): FileUploadLimitsResult {
  const { images, documents } = categorizeFiles(existingFiles);
  const totalSize = existingFiles.reduce((acc, file) => acc + file.size, 0);

  // Check if new file type is supported
  if (!isImageFile(newFile.mimeType) && !isDocumentFile(newFile.mimeType)) {
    return {
      canUpload: false,
      reason: "unsupported-type",
    };
  }

  // Check image limit
  if (isImageFile(newFile.mimeType) && images.length >= FILE_UPLOAD_LIMITS.MAX_IMAGES) {
    return {
      canUpload: false,
      reason: "max-images",
    };
  }

  // Check document limit
  if (isDocumentFile(newFile.mimeType) && documents.length >= FILE_UPLOAD_LIMITS.MAX_DOCUMENTS) {
    return {
      canUpload: false,
      reason: "max-documents",
    };
  }

  // Check total size limit
  if (totalSize + newFile.size > FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE) {
    return {
      canUpload: false,
      reason: "max-total-size",
    };
  }

  return { canUpload: true };
}

export function getFileUploadStatus(files: FileUploadInfo[]) {
  const { images, documents } = categorizeFiles(files);
  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  return {
    imageCount: images.length,
    documentCount: documents.length,
    totalSize,
    canUploadImage: images.length < FILE_UPLOAD_LIMITS.MAX_IMAGES,
    canUploadDocument: documents.length < FILE_UPLOAD_LIMITS.MAX_DOCUMENTS,
    canUploadBySize: totalSize < FILE_UPLOAD_LIMITS.MAX_TOTAL_SIZE,
    statusText: `${images.length}/${FILE_UPLOAD_LIMITS.MAX_IMAGES} images, ${documents.length}/${FILE_UPLOAD_LIMITS.MAX_DOCUMENTS} documents`,
  };
}
