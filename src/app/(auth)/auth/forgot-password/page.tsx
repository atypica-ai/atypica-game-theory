"use client";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { sendPasswordResetEmailAction } from "./actions";

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const t = useTranslations("Auth.ForgotPassword");
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await sendPasswordResetEmailAction(email);
      if (!result.success) {
        throw result;
      }
      setIsSubmitted(true);
      toast.success(t("resetEmailSent"));
    } catch (error) {
      // Don't show specific errors for security reasons to prevent email enumeration
      console.error("Error sending reset email:", (error as Error).message);
      // Still show success message even if the email doesn't exist
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FitToViewport className="flex items-center justify-center p-4">
      <div className="mx-auto w-full max-w-xs space-y-6 px-4 mb-10">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-gray-500">{t("description")}</p>
        </div>

        {isSubmitted ? (
          <div className="space-y-6">
            <div className="bg-green-50 p-4 rounded-md text-green-700">{t("successMessage")}</div>
            <div className="text-center">
              <Link
                href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="text-blue-500 hover:underline"
              >
                {t("backToSignIn")}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                id="email"
                placeholder={t("emailPlaceholder")}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button variant="outline" className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? t("submittingButton") : t("submitButton")}
            </Button>
            <div className="text-center text-sm">
              <Link
                href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="text-blue-500 hover:underline"
              >
                {t("backToSignIn")}
              </Link>
            </div>
          </form>
        )}
      </div>
    </FitToViewport>
  );
}
