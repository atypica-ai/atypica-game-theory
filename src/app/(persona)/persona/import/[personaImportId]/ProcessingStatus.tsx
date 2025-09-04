"use client";
import { PersonaImportAnalysis } from "@/app/(persona)/types";
import { cn } from "@/lib/utils";
import { Persona } from "@/prisma/client";
import {
  BarChart3Icon,
  BotIcon,
  CheckCircleIcon,
  CircleIcon,
  FileTextIcon,
  Loader2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface ProcessingStatusProps {
  processing:
    | {
        parseAttachment: boolean;
        analyzeCompleteness: boolean;
        buildPersonaPrompt: boolean;
      }
    | false;
  personas?: Persona[];
  personaImportAnalysis?: Partial<PersonaImportAnalysis> | null;
  context?: string;
}

export function ProcessingStatus({
  processing,
  personas,
  personaImportAnalysis,
  context,
}: ProcessingStatusProps) {
  const t = useTranslations("PersonaImport.import");

  // Define the three steps
  const steps = [
    {
      key: "parseAttachment",
      icon: FileTextIcon,
      title: t("parseAttachment"),
      completed: processing ? processing.parseAttachment : false,
    },
    {
      key: "analyzeCompleteness",
      icon: BarChart3Icon,
      title: t("analyzeCompleteness"),
      completed: processing ? processing.analyzeCompleteness : false,
    },
    {
      key: "generatePersona",
      icon: BotIcon,
      title: t("generatePersona"),
      completed: processing ? processing.buildPersonaPrompt : Boolean(personas?.length),
    },
  ];

  // Determine which step is currently in progress
  const currentStepIndex = steps.findIndex((step) => !step.completed);
  const isProcessing = Boolean(processing);

  return (
    <div className="space-y-6">
      {/* Three Steps Progress */}
      <div className="relative py-4">
        <div className="flex items-start justify-between relative px-4">
          {steps.map((step, index) => {
            const isCompleted = step.completed;
            const isCurrentStep = isProcessing && index === currentStepIndex;

            // Get step-specific details
            let stepDetails = null;
            if (step.key === "parseAttachment") {
              // Show parsed text length from context field (during processing or after completion)
              const contextLength = context?.length || 0;
              if (contextLength > 0) {
                stepDetails = `${t("parsed")} ${contextLength.toLocaleString()} ${t("characters")}`;
              }
            } else if (step.key === "analyzeCompleteness" && personaImportAnalysis) {
              const analysis = personaImportAnalysis.analysis;
              const supplementaryQuestions = personaImportAnalysis.supplementaryQuestions;
              const details = [];

              if (analysis?.totalScore) {
                const completeness = Math.round((analysis.totalScore / (7 * 3)) * 100);
                details.push(`${t("completeness")} ${completeness}%`);
              }

              if (supplementaryQuestions?.questions?.length) {
                details.push(
                  `${t("generated")} ${supplementaryQuestions.questions.length} ${t("questionsCount")}`,
                );
              }

              if (details.length > 0) {
                stepDetails = details.join(`${t("comma")} `);
              }
            }

            return (
              <div key={step.key} className="flex flex-col items-center flex-1 relative">
                {/* Step Circle */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative z-10",
                    isCompleted && "bg-green-500 text-white",
                    isCurrentStep && !isCompleted && "bg-orange-500 text-white",
                    !isCompleted &&
                      !isCurrentStep &&
                      "bg-gray-100 text-gray-500 border border-gray-200",
                  )}
                >
                  {isCompleted ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : isCurrentStep ? (
                    <Loader2Icon className="w-4 h-4 animate-spin" />
                  ) : (
                    <CircleIcon className="w-4 h-4" />
                  )}
                </div>

                {/* Step Title */}
                <div
                  className={cn(
                    "mt-3 text-sm font-medium text-center px-1",
                    isCompleted || isCurrentStep ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.title}
                </div>

                {/* Step Details */}
                {stepDetails && (
                  <div className="mt-2 text-xs text-muted-foreground text-center px-2">
                    {stepDetails}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Connection Lines */}
        <div className="absolute top-9 left-0 right-0 flex items-center px-8">
          <div className="flex-1 flex">
            {steps.slice(0, -1).map((step, index) => {
              const isCompleted = step.completed;
              return (
                <div key={`line-${index}`} className="flex-1">
                  <div
                    className={cn(
                      "h-0.5 transition-all duration-300 mx-2",
                      isCompleted ? "bg-green-400" : "bg-gray-200",
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
