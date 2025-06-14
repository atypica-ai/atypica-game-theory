"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signUp } from "./actions";

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Auth.SignUp");
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [invitationCode, setInvitationCode] = useState("");
  const [showInvitationField, setShowInvitationField] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check if the email requires an invitation code
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    // setShowInvitationField(!newEmail.endsWith("@tezign.com") && newEmail.includes("@"));
    // 始终不显示邀请码
    setShowInvitationField(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    setIsLoading(true);
    try {
      setError("");
      const result = await signUp({
        email,
        password,
        invitationCode: showInvitationField ? invitationCode : undefined,
      });
      if (!result.success) {
        throw result;
      }
      // Sign in automatically after successful registration
      // await signIn("credentials", {
      //   email,
      //   password,
      //   callbackUrl: "/",
      // });
      router.push(`/auth/verify?email=${email}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    } catch (error) {
      setError((error as Error).message);
    }
    setIsLoading(false);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">{t("title")}</CardTitle>
          <CardDescription className="text-center">{t("subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-500 dark:text-red-400 border border-red-200 dark:border-red-800">
                {error}
              </div>
            )}
            <div>
              <Input
                id="email"
                placeholder={t("emailPlaceholder")}
                type="email"
                value={email}
                onChange={handleEmailChange}
                className="h-10"
                required
              />
            </div>
            <div className="relative">
              <Input
                id="password"
                placeholder={t("passwordPlaceholder")}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className="relative">
              <Input
                id="confirmPassword"
                placeholder={t("confirmPasswordPlaceholder")}
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showConfirmPassword ? t("hidePassword") : t("showPassword")}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {showInvitationField && (
              <div className="space-y-1">
                <Input
                  id="invitationCode"
                  placeholder={t("invitationCodePlaceholder")}
                  type="text"
                  value={invitationCode}
                  onChange={(e) => setInvitationCode(e.target.value)}
                  className="h-10"
                  required={showInvitationField}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t("invitationCodeHelp")}
                </p>
              </div>
            )}
            <Button
              variant="default"
              className="w-full h-10 font-medium"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? t("submittingButton") : t("submitButton")}
            </Button>
          </form>
          <div className="mt-6 text-center text-sm">
            {t("haveAccountText")}{" "}
            <Link
              href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              {t("signInLink")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
