"use client";

import type { SageWithTypedFields } from "@/app/(sage)/(detail)/hooks/SageContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, Edit2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AvatarUpload } from "./AvatarUpload";
import { EditProfileDialog } from "./EditProfileDialog";
import { ExportSkillButton } from "./ExportSkillButton";
import { SageShareButton } from "./SageShareButton";

interface SageIdentityCardProps {
  sage: SageWithTypedFields;
  /**
   * Variant controls the display mode:
   * - "sidebar": Full card for desktop sidebar (always expanded)
   * - "collapsible": Compact collapsible card for mobile (with expand/collapse)
   */
  variant?: "sidebar" | "collapsible";
}

export function SageIdentityCard({ sage, variant = "sidebar" }: SageIdentityCardProps) {
  const t = useTranslations("Sage.SageIdentityCard");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isCollapsible = variant === "collapsible";
  // const showContent = !isCollapsible || isExpanded;

  return (
    <>
      <div
        className={cn(
          "bg-background transition-all duration-300",
          isCollapsible && "border-b border-border sticky top-0 z-10",
        )}
      >
        {/* Header - Collapsible on mobile, static on desktop */}
        <div
          className={cn(
            "flex items-center gap-3",
            isCollapsible ? "px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors" : "p-4",
          )}
          onClick={isCollapsible ? () => setIsExpanded(!isExpanded) : undefined}
        >
          {/* Avatar */}
          <div className="shrink-0">
            <AvatarUpload
              sageId={sage.id}
              sageName={sage.name}
              currentAvatar={sage.avatar}
              className={isCollapsible ? "size-14" : "size-18"}
            />
          </div>

          {/* Name & Domain */}
          <div className="flex-1 min-w-0">
            <h2
              className={cn("font-semibold truncate", isCollapsible ? "text-sm" : "text-lg")}
              title={sage.name}
            >
              {sage.name}
            </h2>
            <p
              className={cn(
                "text-muted-foreground truncate",
                isCollapsible ? "text-xs" : "text-sm",
              )}
              title={sage.domain}
            >
              {sage.domain}
            </p>
          </div>

          {/* Right Action */}
          {isCollapsible ? (
            <ChevronDownIcon
              className={cn(
                "size-5 text-muted-foreground transition-transform duration-300 shrink-0",
                isExpanded && "rotate-180",
              )}
              aria-label={isExpanded ? t("collapse") : t("expand")}
            />
          ) : (
            <div className="flex gap-1">
              <ExportSkillButton
                sageToken={sage.token}
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
              />
              <SageShareButton
                sageToken={sage.token}
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
              />
            </div>
          )}
        </div>

        {/* Expandable Content */}
        <div
          className={cn(
            "transition-all duration-300",
            isCollapsible
              ? isExpanded
                ? "max-h-[800px] opacity-100"
                : "max-h-0 opacity-0 overflow-hidden"
              : "block",
          )}
        >
          <div className={cn("space-y-3 pb-4 px-4", isCollapsible ? "pt-2" : "")}>
            {/* Bio */}
            {sage.bio && (
              <div className="text-sm text-muted-foreground text-pretty">{sage.bio}</div>
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

            {/* Locale */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="opacity-70">{t("locale")}:</span>
              <span>{sage.locale}</span>
            </div>

            {/* Action Buttons */}
            <div className={cn("flex flex-col gap-2", isCollapsible ? "pt-1" : "pt-0")}>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEditDialog(true);
                  }}
                >
                  <Edit2Icon className="size-3.5" />
                  {t("editProfile")}
                </Button>
              </div>
              {isCollapsible && (
                <div className="flex gap-2">
                  <ExportSkillButton
                    sageToken={sage.token}
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                  />
                  <SageShareButton
                    sageToken={sage.token}
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <EditProfileDialog sage={sage} open={showEditDialog} onOpenChange={setShowEditDialog} />
    </>
  );
}
