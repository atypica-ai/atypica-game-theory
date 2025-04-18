"use client";
import { getUserTokensBalance } from "@/data/UserTokens";
import { cn } from "@/lib/utils";
import { CoinsIcon, LoaderIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

export default function UserTokensBalance() {
  const t = useTranslations("Components.UserTokensBalance");

  const { status, data: session } = useSession();
  const [balance, setBalance] = useState<number | null>(null);

  const checkBalance = useCallback(async () => {
    if (!session) {
      return;
    }
    const result = await getUserTokensBalance();
    if (result.success) {
      setBalance(result.data);
    }
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

  return status === "authenticated" ? (
    <div
      className="relative flex items-center gap-1.5 h-7 py-1.5 rounded-full border border-border min-w-[60px] justify-center group"
      title={balance !== null ? t("balance", { count: Math.floor(balance) }) : ""}
    >
      <CoinsIcon className="h-3.5 w-3.5 text-amber-500" />
      {balance === null ? (
        <LoaderIcon className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
      ) : (
        <div className="text-xs font-medium">{Math.floor(balance / 100)}</div>
      )}
      <div
        className={cn(
          "absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200",
          "bg-popover text-popover-foreground px-3 py-2 rounded-md text-xs -bottom-9 whitespace-nowrap",
          "shadow-md pointer-events-none",
        )}
      >
        {balance !== null ? t("balance", { count: Math.floor(balance / 100) }) : "loading..."}
      </div>
    </div>
  ) : null;
}
