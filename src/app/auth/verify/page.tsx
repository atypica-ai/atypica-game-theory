"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { resendVerificationCode, verifyCode } from "./actions";

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Auth.Verify");
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const email = searchParams.get("email") || "";
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      setError("");
      const result = await verifyCode({ email, code: verificationCode });
      if (!result.success) {
        throw new Error(result.message);
      }
      toast.success(t("successMessage"));
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    } catch (error) {
      setError((error as Error).message);
    }
    setIsLoading(false);
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      setError("");
      const result = await resendVerificationCode(email);
      if (!result.success) {
        throw new Error(result.message);
      }
      toast.success(t("codeResent"));
    } catch (error) {
      setError((error as Error).message);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="mx-auto w-full max-w-xs space-y-6 px-4 mb-40">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-gray-500 text-sm">{t("description", { email })}</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-500">{error}</div>}
          <div className="space-y-2">
            <Input
              id="verificationCode"
              placeholder={t("codePlaceholder")}
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
            />
          </div>
          <Button variant="outline" className="w-full" type="submit" disabled={isLoading}>
            {isLoading ? t("submittingButton") : t("submitButton")}
          </Button>
        </form>
        <div className="text-center text-sm">
          {t("noCodeText")}{" "}
          <Button
            variant="link"
            className="text-blue-500 p-0"
            onClick={handleResendCode}
            disabled={isLoading}
          >
            {t("resendButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}
