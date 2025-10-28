"use client";
import { createSage } from "@/app/(sage)/actions";
import { FileUploadButton } from "@/components/chat/FileUploadButton";
import { Button } from "@/components/ui/button";
import { useFileUploadManager } from "@/hooks/use-file-upload-manager";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  BookOpen,
  Brain,
  FileText,
  Lightbulb,
  MessageCircle,
  Network,
  Target,
  Upload,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface SageHomePageClientProps {
  isUploadEnabled: boolean;
}

export default function SageHomePageClient({ isUploadEnabled }: SageHomePageClientProps) {
  const t = useTranslations("Sage.homepage");
  const router = useRouter();
  const { uploadedFiles, handleFileUploaded, clearFiles } = useFileUploadManager();
  const [isCreating, setIsCreating] = useState(false);
  const [sageName, setSageName] = useState("");
  const [sageDomain, setSageDomain] = useState("");

  const handleStartCreation = async () => {
    if (uploadedFiles.length === 0) {
      toast.error(t("uploadFileFirst"));
      return;
    }

    if (!sageName.trim()) {
      toast.error(t("enterName"));
      return;
    }

    if (!sageDomain.trim()) {
      toast.error(t("enterDomain"));
      return;
    }

    setIsCreating(true);
    try {
      const result = await createSage({
        name: sageName.trim(),
        domain: sageDomain.trim(),
        locale: "zh-CN", // TODO: Get from user locale
        attachments: uploadedFiles.map((file) => ({
          fileId: file.fileId,
          type: "file",
          content: file.objectUrl,
          name: file.name,
          mimeType: file.mimeType,
        })),
      });

      if (!result.success) throw result;

      const { sage } = result.data;
      router.push(`/sage/${sage.token}`);
    } catch (error) {
      console.log("Error creating sage:", error);
      toast.error(t("createFailed"));
      setIsCreating(false);
    }
  };

  const features = [
    {
      id: "import",
      title: t("importKnowledge"),
      description: t("importDescription"),
      icon: Upload,
      details: [
        { icon: FileText, text: t("multipleFormats") },
        { icon: Target, text: t("aiProcessing") },
        { icon: Brain, text: t("memoryDocument") },
      ],
    },
    {
      id: "analysis",
      title: t("knowledgeAnalysis"),
      description: t("analysisDescription"),
      icon: Target,
      details: [
        { icon: Lightbulb, text: t("gapDetection") },
        { icon: Network, text: t("dimensionAnalysis") },
        { icon: FileText, text: t("completenessScore") },
      ],
    },
    {
      id: "interview",
      title: t("supplementaryInterview"),
      description: t("interviewDescription"),
      icon: MessageCircle,
      details: [
        { icon: MessageCircle, text: t("adaptiveQuestions") },
        { icon: Target, text: t("fillGaps") },
        { icon: Users, text: t("naturalConversation") },
      ],
    },
    {
      id: "chat",
      title: t("chatWithSage"),
      description: t("chatDescription"),
      icon: BookOpen,
      details: [
        { icon: MessageCircle, text: t("expertConsultation") },
        { icon: Brain, text: t("contextAware") },
        { icon: Users, text: t("domainSpecific") },
      ],
    },
  ];

  const dimensions = [
    {
      id: "foundational",
      title: t("foundationalTheory"),
      description: t("foundationalDescription"),
      icon: BookOpen,
    },
    {
      id: "practical",
      title: t("practicalExperience"),
      description: t("practicalDescription"),
      icon: Target,
    },
    {
      id: "industry",
      title: t("industryInsights"),
      description: t("industryDescription"),
      icon: Network,
    },
    {
      id: "problem",
      title: t("problemSolving"),
      description: t("problemDescription"),
      icon: Lightbulb,
    },
    {
      id: "tools",
      title: t("toolsMethodologies"),
      description: t("toolsDescription"),
      icon: Brain,
    },
    {
      id: "communication",
      title: t("communicationSkills"),
      description: t("communicationDescription"),
      icon: MessageCircle,
    },
    {
      id: "learning",
      title: t("continuousLearning"),
      description: t("learningDescription"),
      icon: Users,
    },
  ];

  return (
    <div className="bg-white dark:bg-zinc-950">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="font-mono text-sm font-medium tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">
              Expert Agent Platform
            </h1>
            <h2 className="font-sans text-4xl md:text-7xl font-normal tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
              {t("title")}
            </h2>
          </div>
          <p className="max-w-2xl mx-auto text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {t("subtitle")}
          </p>

          {/* Upload and Creation Form */}
          <div className="pt-4">
            <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
              {isUploadEnabled ? (
                <>
                  {uploadedFiles.length === 0 ? (
                    <>
                      <FileUploadButton
                        onFileUploadedAction={handleFileUploaded}
                        existingFiles={uploadedFiles}
                        showLimitsCheck={true}
                        disabled={isCreating}
                        className="w-full h-12 text-sm"
                      >
                        {t("uploadFiles")}
                      </FileUploadButton>
                      <Button size="lg" variant="outline" asChild className="w-full h-12">
                        <Link href="/sages" prefetch={true}>
                          {t("viewMySages")}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <div className="w-full space-y-4">
                      <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg border space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="size-5 text-zinc-600 dark:text-zinc-400" />
                            <div>
                              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {uploadedFiles.length} {t("filesSelected")}
                              </span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearFiles}
                            disabled={isCreating}
                          >
                            {t("reSelectFiles")}
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder={t("namePlaceholder")}
                            value={sageName}
                            onChange={(e) => setSageName(e.target.value)}
                            disabled={isCreating}
                            className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                          />
                          <input
                            type="text"
                            placeholder={t("domainPlaceholder")}
                            value={sageDomain}
                            onChange={(e) => setSageDomain(e.target.value)}
                            disabled={isCreating}
                            className="w-full px-3 py-2 text-sm border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleStartCreation}
                        disabled={isCreating || !sageName.trim() || !sageDomain.trim()}
                        size="lg"
                        className="w-full h-12"
                      >
                        {isCreating ? t("creating") : t("startCreation")}
                        <ArrowRight className="h-4 w-4" />
                      </Button>

                      <Button size="lg" variant="outline" asChild className="w-full h-12">
                        <Link href="/sages" prefetch={true}>
                          {t("viewMySages")}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Button size="lg" variant="outline" asChild className="w-full h-12">
                  <Link href="/sages">
                    {t("viewMySages")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-4 py-20 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-zinc-200 dark:border-zinc-800">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div
                  key={feature.id}
                  className={cn(
                    "p-6 md:p-10 border-zinc-200 dark:border-zinc-800",
                    index % 2 === 0 && "md:border-r",
                    index < 2 && "border-b"
                  )}
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <IconComponent className="size-5 text-zinc-600 dark:text-zinc-400" />
                      <h3 className="text-lg md:text-xl font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {feature.description}
                    </p>
                    <div className="space-y-2">
                      {feature.details.map((detail, detailIndex) => {
                        const DetailIcon = detail.icon;
                        return (
                          <div key={detailIndex} className="flex items-center gap-2">
                            <DetailIcon className="size-4 text-zinc-500 dark:text-zinc-500" />
                            <span className="text-sm text-zinc-600 dark:text-zinc-400">
                              {detail.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Analysis Dimensions Section */}
      <section className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/20">
        <div className="container mx-auto px-4 py-20 md:py-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="font-sans text-2xl md:text-4xl font-normal tracking-tight text-zinc-900 dark:text-zinc-100">
                {t("analysisDimensions")}
              </h2>
              <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400">
                {t("dimensionsDescription")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {dimensions.map((dimension) => {
                const IconComponent = dimension.icon;
                return (
                  <div
                    key={dimension.id}
                    className="space-y-3 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <IconComponent className="size-4 text-zinc-600 dark:text-zinc-400" />
                      </div>
                      <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {dimension.title}
                      </h4>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {dimension.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
