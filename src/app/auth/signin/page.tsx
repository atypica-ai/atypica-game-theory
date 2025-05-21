"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { recordLastLogin } from "./actions";

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
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError("");
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!result?.error) {
        await recordLastLogin();
        // router.replace(callbackUrl);
        window.location.replace(callbackUrl);
      } else {
        if (result.error === "EMAIL_NOT_VERIFIED") {
          setError(result.error);
          router.push(`/auth/verify?email=${email}&callbackUrl=${encodeURIComponent(callbackUrl)}`);
        } else {
          setError(t("errorMessage"));
        }
      }
    } catch (error) {
      setError((error as Error).message);
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
            <div>
              <Input
                id="password"
                placeholder={t("passwordPlaceholder")}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10"
                required
              />
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

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t("orContinueWith")}</span>
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
