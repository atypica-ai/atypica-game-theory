import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { FC } from "react";
import { Shield } from "lucide-react";

interface PrivacyAgreementProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

/**
 * PrivacyAgreement - 隐私政策模块，包含 checkbox 勾选
 * 简化版本：checkbox 在最左边，无 icon
 */
export const PrivacyAgreement: FC<PrivacyAgreementProps> = ({
  checked,
  onCheckedChange,
  className,
}) => {
  const t = useTranslations("InterviewProject.shareInvite");

  return (
    <div className={cn("rounded-lg border border-primary/20 bg-primary/10 p-4", className)}>
      <label className="group flex cursor-pointer items-start gap-3">
        <Checkbox checked={checked} onCheckedChange={onCheckedChange} className="mt-1" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-primary">{t("privacyTitle")}</p>
          </div>
          <p className="mt-1 text-sm text-primary/80">{t("privacyDescription")}</p>
        </div>
      </label>
    </div>
  );
};
