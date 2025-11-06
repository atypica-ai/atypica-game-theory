"use client";
import { createHumanInterviewSession } from "@/app/(interviewProject)/actions";
import { InterviewWelcome } from "@/app/(interviewProject)/components/InterviewWelcome";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GlobeIcon } from "lucide-react";
import { Locale, useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export function InviteInterviewClient({
  shareToken,
  projectInfo,
  user,
}: {
  shareToken: string;
  projectInfo: {
    projectId: number;
    ownerName: string;
  };
  user: {
    id: number;
    name?: string | null;
    email: string;
  } | null;
}) {
  const t = useTranslations("InterviewProject.shareInvite");
  const router = useRouter();
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Locale>(locale);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);

  const handleLanguageConfirm = async () => {
    setLoading(true);

    try {
      const result = await createHumanInterviewSession({
        shareToken,
        preferredLanguage: selectedLanguage,
      });
      if (!result.success) throw result;
      router.push(`/interview/session/chat/${result.data.chatToken}`);
      toast.success(t("startInterview"));
    } catch (error) {
      toast.error((error as Error).message || t("startInterviewError"));
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
  };

  const handleLogin = () => {
    const currentUrl = window.location.href;
    const callbackUrl = encodeURIComponent(currentUrl);
    router.push(`/auth/signin?callbackUrl=${callbackUrl}`);
  };

  const handleStartInterview = () => {
    // 验证隐私协议是否已勾选
    if (!privacyChecked) {
      toast.error(t("privacyCheckboxRequired"));
      return;
    }
    // 打开语言选择对话框
    setShowLanguageDialog(true);
  };

  // 如果用户未登录，显示登录提示
  if (!user) {
    return (
      <div className="px-4 py-8 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md text-center space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
            <p className="text-muted-foreground">
              {projectInfo.ownerName}
              {t("subtitle")}
            </p>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("loginDescription")}</p>
            <Button onClick={handleLogin} size="lg" className="w-full">
              {t("loginButton")}
            </Button>
          </div>
          <div className="pt-6">
            <p className="text-xs text-muted-foreground">
              {t("poweredBy")}{" "}
              <a
                href="https://atypica.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                atypica.AI
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 用户已登录，显示欢迎界面
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <InterviewWelcome
        user={user}
        privacyChecked={privacyChecked}
        onPrivacyCheckedChange={setPrivacyChecked}
        onStartInterview={handleStartInterview}
        disabled={loading}
      />

      {/* 语言选择 Dialog */}
      <Dialog open={showLanguageDialog} onOpenChange={setShowLanguageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GlobeIcon className="h-5 w-5" />
              {t("selectLanguage")}
            </DialogTitle>
            <DialogDescription className="text-left">
              {t("languageDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <RadioGroup
              value={selectedLanguage}
              onValueChange={(language: Locale) => setSelectedLanguage(language)}
            >
              <label
                htmlFor="zh-CN"
                className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <RadioGroupItem value="zh-CN" id="zh-CN" />
                <span className="text-sm font-medium">中文</span>
              </label>
              <label
                htmlFor="en-US"
                className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <RadioGroupItem value="en-US" id="en-US" />
                <span className="text-sm font-medium">English</span>
              </label>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button
              onClick={handleLanguageConfirm}
              disabled={loading || !selectedLanguage}
              className="w-full"
            >
              {loading ? t("startingInterview") : t("confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
