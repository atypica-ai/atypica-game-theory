"use client";
import type { SageAvatar, SageExtra } from "@/app/(sage)/types";
import { Separator } from "@/components/ui/separator";
import type { Sage } from "@/prisma/client";
import { useTranslations } from "next-intl";
import { AvatarUpload } from "./components/AvatarUpload";

export function SageDetailPageClient({
  sage,
}: {
  sage: Pick<Sage, "id" | "token" | "name" | "locale" | "bio" | "domain"> & {
    expertise: string[];
    extra: SageExtra;
    avatar: SageAvatar;
  };
}) {
  const t = useTranslations("Sage.DetailPage");

  return (
    <div className="p-6 space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-start gap-2">
        <AvatarUpload sageId={sage.id} sageName={sage.name} currentAvatar={sage.avatar} />
        <div className="ml-4">
          <h1 className="text-xl font-semibold">{sage.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{sage.domain}</p>
        </div>
      </div>

      <Separator />

      {/* Basic Info */}
      <div className="space-y-3">
        <div className="space-y-2 text-sm">
          {sage.bio && (
            <div>
              <div className="text-xs text-muted-foreground">{t("bio")}</div>
              <p className="text-sm mt-1">{sage.bio}</p>
            </div>
          )}
          <div>
            <div className="text-xs text-muted-foreground">{t("expertise")}</div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {(Array.isArray(sage.expertise) ? sage.expertise : []).map((exp, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs"
                >
                  {String(exp)}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">{t("locale")}:</span>{" "}
            <span>{sage.locale}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
