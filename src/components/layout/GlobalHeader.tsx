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
import { Separator } from "@/components/ui/separator";
import { IntercomLauncher } from "@/lib/analytics/intercom/launcher";
import { cn, formatTokensNumber } from "@/lib/utils";
import Cookies from "js-cookie";
import {
  ActivityIcon,
  ArrowLeftRightIcon,
  BookOpenIcon,
  BrainIcon,
  ChevronDownIcon,
  CoinsIcon,
  CreditCardIcon,
  GlobeIcon,
  HeadphonesIcon,
  HistoryIcon,
  InfinityIcon,
  LayoutPanelLeftIcon,
  LoaderIcon,
  LogInIcon,
  LogOutIcon,
  MicIcon,
  MoonIcon,
  SearchIcon,
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
  contained = false,
}: {
  className?: string;
  children?: React.ReactNode;
  drawerDirection?: "left" | "right";
  contained?: boolean;
}) {
  const { status: sessionStatus, data: session } = useSession();
  const t = useTranslations("Components.GlobalHeader");
  const searchParams = useSearchParams();
  const [signinCallbackUrl, setSigninCallbackUrl] = useState<string>("/");

  // Skip SSR for Drawer and Desktop menus to avoid hydration mismatch
  // (useSession, useTheme, SWR hooks return different values on server vs client)
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    const pathWithParams = window.location.href.replace(window.location.origin, "");
    setSigninCallbackUrl(searchParams.get("callbackUrl") || pathWithParams || "/");
  }, [searchParams]);

  return (
    <>
      <header
        data-product-tour="global-header"
        className={cn(
          "relative shrink-0 h-16 px-4 bg-background/80 backdrop-blur-sm border-b border-border",
          className,
        )}
      >
        <div
          className={cn(
            "h-full flex items-center justify-between gap-2",
            contained && "max-w-6xl mx-auto",
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
            {!children && isMounted && (
              <div className="hidden md:block">
                <GlobalHeaderMenusDesktop />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {children}
            {isMounted && session?.user && <TokenBalanceBadge />}
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
            {isMounted && <GlobalHeaderDrawer direction={drawerDirection} />}
          </div>
        </div>
      </header>
      <MaintenanceNotification />
    </>
  );
});

function TokenBalanceBadge() {
  const { balance } = useTokensBalance();

  if (balance === null) return null;

  return (
    <Link
      href="/account/tokens"
      className="flex items-center gap-1 px-2 py-1 rounded-sm text-xs hover:bg-accent transition-colors"
    >
      <CoinsIcon className="size-3 text-amber-500 shrink-0" />
      {balance === "Unlimited" ? (
        <InfinityIcon className="size-3" />
      ) : (
        <span className={cn("font-medium", balance <= 0 && "text-destructive")}>
          {formatTokensNumber(balance)}
        </span>
      )}
    </Link>
  );
}

// ─── Desktop Navigation ───

const PRODUCT_ITEMS = [
  { key: "marketResearch", descKey: "marketResearchDesc", href: "/newstudy", icon: SearchIcon },
  { key: "aiPanel", descKey: "aiPanelDesc", href: "/panel", icon: LayoutPanelLeftIcon },
  { key: "interviewProject", descKey: "interviewProjectDesc", href: "/interview", icon: MicIcon },
  { key: "personaImport", descKey: "personaImportDesc", href: "/persona", icon: Users2Icon },
  { key: "aiSage", descKey: "aiSageDesc", href: "/sage", icon: BrainIcon },
] as const;

const CONTENT_ITEMS = [
  { key: "insightRadio", href: "/insight-radio", icon: HeadphonesIcon },
  { key: "pulse", href: "/pulse", icon: ActivityIcon },
] as const;

const SOLUTION_ITEMS = [
  { key: "solutionsForCreators", href: "/creators" },
  { key: "solutionsForInfluencers", href: "/influencers" },
  { key: "solutionsForMarketers", href: "/marketers" },
  { key: "solutionsForProductManagers", href: "/product-managers" },
  { key: "solutionsForStartupOwners", href: "/startup-owners" },
  { key: "solutionsForConsultants", href: "/consultants" },
] as const;

const navTriggerClass =
  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-EuclidCircularA font-medium tracking-tight whitespace-nowrap outline-none hover:bg-accent transition-colors";

const menuItemClass =
  "flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent transition-colors [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const menuLabelClass = "px-2 py-1.5 text-xs text-muted-foreground font-semibold";

const menuSeparatorClass = "bg-border -mx-1 my-1 h-px";

function HoverMenu({
  trigger,
  children,
  className,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [tapped, setTapped] = useState(false);

  return (
    <div className="relative group/menu" onMouseLeave={() => setTapped(false)}>
      <button className={navTriggerClass} onClick={() => setTapped((prev) => !prev)}>
        {trigger}
      </button>
      <div
        className={cn(
          "invisible opacity-0 group-hover/menu:visible group-hover/menu:opacity-100 transition-all duration-150 absolute top-full left-0 pt-1 z-50",
          tapped && "!visible !opacity-100",
        )}
      >
        <div
          className={cn(
            "bg-popover text-popover-foreground border border-border rounded-md shadow-md p-1",
            className,
          )}
          onClick={() => setTapped(false)}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

const GlobalHeaderMenusDesktop = () => {
  const t = useTranslations("Components.GlobalHeader");

  return (
    <div className="flex items-center gap-1">
      {/* Products */}
      <HoverMenu
        className="w-80"
        trigger={
          <>
            {t("products")}
            <ChevronDownIcon className="size-3 transition-transform duration-200 group-hover/menu:rotate-180" />
          </>
        }
      >
        {/* The Researcher */}
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold font-EuclidCircularA tracking-wide">
          <span className="size-1.5 rounded-full bg-ghost-green shrink-0" />
          {t("theResearcher")}
        </div>
        {PRODUCT_ITEMS.slice(0, 3).map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={cn(menuItemClass, "items-start gap-3 py-2")}
          >
            <item.icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium">{t(item.key)}</div>
              <div className="text-xs text-muted-foreground">{t(item.descKey)}</div>
            </div>
          </Link>
        ))}

        <div className={menuSeparatorClass} />

        {/* The Simulator */}
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold font-EuclidCircularA tracking-wide">
          <span className="size-1.5 rounded-full bg-ghost-green shrink-0" />
          {t("theSimulator")}
        </div>
        {PRODUCT_ITEMS.slice(3).map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={cn(menuItemClass, "items-start gap-3 py-2")}
          >
            <item.icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium">{t(item.key)}</div>
              <div className="text-xs text-muted-foreground">{t(item.descKey)}</div>
            </div>
          </Link>
        ))}

        <div className={menuSeparatorClass} />

        {/* Content */}
        <div className={menuLabelClass}>{t("content")}</div>
        {CONTENT_ITEMS.map((item) => (
          <Link key={item.key} href={item.href} className={cn(menuItemClass, "gap-3")}>
            <item.icon className="size-4 text-muted-foreground shrink-0" />
            <span className="text-sm">{t(item.key)}</span>
          </Link>
        ))}
      </HoverMenu>

      {/* Solutions — desktop only */}
      <div className="hidden md:block">
        <HoverMenu
          className="w-52"
          trigger={
            <>
              {t("solutions")}
              <ChevronDownIcon className="size-3 transition-transform duration-200 group-hover/menu:rotate-180" />
            </>
          }
        >
          <Link href="/featured-studies" className={menuItemClass}>
            {t("featuredStudies")}
          </Link>
          <div className={menuSeparatorClass} />
          {SOLUTION_ITEMS.map((item) => (
            <Link key={item.key} href={item.href} className={menuItemClass}>
              {t(item.key)}
            </Link>
          ))}
        </HoverMenu>
      </div>

      {/* Pricing — desktop only */}
      <Link href="/pricing" prefetch={true} className={cn(navTriggerClass, "hidden md:flex")}>
        {t("pricing")}
      </Link>
    </div>
  );
};

// ─── Drawer (Mobile + Desktop) ───

const GlobalHeaderDrawer = React.memo(function GlobalHeaderDrawer({
  direction = "right",
}: {
  direction?: "left" | "right";
}) {
  const { status: sessionStatus, data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [workspaceExpanded, setWorkspaceExpanded] = useState(false);
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

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <div className="text-xs font-semibold text-muted-foreground px-3 mb-1.5 md:px-4 md:mb-2">
      {children}
    </div>
  );

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

          {/* My Workspace - Authenticated Only */}
          {isAuthenticated && (
            <>
              <div className="md:space-y-1 mb-3">
                <DrawerLink href="/account" icon={UserIcon}>
                  {t("account")}
                </DrawerLink>
                <DrawerLink href="/studies" icon={HistoryIcon}>
                  {t("myStudies")}
                </DrawerLink>
                <DrawerLink href="/interview/projects" icon={MicIcon}>
                  {t("myInterviews")}
                </DrawerLink>
                <DrawerLink href="/panels" icon={LayoutPanelLeftIcon}>
                  {t("myPanels")}
                </DrawerLink>
                <DrawerLink href="/personas" icon={Users2Icon}>
                  {t("myPersonas")}
                </DrawerLink>
                {workspaceExpanded && (
                  <DrawerLink href="/podcasts" icon={HeadphonesIcon}>
                    {t("myPodcasts")}
                  </DrawerLink>
                )}
                {!workspaceExpanded && (
                  <button
                    className="flex items-center py-2 px-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setWorkspaceExpanded(true)}
                  >
                    <ChevronDownIcon className="h-3 w-3 mr-2" />
                    {t("showMore")}
                  </button>
                )}
              </div>
              <Separator className="my-3" />
            </>
          )}

          {/* Product Navigation - Mobile Only */}
          <div className="md:hidden mb-3">
            {/* The Researcher */}
            <SectionLabel>{t("theResearcher")}</SectionLabel>
            <div className="mb-3">
              {PRODUCT_ITEMS.slice(0, 3).map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  prefetch={true}
                  className="flex items-start gap-3 py-2 px-3 hover:bg-accent rounded-md transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <item.icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">{t(item.key)}</div>
                    <div className="text-xs text-muted-foreground">{t(item.descKey)}</div>
                  </div>
                </Link>
              ))}
            </div>

            {/* The Simulator */}
            <SectionLabel>{t("theSimulator")}</SectionLabel>
            <div className="mb-3">
              {PRODUCT_ITEMS.slice(3).map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  prefetch={true}
                  className="flex items-start gap-3 py-2 px-3 hover:bg-accent rounded-md transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <item.icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">{t(item.key)}</div>
                    <div className="text-xs text-muted-foreground">{t(item.descKey)}</div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Content */}
            <SectionLabel>{t("content")}</SectionLabel>
            <div className="mb-3">
              <DrawerLink href="/insight-radio" icon={HeadphonesIcon}>
                {t("insightRadio")}
              </DrawerLink>
              <DrawerLink href="/pulse" icon={ActivityIcon}>
                {t("pulse")}
              </DrawerLink>
            </div>

            {/* Solutions + Pricing */}
            <SectionLabel>{t("solutions")}</SectionLabel>
            <div className="mb-3">
              <DrawerLink href="/featured-studies" icon={BookOpenIcon}>
                {t("featuredStudies")}
              </DrawerLink>
              <DrawerLink href="/pricing" icon={CreditCardIcon}>
                {t("pricing")}
              </DrawerLink>
              <button
                className="w-full flex items-center py-2 px-3 hover:bg-accent rounded-md transition-colors text-left"
                onClick={() => setSolutionsOpen(!solutionsOpen)}
              >
                <ChevronDownIcon
                  className={cn("h-4 w-4 mr-3 transition-transform", solutionsOpen && "rotate-180")}
                />
                <span className="text-sm">{t("solutions")}</span>
              </button>
              {solutionsOpen && (
                <div className="pl-7 space-y-1 mt-1">
                  {SOLUTION_ITEMS.map((item) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      className="block py-2 px-3 text-sm hover:bg-accent rounded-md transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      {t(item.key)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <Separator className="my-3" />
          </div>

          {/* Settings Section */}
          <SectionLabel>{t("settings")}</SectionLabel>
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
