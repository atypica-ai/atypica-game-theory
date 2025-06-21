"use client";
import { getUserTokensBalance } from "@/app/(account)/account/actions";
import { useDocumentVisibility } from "@/hooks/use-document-visibility";
import { formatTokensNumber } from "@/lib/utils";
import { CoinsIcon, LoaderIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

export const UserTokensBalanceStore = create<{
  balance: number | null;
  setBalance: (balance: number) => void;
  getBalance: () => number | null;
}>((set, get) => ({
  balance: null,
  setBalance: (balance: number) => {
    set({ balance });
  },
  getBalance: () => {
    return get().balance;
  },
}));

export default function UserTokensBalance() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("Components.UserTokensBalance");
  const { status, data: session } = useSession();
  const { setBalance, balance } = UserTokensBalanceStore();

  const { isDocumentVisible } = useDocumentVisibility();
  useEffect(() => {
    if (!session || !isDocumentVisible) {
      return;
    }
    let timeoutId: NodeJS.Timeout;
    const poll = async () => {
      if (!isDocumentVisible) {
        timeoutId = setTimeout(poll, 10000);
        return;
      }
      timeoutId = setTimeout(poll, 5000); // 要放在前面，不然下面 return () 的时候如果 getUserTokensBalance 还没完成就不会 clearTimeout 了
      const result = await getUserTokensBalance();
      if (result.success) {
        setBalance(result.data);
      }
    };
    poll(); // 如果 visible 从 false 变成 true，这里会立即执行，没问题
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [session, setBalance, isDocumentVisible]);

  return status === "authenticated" ? (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          className="relative flex items-center gap-1.5 h-7 py-1.5 px-2 rounded-full border border-border min-w-[60px] justify-center"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <CoinsIcon className="h-3.5 w-3.5 text-amber-500" />
          {balance === null ? (
            <LoaderIcon className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
          ) : (
            <div className="text-xs font-medium cursor-default">{formatTokensNumber(balance)}</div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-fit p-3 relative"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <div className="absolute -z-10 -top-2 -right-2 -bottom-2 -left-2">
          {/*将空隙遮住，防止鼠标移动到 trigger 和 content 空隙触发 onMouseLeave*/}
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-xs">
            {balance !== null ? t("balance", { balance: balance.toLocaleString() }) : "loading..."}
          </div>
          <div className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1.5 font-medium">
            <CoinsIcon className="h-3 w-3" />
            <Link href="/account">{t("viewHistory")}</Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ) : null;
}
