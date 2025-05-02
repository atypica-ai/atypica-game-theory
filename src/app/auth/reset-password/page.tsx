"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { resetPassword } from "./actions";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Auth.ResetPassword");
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    setIsLoading(true);
    try {
      const result = await resetPassword({ token, password });
      if (!result.success) {
        throw result;
      }
      setIsSuccess(true);
      toast.success(t("successMessage"));
      // Redirect to sign in after a short delay
      setTimeout(() => {
        router.push("/auth/signin");
      }, 2000);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // If no token is provided, show error
  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="mx-auto w-full max-w-xs space-y-6 px-4 mb-10">
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-500">
            {t("invalidOrExpiredToken")}
          </div>
          <div className="text-center">
            <Link href="/auth/signin" className="text-blue-500 hover:underline">
              {t("backToSignIn")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="mx-auto w-full max-w-xs space-y-6 px-4 mb-40">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-gray-500">{t("description")}</p>
        </div>
        {isSuccess ? (
          <div className="bg-green-50 p-4 rounded-md text-green-700">{t("successMessage")}</div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-500">{error}</div>}
            <div className="space-y-2">
              <Input
                id="password"
                placeholder={t("passwordPlaceholder")}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Input
                id="confirmPassword"
                placeholder={t("confirmPasswordPlaceholder")}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button variant="outline" className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? t("submittingButton") : t("submitButton")}
            </Button>
          </form>
        )}
        <div className="text-center text-sm">
          <Link href="/auth/signin" className="text-blue-500 hover:underline">
            {t("backToSignIn")}
          </Link>
        </div>
      </div>
    </div>
  );
}
