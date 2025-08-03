"use client";
import {
  generateUserSwitchTokenAction,
  getUserSwitchableIdentitiesAction,
} from "@/app/(team)/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Team, User } from "@/prisma/client";
import { CheckIcon, UserIcon, UsersIcon } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export default function SwitchUserPage() {
  const { data: session } = useSession();
  const t = useTranslations("Team.SwitchPage");

  const [identities, setIdentities] = useState<{
    personalUser: User | null;
    teamUsers: Array<User & { team: Team }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [switchingToUserId, setSwitchingToUserId] = useState<number | null>(null);

  const router = useRouter();

  // 加载可切换的身份列表
  const loadIdentities = useCallback(async () => {
    try {
      const result = await getUserSwitchableIdentitiesAction();
      if (result.success) {
        setIdentities(result.data);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Failed to load identities:", error);
      toast.error(t("toast.networkError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // 切换到指定用户
  const handleSwitchUser = async (targetUserId: number) => {
    setSwitchingToUserId(targetUserId);

    try {
      // 先生成安全的切换token
      const tokenResult = await generateUserSwitchTokenAction(targetUserId);
      if (!tokenResult.success) {
        toast.error(tokenResult.message);
        setSwitchingToUserId(null);
        return;
      }

      // 使用token进行切换
      const result = await signIn("team-switch", {
        targetUserId: targetUserId.toString(),
        switchToken: tokenResult.data,
        redirect: false,
      });

      if (result?.error) {
        let errorMessage = t("toast.switchFailed");
        switch (result.error) {
          case "MISSING_CREDENTIALS":
            errorMessage = t("toast.missingCredentials");
            break;
          case "INVALID_USER_ID":
            errorMessage = t("toast.invalidUserId");
            break;
          case "INVALID_SWITCH_TOKEN":
            errorMessage = t("toast.invalidSwitchToken");
            break;
          case "TOKEN_USER_MISMATCH":
            errorMessage = t("toast.tokenUserMismatch");
            break;
          case "TARGET_USER_NOT_FOUND":
            errorMessage = t("toast.targetUserNotFound");
            break;
          case "INVALID_TARGET_USER":
            errorMessage = t("toast.invalidTargetUser");
            break;
          case "EMAIL_NOT_VERIFIED":
            errorMessage = t("toast.emailNotVerified");
            break;
          default:
            errorMessage = result.error;
        }

        toast.error(errorMessage);
      } else {
        toast.success(t("toast.switchSuccess"));
        // 刷新页面或跳转到首页
        router.push("/");
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to switch user:", error);
      toast.error(t("toast.networkError"));
    } finally {
      setSwitchingToUserId(null);
    }
  };

  useEffect(() => {
    loadIdentities();
  }, [loadIdentities]);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <div className="text-center">{t("loading")}</div>
      </div>
    );
  }

  if (!identities) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">{t("loadError")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentUserId = session?.user?.id;
  const hasPersonalUser = !!identities.personalUser;
  const hasTeamUsers = identities.teamUsers.length > 0;

  return (
    <div className="container mx-auto max-w-2xl py-8 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <div className="space-y-4">
        {/* 个人用户身份 */}
        {hasPersonalUser && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserIcon className="w-5 h-5 mr-2" />
                {t("personalAccountTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{identities.personalUser!.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {identities.personalUser!.email}
                  </div>
                  <div className="flex items-center mt-2">
                    {currentUserId === identities.personalUser!.id && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckIcon className="w-3 h-3 mr-1" />
                        {t("currentBadge")}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  onClick={() => handleSwitchUser(identities.personalUser!.id)}
                  disabled={
                    currentUserId === identities.personalUser!.id || switchingToUserId !== null
                  }
                  variant={currentUserId === identities.personalUser!.id ? "secondary" : "default"}
                >
                  {switchingToUserId === identities.personalUser!.id
                    ? t("switchingButton")
                    : currentUserId === identities.personalUser!.id
                      ? t("currentButton")
                      : t("switchButton")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 团队用户身份 */}
        {hasTeamUsers && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UsersIcon className="w-5 h-5 mr-2" />
                {t("teamIdentitiesTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {identities.teamUsers.map((teamUser) => (
                <div
                  key={teamUser.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{teamUser.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {t("teamLabel", { teamName: teamUser.team.name })}
                    </div>
                    <div className="flex items-center mt-2">
                      {currentUserId === teamUser.id && (
                        <Badge variant="secondary" className="text-xs">
                          <CheckIcon className="w-3 h-3 mr-1" />
                          {t("currentBadge")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => handleSwitchUser(teamUser.id)}
                    disabled={currentUserId === teamUser.id || switchingToUserId !== null}
                    variant={currentUserId === teamUser.id ? "secondary" : "default"}
                  >
                    {switchingToUserId === teamUser.id
                      ? t("switchingButton")
                      : currentUserId === teamUser.id
                        ? t("currentButton")
                        : t("switchButton")}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!hasPersonalUser && !hasTeamUsers && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">{t("noIdentities")}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="text-center">
        <Button variant="outline" onClick={() => router.back()}>
          {t("backButton")}
        </Button>
      </div>

      <div className="text-sm text-muted-foreground space-y-2">
        <h4 className="font-medium">{t("notesTitle")}</h4>
        <ul className="space-y-1">
          <li>{t("note1")}</li>
          <li>{t("note2")}</li>
          <li>{t("note3")}</li>
        </ul>
      </div>
    </div>
  );
}
