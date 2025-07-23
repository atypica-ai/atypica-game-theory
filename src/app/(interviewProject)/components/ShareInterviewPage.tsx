"use client";
import { createHumanInterviewSession } from "@/app/(interviewProject)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, MessageSquare, Shield, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface ShareInterviewPageProps {
  shareToken: string;
  projectInfo: {
    projectId: number;
    brief: string;
    ownerName: string | null;
  };
  user: {
    id: number;
    name?: string | null;
    email?: string | null;
  };
}

export function ShareInterviewPage({ shareToken, projectInfo, user }: ShareInterviewPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStartInterview = async () => {
    setLoading(true);
    try {
      const result = await createHumanInterviewSession({
        projectId: projectInfo.projectId,
        shareToken,
      });

      if (result.success) {
        toast.success("Interview session created successfully");
        // Navigate to the chat session
        router.push(`/chat/${result.data.chatToken}`);
      } else {
        toast.error(result.message || "Failed to start interview");
      }
    } catch (error) {
      toast.error("Failed to start interview");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            You're Invited to an Interview
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {projectInfo.ownerName ? `${projectInfo.ownerName} has` : "Someone has"} invited you to
            participate in a research interview
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Research Interview</CardTitle>
              <Badge variant="secondary" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                Human Interview
              </Badge>
            </div>
            <CardDescription>
              This interview will help gather insights for research purposes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Research Brief</h3>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {projectInfo.brief}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100">What to Expect</h3>
              <div className="grid gap-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Conversational Format</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      The interview will be conducted in a natural, conversational style
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Open-ended Questions</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      You'll be asked thoughtful questions to share your experiences and insights
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Your Pace</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Take your time to think and respond - there's no rush
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
                    Privacy & Confidentiality
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    Your responses will be used for research purposes only. Personal information
                    will be kept confidential and secure.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border text-center">
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Participating as:</p>
            <div className="inline-flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {user.name
                    ? user.name.charAt(0).toUpperCase()
                    : user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium">{user.name || user.email}</span>
            </div>
          </div>

          <Button
            onClick={handleStartInterview}
            disabled={loading}
            size="lg"
            className="w-full sm:w-auto"
          >
            {loading ? (
              "Starting Interview..."
            ) : (
              <>
                Start Interview
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 mt-3">
            By starting the interview, you agree to participate in this research study
          </p>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Powered by{" "}
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
