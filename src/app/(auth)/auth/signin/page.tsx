"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { signInWithEmail } from "./client";

export default function SignInPage() {
  return (
    <Suspense>
      <SignIn />
    </Suspense>
  );
}

function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("Auth.SignIn");
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isWechat, setIsWechat] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsWechat(window.navigator.userAgent.toLowerCase().includes("micromessenger"));
    }
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      // const result = await signIn("credentials", {
      //   email,
      //   password,
      //   redirect: false,
      // });
      await signInWithEmail({
        email,
        password,
      });
      // router.replace(callbackUrl);
      window.location.replace(callbackUrl);
    } catch (error) {
      const errMsg = (error as Error).message;
      if (errMsg === "EMAIL_NOT_VERIFIED") {
        router.push(`/auth/verify?email=${email}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
      } else if (["INVALID_CREDENTIALS", "USER_NOT_FOUND", "INVALID_PASSWORD"].includes(errMsg)) {
        setError(t("errorMessage"));
      } else {
        setError(errMsg);
      }
    } finally {
      setIsLoading(false);
    }
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
                onChange={(e) => setEmail(e.target.value)}
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
            <div className="text-right">
              <Link
                href={`/auth/forgot-password?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {t("forgotPassword")}
              </Link>
            </div>
            <Button
              variant="default"
              className="w-full h-10 font-medium"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? t("submittingButton") : t("submitButton")}
            </Button>
            {!isWechat && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      {t("orContinueWith")}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full h-10"
                  onClick={() => signIn("google", { callbackUrl })}
                  type="button"
                >
                  <Image src="/_public/icon-google.png" alt="Google" width={20} height={20} />
                  <span>{t("signInWithGoogle")}</span>
                </Button>
              </>
            )}
          </form>
          <div className="mt-6 text-center text-sm">
            {t("noAccountText")}{" "}
            <Link
              href={`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              {t("signUpLink")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
