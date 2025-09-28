"use client";
import { createHumanInterviewSession } from "@/app/(interviewProject)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, GlobeIcon, MessageSquare, Shield, Users } from "lucide-react";
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

  return (
    <div className="px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl mx-auto"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
          <p className="text-muted-foreground">
            {projectInfo.ownerName}
            {t("subtitle")}
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{t("researchInterview")}</CardTitle>
              <Badge variant="secondary" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {t("humanInterview")}
              </Badge>
            </div>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                {t("researchBrief")}
              </h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {projectInfo.brief}
                </p>
              </div>
            </div> */}

            <div className="space-y-4">
              <h3 className="font-medium">{t("whatToExpect")}</h3>
              <div className="grid gap-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{t("conversationalFormat")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("conversationalDescription")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{t("openEndedQuestions")}</p>
                    <p className="text-sm text-muted-foreground">{t("openEndedDescription")}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{t("yourPace")}</p>
                    <p className="text-sm text-muted-foreground">{t("yourPaceDescription")}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary/10 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-primary text-sm">{t("privacyTitle")}</p>
                  <p className="text-sm text-primary/80 mt-1">{t("privacyDescription")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          {user ? (
            <>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground mb-2">{t("participatingAs")}</p>
                <div className="inline-flex items-center space-x-2 bg-muted px-3 py-1 rounded-full">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground text-xs font-medium">
                      {user?.name
                        ? user.name.charAt(0).toUpperCase()
                        : user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{user?.name || user?.email}</span>
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button disabled={loading} size="lg" className="w-full sm:w-auto">
                    {t("startInterview")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <GlobeIcon className="h-5 w-5" />
                      {t("selectLanguage")}
                    </DialogTitle>
                    <DialogDescription>{t("languageDescription")}</DialogDescription>
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

              <p className="text-xs text-muted-foreground mt-3">{t("agreementText")}</p>
            </>
          ) : (
            <>
              <div className="mt-12 mb-4">
                <p className="text-sm text-muted-foreground">{t("loginDescription")}</p>
              </div>
              <Button onClick={handleLogin} size="lg" className="w-full sm:w-auto">
                {t("loginButton")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <div className="text-center mt-6">
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
      </motion.div>
    </div>
  );
}
