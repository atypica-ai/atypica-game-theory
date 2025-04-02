"use client";
import { getUserPointsBalance } from "@/data/UserPoints";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import UserMenu from "./UserMenu";

export default function GlobalHeader() {
  const t = useTranslations("Components.GlobalHeader");
  const { data: session } = useSession();
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const checkBalance = useCallback(async () => {
    if (!session) {
      return;
    }
    setIsLoading(true);
    const result = await getUserPointsBalance();
    setBalance(result);
    setIsLoading(false);
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      timeoutId = setTimeout(poll, 5000);
      await checkBalance();
    };
    poll();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [session, checkBalance]);

  return (
    <header className="h-12 px-4 flex items-center justify-start gap-4 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center">
        <Link href="/" className="block h-4 w-32 relative">
          <div className="font-EuclidCircularA font-bold text-lg leading-none">atypica.LLM</div>
          {/* <Image
            src="/_public/atypica.llm.svg"
            alt="atypica.LLM Logo"
            fill
            priority
            className="object-contain hidden dark:block"
          /> */}
        </Link>
      </div>
      <div className="ml-auto" />
      {session && !isLoading ? (
        <div className="text-xs">{t("balance", { count: Math.floor(balance / 100) })}</div>
      ) : null}
      <div className="flex items-center gap-4">
        <UserMenu />
      </div>
    </header>
  );
}
