"use client";

import {
  generateUserSwitchTokenAction,
  getUserSwitchableIdentitiesAction,
} from "@/app/team/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExtractServerActionData } from "@/lib/serverAction";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronsUpDownIcon, UserIcon, UsersIcon } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type Identities = ExtractServerActionData<typeof getUserSwitchableIdentitiesAction>;

export function TeamSwitchButton({ children }: { children?: React.ReactNode }) {
  const { data: session } = useSession();
  const t = useTranslations("Team.SwitchDialog");
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState<number | null>(null);
  const [identities, setIdentities] = useState<Identities | null>(null);

  useEffect(() => {
    if (!open) {
      setIsLoading(true); // Reset loading state when dialog is closed
      return;
    }

    async function loadIdentities() {
      try {
        const result = await getUserSwitchableIdentitiesAction();
        if (!result.success) throw result;
        setIdentities(result.data);
      } catch (error) {
        console.log("Failed to load identities:", error);
        toast.error((error as Error).message);
        setOpen(false);
      } finally {
        setIsLoading(false);
      }
    }

    loadIdentities();
  }, [open, t]);

  const handleSwitchUser = useCallback(
    async (targetUserId: number) => {
      if (isSwitching !== null) return;
      setIsSwitching(targetUserId);
      try {
        const tokenResult = await generateUserSwitchTokenAction(targetUserId);
        if (!tokenResult.success) {
          toast.error(tokenResult.message);
          return;
        }

        const result = await signIn("team-switch", {
          targetUserId: targetUserId.toString(),
          switchToken: tokenResult.data,
          redirect: false,
        });

        if (result?.error) {
          toast.error(result.error || t("toast.switchFailed"));
        } else {
          toast.success(t("toast.switchSuccess"));
          setOpen(false);
          router.push("/account");
          // window.location.reload(); // To ensure session and permissions are fully updated
          window.location.href = "/account"; // 不能停留在当前页，不然当前页面如果是详情页，可能 404
        }
      } catch (error) {
        console.error("Failed to switch user:", error);
        toast.error(t("toast.networkError"));
      } finally {
        setIsSwitching(null);
      }
    },
    [t, setOpen, router, isSwitching],
  );

  const currentUserId = session?.user?.id;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <ChevronsUpDownIcon className="w-4 h-4 mr-2" />
            {t("title")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden bg-background border-border shadow-lg">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-lg font-medium tracking-tight">{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="p-2">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm animate-pulse">
              {t("loading")}
            </div>
          ) : !identities || (!identities.personalUser && identities.teamUsers.length === 0) ? (
            <div className="p-8 text-center text-muted-foreground text-sm">{t("noIdentities")}</div>
          ) : (
            <div className="space-y-1">
              {/* Personal Account */}
              {identities.personalUser && (
                <div className="px-2 py-1">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
                    {t("personalAccountTitle")}
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (currentUserId !== identities.personalUser!.id) {
                        handleSwitchUser(identities.personalUser!.id);
                      }
                    }}
                    className={cn(
                      "group flex items-center justify-between p-2 rounded-md transition-all duration-200",
                      currentUserId === identities.personalUser.id
                        ? "bg-secondary/50 cursor-default"
                        : "hover:bg-accent cursor-pointer active:scale-[0.98]",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full",
                          currentUserId === identities.personalUser.id
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground group-hover:bg-background group-hover:shadow-sm",
                        )}
                      >
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div className="font-medium text-sm">{identities.personalUser.name}</div>
                    </div>

                    {currentUserId === identities.personalUser.id && (
                      <CheckIcon className="w-4 h-4 text-primary" />
                    )}
                    {isSwitching === identities.personalUser.id && (
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    )}
                  </div>
                </div>
              )}

              {/* Team Accounts */}
              {identities.teamUsers.length > 0 && (
                <div className="px-2 py-1">
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mt-2">
                    {t("teamIdentitiesTitle")}
                  </div>
                  <div className="space-y-0.5">
                    {identities.teamUsers.map((teamUser) => (
                      <div
                        key={teamUser.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (currentUserId !== teamUser.id) {
                            handleSwitchUser(teamUser.id);
                          }
                        }}
                        className={cn(
                          "group flex items-center justify-between p-2 rounded-md transition-all duration-200",
                          currentUserId === teamUser.id
                            ? "bg-secondary/50 cursor-default"
                            : "hover:bg-accent cursor-pointer active:scale-[0.98]",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-full",
                              currentUserId === teamUser.id
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground group-hover:bg-background group-hover:shadow-sm",
                            )}
                          >
                            <UsersIcon className="w-4 h-4" />
                          </div>
                          <div className="font-medium text-sm">{teamUser.teamAsMember.name}</div>
                        </div>

                        {currentUserId === teamUser.id && (
                          <CheckIcon className="w-4 h-4 text-primary" />
                        )}
                        {isSwitching === teamUser.id && (
                          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="p-4 bg-muted/30 border-t text-xs text-center text-muted-foreground">
          {/* Optional footer or just padding */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
