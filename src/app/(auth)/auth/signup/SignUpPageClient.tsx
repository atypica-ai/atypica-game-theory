"use client";
import { FitToViewport } from "@/components/layout/FitToViewport";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Shield, ShieldCheck, ShieldX } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signUp } from "./actions";

export function SignUpPageClient({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const t = useTranslations("Auth.SignUp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Password strength calculation
  const getPasswordStrength = (password: string) => {
    if (!password) return { level: 0, text: "", color: "" };

    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Character variety checks
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) {
      return { level: 1, text: t("passwordWeak"), color: "text-red-500", bgColor: "bg-red-500" };
    } else if (score <= 4) {
      return {
        level: 2,
        text: t("passwordMedium"),
        color: "text-yellow-500",
        bgColor: "bg-yellow-500",
      };
    } else {
      return {
        level: 3,
        text: t("passwordStrong"),
        color: "text-green-500",
        bgColor: "bg-green-500",
      };
    }
  };

  const passwordStrength = getPasswordStrength(password);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    if (passwordStrength.level < 2) {
      setError(t("passwordTooWeak"));
      return;
    }
    setIsLoading(true);
    try {
      setError("");
      const result = await signUp({
        email,
        password,
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
    <FitToViewport className="flex items-center justify-center p-4">
      <div className="mx-auto w-full max-w-80 space-y-6">
        <div className="space-y-2">
          <div className="text-2xl font-bold text-center">{t("title")}</div>
          <div className="text-muted-foreground text-sm text-center">{t("subtitle")}</div>
        </div>
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
              onChange={(e) => setEmail(e.target.value)}
              className="h-10"
              required
            />
          </div>
          <div className="space-y-2">
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

            {password && (
              <div className="space-y-2">
                {/* Password strength indicator */}
                <div className="flex items-center gap-2">
                  {passwordStrength.level === 1 && <ShieldX size={16} className="text-red-500" />}
                  {passwordStrength.level === 2 && <Shield size={16} className="text-yellow-500" />}
                  {passwordStrength.level === 3 && (
                    <ShieldCheck size={16} className="text-green-500" />
                  )}
                  <span className={`text-sm font-medium ${passwordStrength.color}`}>
                    {passwordStrength.text}
                  </span>
                </div>

                {/* Password strength bar */}
                <div className="flex gap-1">
                  <div
                    className={`h-1 w-1/3 rounded-full ${passwordStrength.level >= 1 ? passwordStrength.bgColor : "bg-gray-200"}`}
                  ></div>
                  <div
                    className={`h-1 w-1/3 rounded-full ${passwordStrength.level >= 2 ? passwordStrength.bgColor : "bg-gray-200"}`}
                  ></div>
                  <div
                    className={`h-1 w-1/3 rounded-full ${passwordStrength.level >= 3 ? passwordStrength.bgColor : "bg-gray-200"}`}
                  ></div>
                </div>

                {/* Password requirements */}
                <div className="text-xs text-gray-500 space-y-1">
                  <div className={password.length >= 8 ? "text-green-600" : "text-gray-400"}>
                    ✓ {t("passwordRequirement8Chars")}
                  </div>
                  <div className={/[A-Z]/.test(password) ? "text-green-600" : "text-gray-400"}>
                    ✓ {t("passwordRequirementUppercase")}
                  </div>
                  <div className={/[a-z]/.test(password) ? "text-green-600" : "text-gray-400"}>
                    ✓ {t("passwordRequirementLowercase")}
                  </div>
                  <div className={/[0-9]/.test(password) ? "text-green-600" : "text-gray-400"}>
                    ✓ {t("passwordRequirementNumber")}
                  </div>
                  <div
                    className={/[^A-Za-z0-9]/.test(password) ? "text-green-600" : "text-gray-400"}
                  >
                    ✓ {t("passwordRequirementSpecial")}
                  </div>
                </div>
              </div>
            )}
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

          <div className="text-xs text-left px-1 text-gray-600 dark:text-gray-400">
            {t("agreementText")}{" "}
            <Link
              href="/terms"
              className="text-blue-600 dark:text-blue-400 hover:underline"
              target="_blank"
            >
              {t("termsOfService")}
            </Link>{" "}
            {t("and")}{" "}
            <Link
              href="/privacy"
              className="text-blue-600 dark:text-blue-400 hover:underline"
              target="_blank"
            >
              {t("privacyPolicy")}
            </Link>
            .
          </div>

          <Button
            variant="default"
            className="w-full h-10 font-medium"
            type="submit"
            disabled={isLoading || passwordStrength.level < 2}
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
      </div>
    </FitToViewport>
  );
}
