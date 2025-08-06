"use client";

import {
  generateUserSwitchTokenAction,
  getUserSwitchableIdentitiesAction,
} from "@/app/team/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExtractServerActionData } from "@/lib/serverAction";
import { CheckIcon, ChevronsUpDownIcon, UserIcon, UsersIcon } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
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

  const handleSwitchUser = async (targetUserId: number) => {
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
        router.push("/");
        window.location.reload(); // To ensure session and permissions are fully updated
      }
    } catch (error) {
      console.error("Failed to switch user:", error);
      toast.error(t("toast.networkError"));
    } finally {
      setIsSwitching(null);
    }
  };

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground">{t("loading")}</div>
          ) : !identities || (!identities.personalUser && identities.teamUsers.length === 0) ? (
            <div className="text-center text-muted-foreground">{t("noIdentities")}</div>
          ) : (
            <>
              {/* Personal Account */}
              {identities.personalUser && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center">
                    <UserIcon className="w-4 h-4 mr-2" />
                    {t("personalAccountTitle")}
                  </h3>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="font-medium">{identities.personalUser.name}</div>
                    {currentUserId === identities.personalUser.id ? (
                      <Badge variant="secondary">
                        <CheckIcon className="w-3 h-3 mr-1" />
                        {t("currentBadge")}
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleSwitchUser(identities.personalUser!.id)}
                        disabled={isSwitching !== null}
                      >
                        {isSwitching === identities.personalUser.id
                          ? t("switchingButton")
                          : t("switchButton")}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Team Accounts */}
              {identities.teamUsers.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center">
                    <UsersIcon className="w-4 h-4 mr-2" />
                    {t("teamIdentitiesTitle")}
                  </h3>
                  <div className="space-y-2">
                    {identities.teamUsers.map((teamUser) => (
                      <div
                        key={teamUser.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="font-medium">{teamUser.teamAsMember.name}</div>
                        {currentUserId === teamUser.id ? (
                          <Badge variant="secondary">
                            <CheckIcon className="w-3 h-3 mr-1" />
                            {t("currentBadge")}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleSwitchUser(teamUser.id)}
                            disabled={isSwitching !== null}
                          >
                            {isSwitching === teamUser.id ? t("switchingButton") : t("switchButton")}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
