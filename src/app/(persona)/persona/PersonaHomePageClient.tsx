"use client";
import { createPersonaImport } from "@/app/(persona)/actions";
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
  MapPin,
  MessageCircle,
  Network,
  ShoppingCart,
  Smartphone,
  Target,
  Upload,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

interface PersonaImportClientProps {
  isUploadEnabled: boolean;
}

export default function PersonaImportClient({ isUploadEnabled }: PersonaImportClientProps) {
  const t = useTranslations("PersonaImport.personaImportClient");
  const router = useRouter();
  const { uploadedFiles, handleFileUploaded, clearFiles } = useFileUploadManager();
  const [isCreating, setIsCreating] = useState(false);

  const handleStartAnalysis = async () => {
    if (uploadedFiles.length === 0) {
      toast.error(t("uploadFileFirst"));
      return;
    }

    const file = uploadedFiles[0];
    if (!file.mimeType.includes("pdf")) {
      toast.error(t("uploadPDFOnly"));
      return;
    }

    setIsCreating(true);
    try {
      const result = await createPersonaImport({
        objectUrl: file.objectUrl,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
      });
      if (!result.success) throw result;
      const personaImport = result.data;
      router.push(`/persona/import/${personaImport.id}`);
    } catch (error) {
      console.error("Error creating persona import:", error);
      toast.error(t("createFailed"));
      setIsCreating(false);
    }
  };

  const features = [
    {
      id: "import",
      title: t("importInterview"),
      description: t("importDescription"),
      icon: Upload,
      details: [
        { icon: FileText, text: t("pdfConversion") },
        { icon: Target, text: t("analysisScoring") },
        { icon: MessageCircle, text: t("questionGeneration") },
      ],
    },
    {
      id: "followup",
      title: t("followUpInterviews"),
      description: t("followUpDescription"),
      icon: Target,
      details: [
        { icon: Lightbulb, text: t("smartQuestionGeneration") },
        { icon: Network, text: t("shareableLinks") },
        { icon: FileText, text: t("automatedDataCollection") },
      ],
    },
    {
      id: "chat",
      title: t("chatWithPersonas"),
      description: t("chatDescription"),
      icon: MessageCircle,
      details: [
        { icon: MessageCircle, text: t("naturalConversation") },
        { icon: Target, text: t("behaviorDriven") },
        { icon: Users, text: t("multiDimensional") },
      ],
    },
    {
      id: "research",
      title: t("researchWithPersonas"),
      description: t("researchDescription"),
      icon: BookOpen,
      details: [
        { icon: Target, text: t("marketResearch") },
        { icon: Users, text: t("userTesting") },
        { icon: FileText, text: t("behavioralAnalytics") },
      ],
    },
  ];

  const dimensions = [
    {
      id: "demographic",
      title: t("demographic"),
      description: t("demographicDescription"),
      icon: Users,
    },
    {
      id: "geographic",
      title: t("geographic"),
      description: t("geographicDescription"),
      icon: MapPin,
    },
    {
      id: "psychological",
      title: t("psychological"),
      description: t("psychologicalDescription"),
      icon: Brain,
    },
    {
      id: "behavioral",
      title: t("behavioralEconomics"),
      description: t("behavioralDescription"),
      icon: ShoppingCart,
    },
    {
      id: "needs",
      title: t("needsPainPoints"),
      description: t("needsDescription"),
      icon: Lightbulb,
    },
    {
      id: "tech",
      title: t("techAcceptance"),
      description: t("techDescription"),
      icon: Smartphone,
    },
    {
      id: "social",
      title: t("socialRelations"),
      description: t("socialDescription"),
      icon: Network,
    },
  ];

  const steps = [
    {
      id: "step1",
      title: t("step1"),
      description: t("step1Description"),
    },
    {
      id: "step2",
      title: t("step2"),
      description: t("step2Description"),
    },
    {
      id: "step3",
      title: t("step3"),
      description: t("step3Description"),
    },
    {
      id: "step4",
      title: t("step4"),
      description: t("step4Description"),
    },
    {
      id: "step5",
      title: t("step5"),
      description: t("step5Description"),
    },
  ];

  return (
    <div className="bg-white dark:bg-zinc-950">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-24 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="font-mono text-sm font-medium tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">
              {t("platformTitle")}
            </h1>
            <h2 className="font-sans text-4xl md:text-7xl font-normal tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
              {t("title")}
            </h2>
          </div>
          <p className="max-w-2xl mx-auto text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {t("subtitle")}
          </p>

          {/* Fixed button layout */}
          <div className="pt-4">
            <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
              {isUploadEnabled ? (
                uploadedFiles.length === 0 ? (
                  <>
                    <FileUploadButton
                      onFileUploadedAction={handleFileUploaded}
                      existingFiles={uploadedFiles}
                      showLimitsCheck={false}
                      disabled={isCreating}
                      className="w-full h-12 text-sm"
                    >
                      {t("uploadPDFFile")}
                    </FileUploadButton>
                    <Button size="lg" variant="outline" asChild className="w-full h-12">
                      <Link href="/personas">
                        {t("viewMyPersonas")}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </>
                ) : (
                  <div className="w-full space-y-4">
                    <div className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="size-5 text-zinc-600 dark:text-zinc-400" />
                          <div>
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {uploadedFiles[0].name}
                            </span>
                            <div className="text-xs text-zinc-500 dark:text-zinc-500">
                              {Math.round(uploadedFiles[0].size / 1024)} KB
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFiles}
                          disabled={isCreating}
                        >
                          {t("reSelectFile")}
                        </Button>
                      </div>
                    </div>
                    <Button
                      onClick={handleStartAnalysis}
                      disabled={isCreating}
                      size="lg"
                      className="w-full h-12"
                    >
                      {isCreating ? t("creating") : t("startAnalysis")}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button size="lg" variant="outline" asChild className="w-full h-12">
                      <Link href="/personas">
                        {t("viewMyPersonas")}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                )
              ) : (
                <>
                  <div className="w-full space-y-2">
                    <Button disabled size="lg" variant="outline" className="w-full h-12" asChild>
                      <Link href="/pricing" className="underline underline-offset-3">
                        {t("upgradeToMaxPlan")}
                      </Link>
                    </Button>
                  </div>
                  <Button size="lg" variant="outline" asChild className="w-full h-12">
                    <Link href="/personas">
                      {t("viewMyPersonas")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </>
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
                    index < 2 && "border-b",
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

      {/* Analysis Dimensions Section - Updated with 7 dimensions */}
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

      {/* Process Section */}
      <section className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-4 py-20 md:py-24">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="font-sans text-2xl md:text-4xl font-normal tracking-tight text-zinc-900 dark:text-zinc-100">
                {t("gettingStarted")}
              </h2>
              <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400">
                {t("gettingStartedDescription")}
              </p>
            </div>

            <div className="relative">
              {/* Center line */}
              <div
                className="absolute left-1/2 top-10 bottom-10 w-px bg-zinc-200 dark:bg-zinc-800 hidden md:block"
                aria-hidden="true"
              ></div>

              <div className="space-y-12 md:space-y-16">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="relative flex items-start md:items-center md:odd:flex-row-reverse group"
                  >
                    <div
                      className={cn(
                        "w-full md:w-1/2 pl-12 md:pl-0",
                        "md:group-odd:text-left md:group-odd:pl-16 md:group-even:text-right md:group-even:pr-16",
                      )}
                    >
                      <h3 className="text-base md:text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                        {step.title}
                      </h3>
                      <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                    <div className="absolute left-0 top-0 md:left-1/2 md:-translate-x-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-mono font-medium text-xs md:text-sm border-2 md:border-4 border-zinc-50 dark:border-zinc-950">
                      {(index + 1).toString().padStart(2, "0")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto px-4 py-20 md:py-24">
          <div className="max-w-2xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-2xl md:text-4xl font-normal tracking-tight text-zinc-900 dark:text-zinc-100">
                {t("ctaTitle")}
              </h2>
              <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {t("ctaDescription")}
              </p>
            </div>
            <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
              {isUploadEnabled ? (
                uploadedFiles.length === 0 ? (
                  <FileUploadButton
                    onFileUploadedAction={handleFileUploaded}
                    existingFiles={uploadedFiles}
                    showLimitsCheck={false}
                    disabled={isCreating}
                    className="w-full h-12 text-sm"
                  >
                    {t("uploadFirstInterview")}
                  </FileUploadButton>
                ) : (
                  <Button
                    onClick={handleStartAnalysis}
                    disabled={isCreating}
                    size="lg"
                    className="w-full h-12"
                  >
                    {isCreating ? t("creating") : t("startAnalysis")}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                )
              ) : (
                <Button disabled size="lg" variant="outline" className="w-full h-12">
                  <Link href="/pricing" className="underline underline-offset-3">
                    {t("upgradeToMaxPlan")}
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
