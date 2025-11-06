import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { FC } from "react";
import { MicrophoneIndicator } from "./MicrophoneIndicator";
import { PrivacyAgreement } from "./PrivacyAgreement";
import { UserInfoCard } from "./UserInfoCard";

interface InterviewWelcomeProps {
  // TODO: Support user-configurable title and subtitle in Interview Project setup
  // Currently using default values from i18n
  // Will be configurable when Interview Project setup UI is implemented
  // Related: Interview Project configuration flow (未来功能)
  title?: string;
  subtitle?: string;
  user: {
    id: number;
    name?: string | null;
    email: string;
  };
  privacyChecked: boolean;
  onPrivacyCheckedChange: (checked: boolean) => void;
  onStartInterview: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * InterviewWelcome - 访谈欢迎界面主组件
 * 整合所有子组件，统筹欢迎界面
 */
export const InterviewWelcome: FC<InterviewWelcomeProps> = ({
  title,
  subtitle,
  user,
  privacyChecked,
  onPrivacyCheckedChange,
  onStartInterview,
  disabled = false,
  className,
}) => {
  const t = useTranslations("InterviewProject.shareInvite");

  // 使用 i18n 默认值（如果未提供自定义标题/副标题）
  const displayTitle = title || t("welcomeTitle");
  const displaySubtitle =
    subtitle || `${t("welcomeSubtitleLine1")} ${t("welcomeSubtitleLine2")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("w-full max-w-2xl mx-auto px-4 py-8", className)}
    >
      <div className="space-y-8">
        {/* 标题和副标题 - 左对齐 */}
        <div className="text-left space-y-4">
          <h1 className="text-3xl font-bold text-foreground">{displayTitle}</h1>
          <p className="text-muted-foreground text-base leading-relaxed whitespace-pre-line">
            {displaySubtitle}
          </p>
        </div>

        {/* Microphone 和用户信息 - 左对齐 */}
        <div className="flex flex-col sm:flex-row items-start gap-3">
          <MicrophoneIndicator />
          <UserInfoCard user={user} />
        </div>

        {/* 隐私与保护 */}
        <PrivacyAgreement checked={privacyChecked} onCheckedChange={onPrivacyCheckedChange} />

        {/* 开始按钮 - 与隐私框同宽 */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={onStartInterview}
            disabled={disabled}
            size="lg"
            className="w-full"
          >
            {t("startInterview")}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
