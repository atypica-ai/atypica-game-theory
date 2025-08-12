"use client";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserOnboardingData } from "@/prisma/client";
import { SparklesIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { saveOnboardingData } from "./actions";

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const t = useTranslations("Auth.Onboarding");
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [usageType, setUsageType] = useState<"work" | "personal" | "">("");
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [howDidYouHear, setHowDidYouHear] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    // Validation - all fields except companyName are required
    if (!usageType || !role.trim() || !industry.trim() || !howDidYouHear.trim()) {
      setError(t("requiredFields"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const data: UserOnboardingData = {
        usageType: usageType as "work" | "personal",
        role: role.trim(),
        industry: industry.trim(),
        companyName: companyName.trim(),
        howDidYouHear: howDidYouHear.trim(),
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
      <div className="container max-w-3xl mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <SparklesIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-EuclidCircularA font-medium tracking-tight mb-2">
            {t("introTitle")}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("introDescription")}
          </p>
        </div>

        {/* Form */}
        <div className="bg-card rounded-2xl shadow-lg border overflow-hidden">
          <form onSubmit={onSubmit} className="p-6 md:p-8 space-y-6">
            {error && (
              <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
                {error}
              </div>
            )}

            {/* Usage Type */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                {t("usageTypeLabel")} <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={usageType}
                onValueChange={(value) => setUsageType(value as "work" | "personal")}
                className="grid grid-cols-1 md:grid-cols-2 gap-3"
              >
                <Label
                  htmlFor="onboarding-usage-work"
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/60 ${usageType === "work" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <RadioGroupItem value="work" id="onboarding-usage-work" />
                  <span className="font-medium">{t("usageTypeWorkOption")}</span>
                </Label>
                <Label
                  htmlFor="onboarding-usage-personal"
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary/60 ${usageType === "personal" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <RadioGroupItem value="personal" id="onboarding-usage-personal" />
                  <span className="font-medium">{t("usageTypePersonalOption")}</span>
                </Label>
              </RadioGroup>
            </div>

            {/* Role */}
            <div className="space-y-3">
              <Label htmlFor="role" className="text-base font-medium flex items-center gap-2">
                {t("roleLabel")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="role"
                placeholder={t("rolePlaceholder")}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            {/* Industry */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                {t("industryLabel")} <span className="text-red-500">*</span>
              </Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder={t("industryPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technology">{t("industryTechnology")}</SelectItem>
                  <SelectItem value="finance">{t("industryFinance")}</SelectItem>
                  <SelectItem value="healthcare">{t("industryHealthcare")}</SelectItem>
                  <SelectItem value="education">{t("industryEducation")}</SelectItem>
                  <SelectItem value="retail">{t("industryRetail")}</SelectItem>
                  <SelectItem value="manufacturing">{t("industryManufacturing")}</SelectItem>
                  <SelectItem value="consulting">{t("industryConsulting")}</SelectItem>
                  <SelectItem value="media">{t("industryMedia")}</SelectItem>
                  <SelectItem value="government">{t("industryGovernment")}</SelectItem>
                  <SelectItem value="nonprofit">{t("industryNonprofit")}</SelectItem>
                  <SelectItem value="other">{t("industryOther")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Company Name */}
            <div className="space-y-3">
              <Label htmlFor="companyName" className="text-base font-medium">
                {t("companyNameLabel")}
              </Label>
              <Input
                id="companyName"
                placeholder={t("companyNamePlaceholder")}
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="h-12 text-base"
              />
            </div>

            {/* How did you hear */}
            <div className="space-y-3">
              <Label className="text-base font-medium flex items-center gap-2">
                {t("howDidYouHearLabel")} <span className="text-red-500">*</span>
              </Label>
              <Select value={howDidYouHear} onValueChange={setHowDidYouHear}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder={t("howDidYouHearPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="search">{t("howDidYouHearSearch")}</SelectItem>
                  <SelectItem value="social_media">{t("howDidYouHearSocial_media")}</SelectItem>
                  <SelectItem value="friend_colleague">
                    {t("howDidYouHearFriend_colleague")}
                  </SelectItem>
                  <SelectItem value="blog_article">{t("howDidYouHearBlog_article")}</SelectItem>
                  <SelectItem value="advertisement">{t("howDidYouHearAdvertisement")}</SelectItem>
                  <SelectItem value="conference_event">
                    {t("howDidYouHearConference_event")}
                  </SelectItem>
                  <SelectItem value="other">{t("howDidYouHearOther")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Required fields note */}
            <div className="text-sm text-muted-foreground">{t("optionalFieldNote")}</div>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-medium"
              disabled={isLoading}
            >
              {isLoading ? t("submittingButton") : t("submitButton")}
            </Button>
          </form>
        </div>

        {/* Footer note */}
        <div className="text-center mt-6 text-sm text-muted-foreground">
          <span className="font-mono">atypica.ai</span> • AI-powered user research platform
        </div>
      </div>
    </FitToViewport>
  );
}
