"use client";

import type { SageWithTypedFields } from "@/app/(sage)/(detail)/hooks/SageContext";
import { Button } from "@/components/ui/button";
import { Edit2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AvatarUpload } from "./AvatarUpload";
import { EditProfileDialog } from "./EditProfileDialog";
import { SageShareButton } from "./SageShareButton";

export function SageIdentityCard({ sage }: { sage: SageWithTypedFields }) {
  const t = useTranslations("Sage.SageIdentityCard");
  const [showEditDialog, setShowEditDialog] = useState(false);

  return (
    <>
      <div className="p-6 flex flex-col gap-4">
        {/* Header with Share Button */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-4 flex-1">
            <div className="shrink-0">
              <AvatarUpload sageId={sage.id} sageName={sage.name} currentAvatar={sage.avatar} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate" title={sage.name}>
                {sage.name}
              </h2>
              <p className="text-sm text-muted-foreground truncate" title={sage.domain}>
                {sage.domain}
              </p>
            </div>
          </div>
          <SageShareButton sageToken={sage.token} variant="ghost" size="sm" />
        </div>

        <div className="space-y-3">
          {sage.bio && (
            <div className="text-sm text-muted-foreground line-clamp-4 text-pretty">{sage.bio}</div>
          )}

          {/* Expertise Tags */}
          {sage.expertise && sage.expertise.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(Array.isArray(sage.expertise) ? sage.expertise : []).map((exp, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs truncate max-w-full"
                >
                  {String(exp)}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center text-xs text-muted-foreground">
            <span className="opacity-70">{t("locale")}:</span>
            <span>{sage.locale}</span>
          </div>

          {/* Edit Profile Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowEditDialog(true)}
          >
            <Edit2Icon className="size-3.5" />
            {t("editProfile")}
          </Button>
        </div>
      </div>

      <EditProfileDialog sage={sage} open={showEditDialog} onOpenChange={setShowEditDialog} />
    </>
  );
}
