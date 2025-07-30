"use client";
import { createHumanInterviewSession } from "@/app/(interviewProject)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, MessageSquare, Shield, Users } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const [loading, setLoading] = useState(false);

  const handleStartInterview = async () => {
    setLoading(true);
    try {
      const result = await createHumanInterviewSession({
        // projectId: projectInfo.projectId,
        shareToken,
      });
      if (!result.success) throw result;
      router.push(`/interview/session/chat/${result.data.chatToken}`);
      toast.success(t("startInterview"));
    } catch (error) {
      toast.error((error as Error).message || t("startingInterview"));
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
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t("title")}</h1>
          <p className="text-gray-600 dark:text-gray-400">
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
              <h3 className="font-medium text-gray-900 dark:text-gray-100">{t("whatToExpect")}</h3>
              <div className="grid gap-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{t("conversationalFormat")}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t("conversationalDescription")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{t("openEndedQuestions")}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t("openEndedDescription")}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{t("yourPace")}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t("yourPaceDescription")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100 text-sm">
                    {t("privacyTitle")}
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    {t("privacyDescription")}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          {user ? (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {t("participatingAs")}
                </p>
                <div className="inline-flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {user?.name
                        ? user.name.charAt(0).toUpperCase()
                        : user?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{user?.name || user?.email}</span>
                </div>
              </div>
              <Button
                onClick={handleStartInterview}
                disabled={loading}
                size="lg"
                className="w-full sm:w-auto"
              >
                {loading ? (
                  t("startingInterview")
                ) : (
                  <>
                    {t("startInterview")}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 mt-3">{t("agreementText")}</p>
            </>
          ) : (
            <>
              <div className="mt-12 mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">{t("loginDescription")}</p>
              </div>
              <Button onClick={handleLogin} size="lg" className="w-full sm:w-auto">
                {t("loginButton")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            {t("poweredBy")}{" "}
            <a
              href="https://atypica.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-700"
            >
              atypica.AI
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
