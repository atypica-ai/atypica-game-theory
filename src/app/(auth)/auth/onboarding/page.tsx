"use client";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, BrainIcon, MessageCircleIcon, SparklesIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { OnboardingData, saveOnboardingData } from "./actions";

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const t = useTranslations("Auth.Onboarding");
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [step, setStep] = useState(1);
  const [usageType, setUsageType] = useState<"work" | "personal" | null>(null);

  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [howDidYouHear, setHowDidYouHear] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUsageTypeSelect = (type: "work" | "personal") => {
    setUsageType(type);
    setStep(2);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id || !usageType) return;

    // Validation
    if (usageType === "work" && (!role.trim() || !industry.trim() || !howDidYouHear.trim())) {
      setError(t("requiredFields"));
      return;
    }
    if (usageType === "personal" && (!role.trim() || !howDidYouHear.trim())) {
      setError(t("requiredFields"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const data: OnboardingData = {
        usageType,
        role: role.trim(),
        howDidYouHear: howDidYouHear.trim(),
        ...(usageType === "work" && {
          industry: industry.trim(),
          companyName: companyName.trim(),
        }),
      };

      const result = await saveOnboardingData(data);

      if (!result.success) {
        throw new Error(result.message);
      }

      toast.success(t("successMessage"));
      router.push(callbackUrl);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FitToViewport>
      <div className="container max-w-6xl mx-auto px-4 lg:px-16 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          {/* Mobile: Introduction Second, Desktop: Introduction Left */}
          <div className="order-2 lg:order-1 space-y-8">
            <div className="space-y-6">
              <h1 className="font-sans text-3xl md:text-5xl font-normal tracking-tight leading-tight">
                {t("welcomeTitle")} <br />
                <span className="font-mono">atypica.ai</span>
              </h1>

              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
                {t("welcomeDescription")}
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="border">
              <div className="grid grid-cols-1 divide-y">
                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <SparklesIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">{t("featureAiPersonasTitle")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("featureAiPersonasDescription")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <MessageCircleIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">{t("featureInterviewerAiTitle")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("featureInterviewerAiDescription")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <BrainIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">{t("featureInsightsTitle")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("featureInsightsDescription")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile: Form First, Desktop: Form Right */}
          <div className="order-1 lg:order-2">
            <div className="space-y-6">
              {/* Step 1: Usage Type */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h2 className="text-xl md:text-2xl font-medium">{t("usageTypeTitle")}</h2>
                    <p className="text-base text-muted-foreground">{t("usageTypeSubtitle")}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleUsageTypeSelect("work")}
                      className="text-left p-6 border rounded-lg hover:border-foreground/50 transition-colors"
                    >
                      <h3 className="font-medium mb-1">{t("usageTypeWorkTitle")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("usageTypeWorkDescription")}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUsageTypeSelect("personal")}
                      className="text-left p-6 border rounded-lg hover:border-foreground/50 transition-colors"
                    >
                      <h3 className="font-medium mb-1">{t("usageTypePersonalTitle")}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t("usageTypePersonalDescription")}
                      </p>
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Details */}
              {step === 2 && (
                <div>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl md:text-2xl font-medium">{t("detailsTitle")}</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStep(1)}
                        className="text-muted-foreground"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        {t("backButton")}
                      </Button>
                    </div>
                    <p className="text-base text-muted-foreground">{t("detailsSubtitle")}</p>
                  </div>
                  <form onSubmit={onSubmit}>
                    {error && (
                      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-500 dark:text-red-400 border border-red-200 dark:border-red-800 mb-6">
                        {error}
                      </div>
                    )}
                    <div className="border divide-y">
                      {/* Your Role */}
                      <div className="p-6">
                        <h3 className="font-medium mb-4">{t("roleLabel")} *</h3>
                        <Input
                          id="role"
                          placeholder={t("rolePlaceholder")}
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                        />
                      </div>

                      {/* Industry (work only) */}
                      {usageType === "work" && (
                        <div className="p-6">
                          <h3 className="font-medium mb-4">{t("industryLabel")} *</h3>
                          <Select value={industry} onValueChange={setIndustry}>
                            <SelectTrigger>
                              <SelectValue placeholder={t("industryPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="technology">{t("industryTechnology")}</SelectItem>
                              <SelectItem value="finance">{t("industryFinance")}</SelectItem>
                              <SelectItem value="healthcare">{t("industryHealthcare")}</SelectItem>
                              <SelectItem value="education">{t("industryEducation")}</SelectItem>
                              <SelectItem value="retail">{t("industryRetail")}</SelectItem>
                              <SelectItem value="manufacturing">
                                {t("industryManufacturing")}
                              </SelectItem>
                              <SelectItem value="consulting">{t("industryConsulting")}</SelectItem>
                              <SelectItem value="media">{t("industryMedia")}</SelectItem>
                              <SelectItem value="government">{t("industryGovernment")}</SelectItem>
                              <SelectItem value="nonprofit">{t("industryNonprofit")}</SelectItem>
                              <SelectItem value="other">{t("industryOther")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Company Name (work only, optional) */}
                      {usageType === "work" && (
                        <div className="p-6">
                          <h3 className="font-medium mb-4">{t("companyNameLabel")}</h3>
                          <Input
                            id="companyName"
                            placeholder={t("companyNamePlaceholder")}
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                          />
                        </div>
                      )}

                      {/* How did you hear about us */}
                      <div className="p-6">
                        <h3 className="font-medium mb-4">{t("howDidYouHearLabel")} *</h3>
                        <Select value={howDidYouHear} onValueChange={setHowDidYouHear}>
                          <SelectTrigger>
                            <SelectValue placeholder={t("howDidYouHearPlaceholder")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="search">{t("howDidYouHearSearch")}</SelectItem>
                            <SelectItem value="social_media">
                              {t("howDidYouHearSocial_media")}
                            </SelectItem>
                            <SelectItem value="friend_colleague">
                              {t("howDidYouHearFriend_colleague")}
                            </SelectItem>
                            <SelectItem value="blog_article">
                              {t("howDidYouHearBlog_article")}
                            </SelectItem>
                            <SelectItem value="advertisement">
                              {t("howDidYouHearAdvertisement")}
                            </SelectItem>
                            <SelectItem value="conference_event">
                              {t("howDidYouHearConference_event")}
                            </SelectItem>
                            <SelectItem value="other">{t("howDidYouHearOther")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 font-medium mt-6"
                      disabled={isLoading}
                    >
                      {isLoading ? t("submittingButton") : t("submitButton")}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </FitToViewport>
  );
}
