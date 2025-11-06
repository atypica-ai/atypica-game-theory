import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { FC } from "react";

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
    <div className={cn("bg-primary/10 p-4 rounded-lg", className)}>
      <label className="flex items-start space-x-3 cursor-pointer group">
        <Checkbox checked={checked} onCheckedChange={onCheckedChange} className="mt-1" />
        <div className="flex-1">
          <p className="font-medium text-primary text-sm">{t("privacyTitle")}</p>
          <p className="text-sm text-primary/80 mt-1">{t("privacyDescription")}</p>
        </div>
      </label>
    </div>
  );
};
