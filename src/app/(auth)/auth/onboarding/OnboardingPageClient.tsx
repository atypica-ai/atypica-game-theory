"use client";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics/segment";
import { UserOnboardingData } from "@/prisma/client";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { saveOnboardingData } from "./actions";

type Step = 1 | 2 | 3;

// Role options
const ROLE_OPTIONS = [
  { value: "product_manager", labelKey: "roleProductManager" },
  { value: "ux_researcher", labelKey: "roleUXResearcher" },
  { value: "founder", labelKey: "roleFounder" },
  { value: "student", labelKey: "roleStudent" },
  { value: "marketing", labelKey: "roleMarketing" },
  { value: "designer", labelKey: "roleDesigner" },
  { value: "engineer", labelKey: "roleEngineer" },
  { value: "consultant", labelKey: "roleConsultant" },
  { value: "other", labelKey: "roleOther" },
] as const;

// How did you hear options
const SOURCE_OPTIONS = [
  { value: "search", labelKey: "howDidYouHearSearch" },
  { value: "social_media", labelKey: "howDidYouHearSocial_media" },
  { value: "friend_colleague", labelKey: "howDidYouHearFriend_colleague" },
  { value: "blog_article", labelKey: "howDidYouHearBlog_article" },
  { value: "advertisement", labelKey: "howDidYouHearAdvertisement" },
  { value: "conference_event", labelKey: "howDidYouHearConference_event" },
  { value: "other", labelKey: "howDidYouHearOther" },
] as const;

export function OnboardingPageClient({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const t = useTranslations("Auth.Onboarding");

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [usageType, setUsageType] = useState<"work" | "personal" | "">("");
  const [role, setRole] = useState("");
  const [howDidYouHear, setHowDidYouHear] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Update URL with callbackUrl parameter without triggering navigation
    if (typeof window !== "undefined" && callbackUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("callbackUrl", callbackUrl);
      window.history.replaceState(null, "", url.toString());
    }
  }, [callbackUrl]);

  // Handle option selection with analytics tracking
  const handleUsageTypeSelect = useCallback(
    (value: "work" | "personal") => {
      setUsageType(value);
      // Track with current collected data
      trackEvent("Onboarding Step Updated", {
        usageType: value,
        role: role,
        howDidYouHear: howDidYouHear,
      });
      // Auto advance to next step after a short delay
      setTimeout(() => setCurrentStep(2), 300);
    },
    [role, howDidYouHear],
  );

  const handleRoleSelect = useCallback(
    (value: string) => {
      setRole(value);
      // Track with current collected data
      trackEvent("Onboarding Step Updated", {
        usageType: usageType as "work" | "personal",
        role: value,
        howDidYouHear: howDidYouHear,
      });
      setTimeout(() => setCurrentStep(3), 300);
    },
    [usageType, howDidYouHear],
  );

  const submitOnboarding = useCallback(
    async (source: string) => {
      if (!session?.user?.id) return;

      setIsLoading(true);

      try {
        const data: UserOnboardingData = {
          usageType: usageType as "work" | "personal",
          role: role,
          howDidYouHear: source,
        };

        trackEvent("Onboarding Completed", data);
        const result = await saveOnboardingData(data);

        if (!result.success) {
          throw new Error(result.message);
        }

        toast.success(t("successMessage"));
        router.push(callbackUrl);
      } catch (error) {
        toast.error((error as Error).message);
        setIsLoading(false);
      }
    },
    [usageType, role, callbackUrl, router, session?.user?.id, t],
  );

  const handleSourceSelect = useCallback(
    (value: string) => {
      setHowDidYouHear(value);
      // Track with current collected data
      trackEvent("Onboarding Step Updated", {
        usageType: usageType as "work" | "personal",
        role: role,
        howDidYouHear: value,
      });
      // Submit after selection
      setTimeout(() => submitOnboarding(value), 300);
    },
    [usageType, role, submitOnboarding],
  );

  return (
    <FitToViewport>
      <div className="container max-w-2xl mx-auto px-4 py-8 md:py-16 min-h-full flex flex-col justify-center">
        {/* Progress bar */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-xs text-muted-foreground font-medium">{currentStep} / 3</div>
          </div>
          <div className="h-0.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Question content with fade transition */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Step 1: Usage Type */}
          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" key="step1">
              <div className="text-center mb-8 md:mb-12">
                <h1 className="font-EuclidCircularA font-base text-2xl sm:text-4xl tracking-tight leading-[1.3]">
                  {t("step1Title")}
                </h1>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                <Button
                  onClick={() => handleUsageTypeSelect("work")}
                  disabled={isLoading}
                  variant="outline"
                  className="h-10 rounded-full hover:bg-primary/90 dark:hover:bg-primary/90 hover:text-primary-foreground"
                >
                  <span className="font-medium">{t("usageTypeWorkOption")}</span>
                </Button>

                <Button
                  onClick={() => handleUsageTypeSelect("personal")}
                  disabled={isLoading}
                  variant="outline"
                  className="h-10 rounded-full hover:bg-primary/90 dark:hover:bg-primary/90 hover:text-primary-foreground"
                >
                  <span className="font-medium">{t("usageTypePersonalOption")}</span>
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Role */}
          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" key="step2">
              <div className="text-center mb-8 md:mb-12">
                <h1 className="font-EuclidCircularA font-base text-2xl sm:text-4xl tracking-tight leading-[1.3]">
                  {t("step2Title")}
                </h1>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
                {ROLE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    onClick={() => handleRoleSelect(option.value)}
                    disabled={isLoading}
                    variant="outline"
                    className="h-10 py-3 hover:bg-primary/90 dark:hover:bg-primary/90 hover:text-primary-foreground"
                  >
                    {t(option.labelKey)}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: How did you hear */}
          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500" key="step3">
              <div className="text-center mb-8 md:mb-12">
                <h1 className="font-EuclidCircularA font-base text-2xl sm:text-4xl tracking-tight leading-[1.3]">
                  {t("step3Title")}
                </h1>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-2 gap-3 max-w-xl mx-auto">
                {SOURCE_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    onClick={() => handleSourceSelect(option.value)}
                    disabled={isLoading}
                    variant="outline"
                    className="h-10 py-3 hover:bg-primary/90 dark:hover:bg-primary/90 hover:text-primary-foreground"
                  >
                    {t(option.labelKey)}
                  </Button>
                ))}
              </div>

              {isLoading && (
                <div className="text-center mt-8">
                  <div className="inline-flex items-center gap-2 text-muted-foreground text-sm">
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{t("submittingButton")}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </FitToViewport>
  );
}
