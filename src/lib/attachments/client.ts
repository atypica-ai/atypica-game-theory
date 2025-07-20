"use client";
import { getS3UploadCredentials, recordAttachmentFile } from "./actions";

export async function clientUploadFileToS3(file: File): Promise<{
  objectUrl: string;
  getObjectUrl: string;
}> {
  const result = await getS3UploadCredentials({
    fileType: file.type,
    fileName: file.name,
  });

  if (!result.success) {
    throw new Error(result.message);
  }

  const { putObjectUrl, getObjectUrl, objectUrl } = result.data;

  const uploadResponse = await fetch(putObjectUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  if (!uploadResponse.ok) {
    throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
  }

  await recordAttachmentFile({
    objectUrl,
    name: file.name,
    mimeType: file.type,
    size: file.size,
  });

  return {
    objectUrl,
    getObjectUrl,
  };
}
