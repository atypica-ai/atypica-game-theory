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
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function SwitchUserPage() {
  const { data: session } = useSession();
  const [identities, setIdentities] = useState<{
    personalUser: User | null;
    teamUsers: Array<User & { team: Team }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [switchingToUserId, setSwitchingToUserId] = useState<number | null>(null);

  const router = useRouter();

  // 加载可切换的身份列表
  const loadIdentities = async () => {
    try {
      const result = await getUserSwitchableIdentitiesAction();
      if (result.success) {
        setIdentities(result.data);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("网络错误，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 切换到指定用户
  const handleSwitchUser = async (targetUserId: number) => {
    setSwitchingToUserId(targetUserId);

    try {
      // 先生成安全的切换token
      const tokenResult = await generateUserSwitchTokenAction(targetUserId);
      if (!tokenResult.success) {
        toast.error(tokenResult.message);
        return;
      }

      // 使用token进行切换
      const result = await signIn("team-switch", {
        targetUserId: targetUserId.toString(),
        switchToken: tokenResult.data,
        redirect: false,
      });

      if (result?.error) {
        let errorMessage = "切换失败";
        switch (result.error) {
          case "MISSING_CREDENTIALS":
            errorMessage = "缺少必要的认证信息";
            break;
          case "INVALID_USER_ID":
            errorMessage = "无效的用户ID";
            break;
          case "INVALID_SWITCH_TOKEN":
            errorMessage = "无效的切换令牌";
            break;
          case "TOKEN_USER_MISMATCH":
            errorMessage = "令牌用户不匹配";
            break;
          case "TARGET_USER_NOT_FOUND":
            errorMessage = "目标用户不存在";
            break;
          case "INVALID_TARGET_USER":
            errorMessage = "无效的目标用户";
            break;
          case "EMAIL_NOT_VERIFIED":
            errorMessage = "邮箱未验证";
            break;
          default:
            errorMessage = result.error;
        }

        toast.error(errorMessage);
      } else {
        toast.success("身份切换成功");
        // 刷新页面或跳转到首页
        router.push("/");
        window.location.reload();
      }
    } catch (error) {
      toast.error("网络错误，请重试");
    } finally {
      setSwitchingToUserId(null);
    }
  };

  useEffect(() => {
    loadIdentities();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  if (!identities) {
    return (
      <div className="container mx-auto max-w-2xl py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">无法加载身份信息</p>
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
        <h1 className="text-2xl font-bold mb-2">切换身份</h1>
        <p className="text-muted-foreground">选择要切换到的身份，切换后您将以该身份登录</p>
      </div>

      <div className="space-y-4">
        {/* 个人用户身份 */}
        {hasPersonalUser && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserIcon className="w-5 h-5 mr-2" />
                个人用户
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
                        当前身份
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
                    ? "切换中..."
                    : currentUserId === identities.personalUser!.id
                      ? "当前身份"
                      : "切换"}
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
                团队身份
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
                    <div className="text-sm text-muted-foreground">团队：{teamUser.team.name}</div>
                    <div className="flex items-center mt-2">
                      {currentUserId === teamUser.id && (
                        <Badge variant="secondary" className="text-xs">
                          <CheckIcon className="w-3 h-3 mr-1" />
                          当前身份
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
                      ? "切换中..."
                      : currentUserId === teamUser.id
                        ? "当前身份"
                        : "切换"}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!hasPersonalUser && !hasTeamUsers && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">没有可切换的身份</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="text-center">
        <Button variant="outline" onClick={() => router.back()}>
          返回
        </Button>
      </div>

      <div className="text-sm text-muted-foreground space-y-2">
        <h4 className="font-medium">说明：</h4>
        <ul className="space-y-1">
          <li>• 个人身份：使用个人邮箱登录，管理个人数据和团队</li>
          <li>• 团队身份：在团队环境中工作，访问团队共享资源</li>
          <li>• 切换身份后需要重新加载页面以应用新的权限</li>
        </ul>
      </div>
    </div>
  );
}
