"use client";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import Cookies from "js-cookie";
import {
  CreditCardIcon,
  GlobeIcon,
  HistoryIcon,
  LogInIcon,
  LogOutIcon,
  MailIcon,
  Moon,
  Sun,
  User,
  UserIcon,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import HippyGhostAvatar from "./HippyGhostAvatar";
import { Button } from "./ui/button";

export default function UserMenu() {
  const { data: session } = useSession();
  const t = useTranslations("Components.GlobalHeader");
  const { setTheme } = useTheme();
  const router = useRouter();
  const [locale, setLocale] = useState<string>("zh-CN");

  const searchParams = useSearchParams();
  const [signinCallbackUrl, setSigninCallbackUrl] = useState<string>("/");

  useEffect(() => {
    // Read locale from cookie when component mounts
    const savedLocale = Cookies.get("locale") || "zh-CN";
    setLocale(savedLocale);
    // Get path and search parameters without the origin
    const pathWithParams = window.location.href.replace(window.location.origin, "");
    setSigninCallbackUrl(searchParams.get("callbackUrl") || pathWithParams || "/");
  }, [searchParams]);

  const toggleLocale = () => {
    const newLocale = locale === "zh-CN" ? "en-US" : "zh-CN";
    // Save to cookie
    Cookies.set("locale", newLocale, { expires: 365 });
    setLocale(newLocale);
    // Refresh the page to apply changes
    router.refresh();
  };

  const Menus = () => {
    return (
      <>
        <DropdownMenuItem asChild>
          <Link href="/pricing">
            <CreditCardIcon className="h-4 w-4 mr-2" />
            {t("pricing")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleLocale}>
          <GlobeIcon className="h-4 w-4 mr-2" />
          {locale === "zh-CN" ? "English" : "中文"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="h-4 w-4 mr-2" />
          {t("lightTheme")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="h-4 w-4 mr-2" />
          {t("darkTheme")}
        </DropdownMenuItem>
      </>
    );
  };

  const Account = () =>
    session?.user ? (
      <>
        <DropdownMenuItem>
          <MailIcon className="h-4 w-4 mr-2" />
          <span className="text-xs tracking-tight">{session.user.email}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account">
            <User className="h-4 w-4 mr-2" />
            <span>{t("viewAccount")}</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/studies">
            <HistoryIcon className="h-4 w-4 mr-2" />
            {t("myStudies")}
          </Link>
        </DropdownMenuItem>
      </>
    ) : null;

  const UserAvatar = ({ className, ...props }: React.ComponentProps<typeof Avatar>) =>
    session?.user ? (
      <Avatar className={cn("size-8 cursor-pointer rounded-none", className)} {...props}>
        {/* <AvatarImage src={""} /> */}
        {/* <AvatarFallback>{session.user.email.charAt(0)}</AvatarFallback> */}
        <HippyGhostAvatar seed={session.user.id} className="size-8" />
      </Avatar>
    ) : null;

  const AnonymousAvatar = ({ className, ...props }: React.ComponentProps<"button">) => (
    <Button
      variant="ghost"
      size="icon"
      className={cn("size-8 rounded-full bg-zinc-100 dark:bg-zinc-700", className)}
      {...props}
    >
      <UserIcon className="size-5" />
    </Button>
  );

  const Login = () => (
    <DropdownMenuItem asChild>
      <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(signinCallbackUrl)}`}>
        <LogInIcon className="h-4 w-4 mr-2" />
        {t("login")}
      </Link>
    </DropdownMenuItem>
  );

  const Logout = () => (
    <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
      <LogOutIcon className="h-4 w-4 mr-2" />
      {t("logout")}
    </DropdownMenuItem>
  );

  if (!session?.user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <AnonymousAvatar />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-36">
          <Login />
          <DropdownMenuSeparator />
          <Menus />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  } else {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <UserAvatar />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-36">
            <Account />
            <DropdownMenuSeparator />
            <Menus />
            <DropdownMenuSeparator />
            <Logout />
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    );
  }
}
