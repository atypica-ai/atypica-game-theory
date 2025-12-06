"use client";
import { TeamSwitchButton } from "@/app/team/components/TeamSwitchButton";
import { useTeamStatus, useTeamSwitchableIdentities } from "@/app/team/hooks";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
  ArrowLeftRightIcon,
  CreditCardIcon,
  GlobeIcon,
  HeadphonesIcon,
  HistoryIcon,
  LogInIcon,
  LogOutIcon,
  MicIcon,
  MoonIcon,
  SunIcon,
  UserIcon,
  Users2Icon,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

/**
 * UserMenu is wrapped with React.memo to prevent re-renders when GlobalHeader doesn't change.
 * This ensures TeamSwitchButton's Dialog state is preserved across parent re-renders.
 *
 * ⚠️ memo 是浅比较组件的 props，副作用是如果参数不是 primitives or stable references，不会触发更新，但是这里没问题，因为没有参数
 */
export const LegacyUserMenu = React.memo(function UserMenu() {
  const { status: sessionStatus, data: session } = useSession();
  const [menuType, setMenuType] = useState<"user" | "anonymous" | null>(null);
  const t = useTranslations("Components.GlobalHeader");
  const { setTheme } = useTheme();
  const router = useRouter();
  const locale = useLocale();

  const searchParams = useSearchParams();
  const [signinCallbackUrl, setSigninCallbackUrl] = useState<string>("/");

  // Use SWR hook for team status - automatic caching and deduplication
  const { teamStatus } = useTeamStatus();

  // Preload switchable identities when user can switch
  // This ensures the data is ready when TeamSwitchButton dialog opens
  const shouldPreload = teamStatus?.canSwitchIdentity ?? false;
  useTeamSwitchableIdentities(shouldPreload);

  useEffect(() => {
    // Get path and search parameters without the origin
    const pathWithParams = window.location.href.replace(window.location.origin, "");
    setSigninCallbackUrl(searchParams.get("callbackUrl") || pathWithParams || "/");
  }, [searchParams]);

  // Update menu type based on session status
  useEffect(() => {
    if (sessionStatus === "loading") {
      setMenuType(null);
    } else if (session?.user) {
      setMenuType("user");
    } else {
      setMenuType("anonymous");
    }
  }, [sessionStatus, session?.user]);

  const toggleLocale = useCallback(() => {
    const newLocale = locale === "zh-CN" ? "en-US" : "zh-CN";
    // Save to cookie
    Cookies.set("locale", newLocale, { expires: 365 });
    // Refresh the page to apply changes
    router.refresh();
  }, [locale, router]);

  const Menus = () => {
    return (
      <>
        <DropdownMenuItem asChild>
          <Link href="/pricing" prefetch={true}>
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
          <SunIcon className="h-4 w-4 mr-2" />
          {t("lightTheme")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <MoonIcon className="h-4 w-4 mr-2" />
          {t("darkTheme")}
        </DropdownMenuItem>
      </>
    );
  };

  const Account = () =>
    menuType === "user" ? (
      <>
        <DropdownMenuItem className="flex-col items-start gap-1 py-2 max-w-64">
          {session?.userType === "TeamMember" && teamStatus?.teamName ? (
            <>
              <div className="flex items-center gap-2 w-full">
                <span className="text-sm font-semibold truncate w-full leading-tight">
                  {teamStatus.teamName}
                </span>
                {teamStatus.teamRole === "owner" && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary font-medium shrink-0 leading-none">
                    {t("owner")}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground truncate w-full leading-tight">
                {session?.user?.email || session?.user?.name}
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold truncate w-full leading-tight">
                {session?.user?.email || session?.user?.name}
              </span>
              <span className="text-xs text-muted-foreground truncate w-full leading-tight">
                {session?.userType === "Personal" ? t("personalUser") : "-"}
              </span>
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link prefetch={true} href="/account">
            <UserIcon className="h-4 w-4 mr-2" />
            <span>{t("viewAccount")}</span>
          </Link>
        </DropdownMenuItem>
        {teamStatus?.canSwitchIdentity && (
          <TeamSwitchButton>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <ArrowLeftRightIcon className="h-4 w-4 mr-2" />
              {t("switchIdentity")}
            </DropdownMenuItem>
          </TeamSwitchButton>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link prefetch={true} href="/studies">
            <HistoryIcon className="h-4 w-4 mr-2" />
            {t("myStudies")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link prefetch={true} href="/podcasts">
            <HeadphonesIcon className="h-4 w-4 mr-2" />
            {t("myPodcasts")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link prefetch={true} href="/personas">
            <Users2Icon className="h-4 w-4 mr-2" />
            {t("myPersonas")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link prefetch={true} href="/interview/projects">
            <MicIcon className="h-4 w-4 mr-2" />
            {t("myInterviews")}
          </Link>
        </DropdownMenuItem>
      </>
    ) : null;

  const UserAvatar = ({ className, ...props }: React.ComponentProps<typeof Avatar>) =>
    menuType === "user" ? (
      <Avatar className={cn("size-8 cursor-pointer rounded-none", className)} {...props}>
        {/* <AvatarImage src={""} /> */}
        {/* <AvatarFallback>{session.user.email.charAt(0)}</AvatarFallback> */}
        <HippyGhostAvatar seed={session?.user?.id} className="size-8" />
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

  if (menuType === "anonymous") {
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
  } else if (menuType === "user") {
    return (
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
    );
  }
});
