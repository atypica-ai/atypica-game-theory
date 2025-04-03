"use client";
import { StudyHistoryDrawer } from "@/components/HistoryDrawer";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createUserChat } from "@/data";
import Cookies from "js-cookie";
import {
  GlobeIcon,
  HistoryIcon,
  HomeIcon,
  LogInIcon,
  LogOutIcon,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import HippyGhostAvatar from "./HippyGhostAvatar";

export default function UserMenu() {
  const { data: session } = useSession();
  const t = useTranslations("Components.UserMenu");
  const { setTheme } = useTheme();
  const router = useRouter();
  const [locale, setLocale] = useState<string>("zh-CN");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Read locale from cookie when component mounts
    const savedLocale = Cookies.get("locale") || "zh-CN";
    setLocale(savedLocale);
  }, []);

  const toggleLocale = () => {
    const newLocale = locale === "zh-CN" ? "en-US" : "zh-CN";
    // Save to cookie
    Cookies.set("locale", newLocale, { expires: 365 });
    setLocale(newLocale);
    // Refresh the page to apply changes
    router.refresh();
  };

  const sayHello = useCallback(async () => {
    const chat = await createUserChat("study", {
      role: "user",
      content: "我是企业用户，想了解一下企业版",
    });
    window.location.href = `/study/?id=${chat.id}&hello=1`;
  }, []);

  const Menus = () => {
    return (
      <>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="h-4 w-4 mr-2" />
          {t("lightTheme")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="h-4 w-4 mr-2" />
          {t("darkTheme")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleLocale}>
          <GlobeIcon className="h-4 w-4 mr-2" />
          {locale === "zh-CN" ? "English" : "中文"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={sayHello}>
          <HomeIcon className="h-4 w-4 mr-2" />
          {t("enterprise")}
        </DropdownMenuItem>
      </>
    );
  };

  if (!session?.user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href="/auth/signin">
              <LogInIcon className="h-4 w-4 mr-2" />
              {t("login")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <Menus />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  } else {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="size-8 cursor-pointer">
              {/* <AvatarImage src={""} /> */}
              {/* <AvatarFallback>{session.user.email.charAt(0)}</AvatarFallback> */}
              <HippyGhostAvatar seed={session.user.id} className="size-8" />
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <User className="h-4 w-4 mr-2" />
              <span className="text-xs tracking-tight">{session.user.email}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setOpen(true)}>
              <HistoryIcon className="h-4 w-4 mr-2" />
              {t("history")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <Menus />
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
              <LogOutIcon className="h-4 w-4 mr-2" />
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <StudyHistoryDrawer open={open} onOpenChange={setOpen} trigger={false} direction="right" />
      </>
    );
  }
}
