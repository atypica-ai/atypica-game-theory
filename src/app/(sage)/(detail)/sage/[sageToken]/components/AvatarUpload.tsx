"use client";

import { updateSageAvatar } from "@/app/(sage)/(detail)/actions";
import type { SageAvatar } from "@/app/(sage)/types";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { getS3UploadCredentials } from "@/lib/attachments/actions";
import { Loader2Icon, UploadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

export function AvatarUpload({
  sageId,
  sageName,
  currentAvatar,
}: {
  sageId: number;
  sageName: string;
  currentAvatar: SageAvatar;
}) {
  const t = useTranslations("Sage.detail.avatarUpload");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error(t("selectImageFile"));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t("imageSizeLimit"));
        return;
      }

      setIsUploading(true);
      try {
        // Get upload credentials with public ACL
        const credResult = await getS3UploadCredentials({
          fileType: file.type,
          fileName: file.name,
          acl: "public-read",
        });

        if (!credResult.success) {
          throw new Error(credResult.message);
        }

        const { putObjectUrl, objectUrl } = credResult.data;

        // Upload file to S3
        const uploadResponse = await fetch(putObjectUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }

        // Update sage avatar
        const updateResult = await updateSageAvatar(sageId, objectUrl);
        if (!updateResult.success) {
          throw new Error(updateResult.message);
        }

        toast.success(t("avatarUpdated"));
        router.refresh();
      } catch (error) {
        console.error("Error uploading avatar:", error);
        toast.error(error instanceof Error ? error.message : t("uploadFailed"));
      } finally {
        setIsUploading(false);
        // Reset input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [sageId, router, t],
  );

  return (
    <div className="relative group size-20 rounded-full overflow-hidden bg-muted">
      {currentAvatar.url ? (
        <Image src={currentAvatar.url} alt={sageName} fill className="object-cover" />
      ) : (
        <HippyGhostAvatar className="size-20" seed={sageId} />
      )}
      {isUploading ? (
        <div className="absolute top-0 left-0 w-full h-full bg-black/80 text-white flex items-center justify-center">
          <Loader2Icon className="size-5 animate-spin" />
        </div>
      ) : (
        <div
          className="absolute top-0 left-0 w-full h-full bg-black/80 text-white cursor-pointer hidden group-hover:flex items-center justify-center"
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <UploadIcon className="size-5" />
        </div>
      )}
    </div>
  );
}
