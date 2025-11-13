import { cn } from "@/lib/utils";
import { Mic } from "lucide-react";
import { useTranslations } from "next-intl";
import { FC } from "react";

interface MicrophoneIndicatorProps {
  className?: string;
}

/**
 * MicrophoneIndicator - 显示麦克风图标，提示平台支持语音交互
 * 纯展示性组件，无交互功能
 */
export const MicrophoneIndicator: FC<MicrophoneIndicatorProps> = ({ className }) => {
  const t = useTranslations("InterviewProject.shareInvite");

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full",
        "bg-muted text-muted-foreground",
        "border border-border",
        className,
      )}
    >
      <Mic className="h-5 w-5" />
      <span className="text-sm font-medium">{t("microphoneLabel")}</span>
    </div>
  );
};
