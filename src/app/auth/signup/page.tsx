"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    setIsLoading(true);
    try {
      setError("");
      await signUp({
        email,
        password,
        invitationCode: showInvitationField ? invitationCode : undefined,
      });
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
    <div className="flex-1 flex items-center justify-center">
      <div className="mx-auto w-full max-w-xs space-y-6 px-4 mb-40">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-gray-500">{t("subtitle")}</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-4 text-sm text-red-500">{error}</div>}
          <div className="space-y-2">
            <Input
              id="email"
              placeholder={t("emailPlaceholder")}
              type="email"
              value={email}
              onChange={handleEmailChange}
              required
            />
          </div>
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
          {showInvitationField && (
            <div className="space-y-2">
              <Input
                id="invitationCode"
                placeholder={t("invitationCodePlaceholder")}
                type="text"
                value={invitationCode}
                onChange={(e) => setInvitationCode(e.target.value)}
                required={showInvitationField}
              />
              <p className="text-xs text-gray-500">{t("invitationCodeHelp")}</p>
            </div>
          )}
          <Button variant="outline" className="w-full" type="submit" disabled={isLoading}>
            {isLoading ? t("submittingButton") : t("submitButton")}
          </Button>
        </form>
        <div className="text-center text-sm">
          {t("haveAccountText")}{" "}
          <Link
            href={`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            className="text-blue-500 hover:underline"
          >
            {t("signInLink")}
          </Link>
        </div>
      </div>
    </div>
  );
}
