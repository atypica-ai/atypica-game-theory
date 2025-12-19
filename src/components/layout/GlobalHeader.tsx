"use client";
import { useTokensBalance } from "@/app/account/hooks";
import { TeamSwitchButton } from "@/app/team/components/TeamSwitchButton";
import { useTeamStatus, useTeamSwitchableIdentities } from "@/app/team/hooks";
import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import { MaintenanceNotification } from "@/components/MaintenanceNotification";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { IntercomLauncher } from "@/lib/analytics/intercom/launcher";
import { cn, formatTokensNumber } from "@/lib/utils";
import Cookies from "js-cookie";
import {
  ArrowLeftRightIcon,
  ChevronDownIcon,
  CoinsIcon,
  CreditCardIcon,
  GlobeIcon,
  HeadphonesIcon,
  HistoryIcon,
  InfinityIcon,
  LoaderIcon,
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

const MenuBarsIcon: React.FC<{
  className?: string;
}> = ({ className }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Top bar - longest */}
      <line x1="3" y1="6" x2="21" y2="6" />
      {/* Middle bar - medium */}
      <line x1="3" y1="12" x2="17" y2="12" />
      {/* Bottom bar - shortest */}
      <line x1="3" y1="18" x2="13" y2="18" />
    </svg>
  );
};

/**
 * GlobalHeader is wrapped with React.memo to prevent unnecessary re-renders
 * when parent components update due to unrelated state changes.
 *
 * This is critical for pages with frequent updates (e.g., ChatReplay with progressive messages),
 * where the entire page tree re-renders but GlobalHeader's props remain unchanged.
 * Without memo, all header components (GlobalHeaderDrawer, TeamSwitchButton)
 * would unmount and remount on every parent update, losing their internal state (like Dialog open state).
 *
 * ⚠️ memo 是浅比较组件的 props，副作用是如果参数不是 primitives or stable references，不会触发更新，但是这里没问题，string + ReactNode 是可以触发更新的
 */
const GlobalHeader = React.memo(function GlobalHeader({
  className,
  children,
  drawerDirection = "right",
}: {
  className?: string;
  children?: React.ReactNode;
  drawerDirection?: "left" | "right";
}) {
  const { status: sessionStatus, data: session } = useSession();
  const t = useTranslations("Components.GlobalHeader");
  const searchParams = useSearchParams();
  const [signinCallbackUrl, setSigninCallbackUrl] = useState<string>("/");

  useEffect(() => {
    const pathWithParams = window.location.href.replace(window.location.origin, "");
    setSigninCallbackUrl(searchParams.get("callbackUrl") || pathWithParams || "/");
  }, [searchParams]);

  return (
    <>
      <header
        className={cn(
          "relative shrink-0 h-16 px-4 flex items-center justify-between gap-2 bg-background/80 backdrop-blur-sm border-b border-border",
          className,
        )}
      >
        <div className="flex items-center gap-2 sm:gap-6">
          <Link
            prefetch={true}
            href="/"
            className={cn("block h-4 w-24 mb-0.5 relative")}
            title="logo"
          >
            <div className="font-EuclidCircularA font-medium tracking-tight text-xl leading-none">
              atypica.AI
            </div>
          </Link>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {children}
          {session?.user ? (
            <IntercomLauncher />
          ) : sessionStatus != "loading" ? (
            <Button
              variant="default"
              size="sm"
              className="h-8 px-4 scale-90 max-[360px]:hidden"
              asChild
            >
              <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(signinCallbackUrl)}`}>
                {t("getStarted")}
              </Link>
            </Button>
          ) : null}
          <GlobalHeaderDrawer direction={drawerDirection} />
        </div>
        {!children && (
          <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <GlobalHeaderMenusDesktop />
          </div>
        )}
      </header>
      <MaintenanceNotification />
    </>
  );
});

const MenuLink = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { children: React.ReactNode }) => (
  <Link
    prefetch={true}
    {...props}
    className={cn("p-1 text-sm font-normal hover:text-foreground/80 whitespace-nowrap", className)}
  >
    {children}
  </Link>
);

const GlobalHeaderMenusDesktop = () => {
  const t = useTranslations("Components.GlobalHeader");
  return (
    <div className="flex items-center gap-4 en:max-lg:gap-2">
      <MenuLink href="/insight-radio">{t("insightRadio")}</MenuLink>
      <MenuLink href="/featured-studies">{t("useCases")}</MenuLink>
      <MenuLink href="/newstudy">{t("marketResearch")}</MenuLink>
      <MenuLink href="/persona">{t("personaImport")}</MenuLink>
      <MenuLink href="/interview">{t("interviewProject")}</MenuLink>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1 p-1 text-sm font-normal hover:text-foreground/80 whitespace-nowrap outline-none">
          {t("solutions")}
          <ChevronDownIcon className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem asChild>
            <Link href="/creators" className="cursor-pointer">
              {t("solutionsForCreators")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
            {t("solutionsForInfluencers")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
            {t("solutionsForMarketers")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
            {t("solutionsForProductManagers")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
            {t("solutionsForStartupOwners")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled className="cursor-not-allowed opacity-50">
            {t("solutionsForConsultants")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <MenuLink href="/pricing">{t("pricing")}</MenuLink>
    </div>
  );
};

const GlobalHeaderDrawer = React.memo(function GlobalHeaderDrawer({
  direction = "right",
}: {
  direction?: "left" | "right";
}) {
  const { status: sessionStatus, data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const t = useTranslations("Components.GlobalHeader");
  const { setTheme } = useTheme();
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [signinCallbackUrl, setSigninCallbackUrl] = useState<string>("/");

  // Team status
  const { teamStatus } = useTeamStatus();
  const shouldPreload = teamStatus?.canSwitchIdentity ?? false;
  useTeamSwitchableIdentities(shouldPreload);

  // Token balance - using SWR hook
  const { balance } = useTokensBalance();

  useEffect(() => {
    const pathWithParams = window.location.href.replace(window.location.origin, "");
    setSigninCallbackUrl(searchParams.get("callbackUrl") || pathWithParams || "/");
  }, [searchParams]);

  const toggleLocale = useCallback(() => {
    const newLocale = locale === "zh-CN" ? "en-US" : "zh-CN";
    Cookies.set("locale", newLocale, { expires: 365 });
    router.refresh();
  }, [locale, router]);

  const isAuthenticated = sessionStatus === "authenticated" && session?.user;

  const DrawerLink = ({
    href,
    icon: Icon,
    children,
    onClick,
  }: {
    href?: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
    onClick?: () => void;
  }) => {
    const content = (
      <>
        <Icon className="h-4 w-4 mr-3" />
        <span className="text-sm">{children}</span>
      </>
    );

    if (href) {
      return (
        <Link
          href={href}
          prefetch={true}
          className="flex items-center py-2 px-3 md:py-2.5 md:px-4 hover:bg-accent rounded-md transition-colors"
          onClick={() => setOpen(false)}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        className="w-full flex items-center py-2 px-3 md:py-2.5 md:px-4 hover:bg-accent rounded-md transition-colors text-left"
        onClick={() => {
          onClick?.();
          setOpen(false);
        }}
      >
        {content}
      </button>
    );
  };

  return (
    <Drawer direction={direction} open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          className="size-9 bg-transparent hover:bg-transparent dark:hover:bg-transparent"
        >
          <MenuBarsIcon className="size-6" />
        </Button>
      </DrawerTrigger>
      <DialogHeader className="hidden">
        <DialogTitle></DialogTitle>
      </DialogHeader>
      <DrawerContent
        className={cn("w-[320px] h-full", direction === "right" ? "mr-0 ml-auto" : "ml-0 mr-auto")}
      >
        <div className="flex-1 overflow-y-auto px-3 py-3 md:px-4 md:py-4">
          {sessionStatus === "loading" ? (
            // Loading state - placeholder
            <div className="h-32 flex items-center justify-center">
              <LoaderIcon className="h-6 w-6 text-muted-foreground animate-spin" />
            </div>
          ) : isAuthenticated ? (
            <>
              {/* User Info Section */}
              <div className={cn("flex items-start gap-3 p-3 md:p-4", "bg-accent/50 rounded-lg")}>
                <Avatar className="size-10 rounded-none shrink-0">
                  <HippyGhostAvatar seed={session?.user?.id} className="size-10" />
                </Avatar>
                <div className="flex-1 min-w-0">
                  {session?.userType === "TeamMember" && teamStatus?.teamName ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold truncate">
                          {teamStatus.teamName}
                        </span>
                        {teamStatus.teamRole === "owner" && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary font-medium shrink-0">
                            {t("owner")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-1">
                        {session?.user?.email || session?.user?.name}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm font-semibold truncate">
                        {session?.user?.email || session?.user?.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {session?.userType === "Personal" ? t("personalUser") : "-"}
                      </div>
                    </>
                  )}
                  {/* Switch Team */}
                  {teamStatus?.canSwitchIdentity && (
                    <div className="mt-2">
                      <TeamSwitchButton>
                        <button className="text-xs hover:underline flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                          <ArrowLeftRightIcon className="h-3 w-3" />
                          <span>{t("switchIdentity")}</span>
                        </button>
                      </TeamSwitchButton>
                    </div>
                  )}
                </div>
              </div>

              <Separator className="my-3" />

              {/* Token Balance Section */}
              <div className="flex items-center justify-between pl-3 md:pl-4">
                <Link
                  href="/account/tokens"
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                >
                  <CoinsIcon className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  {balance === null ? (
                    <LoaderIcon className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
                  ) : (
                    <div className="text-xs font-medium">
                      {balance === "Unlimited" ? (
                        <span className="flex items-center gap-1">
                          <InfinityIcon className="size-3.5" />
                          <span>{t("unlimited")}</span>
                        </span>
                      ) : (
                        formatTokensNumber(balance)
                      )}
                    </div>
                  )}
                </Link>
                <Link
                  href="/pricing"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5 shrink-0"
                >
                  <span>{t("buyTokens")}</span>
                  <span>›</span>
                </Link>
              </div>
            </>
          ) : (
            // Unauthenticated state - login prompt
            <div className="flex flex-col items-center justify-center py-6 px-2">
              <div className="text-sm text-muted-foreground mb-4 text-center">
                {t("loginPrompt")}
              </div>
              <Link
                href={`/auth/signin?callbackUrl=${encodeURIComponent(signinCallbackUrl)}`}
                className="w-full"
              >
                <Button variant="default" className="w-full">
                  <LogInIcon className="h-4 w-4 mr-2" />
                  {t("login")}
                </Button>
              </Link>
            </div>
          )}
          <Separator className="my-3" />

          {/* User Content Section - Authenticated Only */}
          {isAuthenticated && (
            <>
              <div className="text-xs font-semibold text-muted-foreground px-3 mb-1.5 md:px-4 md:mb-2">
                {t("myContent")}
              </div>
              <div className="md:space-y-1 mb-3">
                <DrawerLink href="/account" icon={UserIcon}>
                  {t("viewAccount")}
                </DrawerLink>
                <DrawerLink href="/studies" icon={HistoryIcon}>
                  {t("myStudies")}
                </DrawerLink>
                <DrawerLink href="/podcasts" icon={HeadphonesIcon}>
                  {t("myPodcasts")}
                </DrawerLink>
                <DrawerLink href="/personas" icon={Users2Icon}>
                  {t("myPersonas")}
                </DrawerLink>
                <DrawerLink href="/interview/projects" icon={MicIcon}>
                  {t("myInterviews")}
                </DrawerLink>
              </div>
              <Separator className="my-3" />
            </>
          )}

          {/* Navigation Menu - Mobile Only */}
          <div className="md:hidden mb-3">
            <div className="text-xs font-semibold text-muted-foreground px-3 mb-1.5 md:px-4 md:mb-2">
              {t("navigation")}
            </div>
            <div className="md:space-y-1">
              {/*<DrawerLink href="/" icon={HomeIcon}>
                {t("home")}
              </DrawerLink>*/}
              <DrawerLink href="/insight-radio" icon={HeadphonesIcon}>
                {t("insightRadio")}
              </DrawerLink>
              <DrawerLink href="/featured-studies" icon={HistoryIcon}>
                {t("useCases")}
              </DrawerLink>
              <DrawerLink href="/newstudy" icon={HistoryIcon}>
                {t("marketResearch")}
              </DrawerLink>
              <DrawerLink href="/persona" icon={Users2Icon}>
                {t("personaImport")}
              </DrawerLink>
              <DrawerLink href="/interview" icon={MicIcon}>
                {t("interviewProject")}
              </DrawerLink>
              {/* Solutions expandable menu */}
              <div>
                <button
                  className="w-full flex items-center py-2 px-3 md:py-2.5 md:px-4 hover:bg-accent rounded-md transition-colors text-left"
                  onClick={() => setSolutionsOpen(!solutionsOpen)}
                >
                  <ChevronDownIcon
                    className={cn(
                      "h-4 w-4 mr-3 transition-transform",
                      solutionsOpen && "rotate-180",
                    )}
                  />
                  <span className="text-sm">{t("solutions")}</span>
                </button>
                {solutionsOpen && (
                  <div className="pl-7 space-y-1 mt-1">
                    <Link
                      href="/creators"
                      className="block py-2 px-3 text-sm hover:bg-accent rounded-md transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      {t("solutionsForCreators")}
                    </Link>
                    <div className="block py-2 px-3 text-sm opacity-50 cursor-not-allowed">
                      {t("solutionsForInfluencers")}
                    </div>
                    <div className="block py-2 px-3 text-sm opacity-50 cursor-not-allowed">
                      {t("solutionsForMarketers")}
                    </div>
                    <div className="block py-2 px-3 text-sm opacity-50 cursor-not-allowed">
                      {t("solutionsForProductManagers")}
                    </div>
                    <div className="block py-2 px-3 text-sm opacity-50 cursor-not-allowed">
                      {t("solutionsForStartupOwners")}
                    </div>
                    <div className="block py-2 px-3 text-sm opacity-50 cursor-not-allowed">
                      {t("solutionsForConsultants")}
                    </div>
                  </div>
                )}
              </div>
              <DrawerLink href="/pricing" icon={CreditCardIcon}>
                {t("pricing")}
              </DrawerLink>
            </div>
            <Separator className="my-3" />
          </div>

          {/* Settings Section */}
          <div className="text-xs font-semibold text-muted-foreground px-3 mb-1.5 md:px-4 md:mb-2">
            {t("settings")}
          </div>
          <div className="md:space-y-1">
            <DrawerLink icon={GlobeIcon} onClick={toggleLocale}>
              {locale === "zh-CN" ? "English" : "中文"}
            </DrawerLink>
            <DrawerLink icon={SunIcon} onClick={() => setTheme("light")}>
              {t("lightTheme")}
            </DrawerLink>
            <DrawerLink icon={MoonIcon} onClick={() => setTheme("dark")}>
              {t("darkTheme")}
            </DrawerLink>
            {isAuthenticated && (
              <>
                <Separator className="my-2" />
                <DrawerLink icon={LogOutIcon} onClick={() => signOut({ callbackUrl: "/" })}>
                  {t("logout")}
                </DrawerLink>
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
});

export default GlobalHeader;
