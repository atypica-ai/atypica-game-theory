"use client";

import {
  addTeamMemberAction,
  getTeamAction,
  getTeamMembersAction,
  removeTeamMemberAction,
} from "@/app/(team)/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Team, User } from "@/prisma/client";
import { ArrowLeftIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function TeamManagePage() {
  const params = useParams();
  const router = useRouter();
  const teamId = parseInt(params.teamId as string);

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Array<User & { personalUser: User | null }>>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);

  // 加载团队信息和成员
  const loadTeamData = async () => {
    if (isNaN(teamId)) {
      toast.error("无效的团队ID");
      router.push("/team/manage");
      return;
    }

    try {
      const [teamResult, membersResult] = await Promise.all([
        getTeamAction(teamId),
        getTeamMembersAction(teamId),
      ]);

      if (teamResult.success) {
        setTeam(teamResult.data);
      } else {
        toast.error(teamResult.message);
        if (teamResult.code === "forbidden" || teamResult.code === "not_found") {
          router.push("/team/manage");
          return;
        }
      }

      if (membersResult.success) {
        setMembers(membersResult.data);
      } else {
        toast.error(membersResult.message);
      }
    } catch (error) {
      toast.error("网络错误，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 添加成员
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMemberEmail.trim()) {
      toast.error("请输入成员邮箱");
      return;
    }

    setIsAddingMember(true);

    try {
      const result = await addTeamMemberAction({
        teamId,
        memberEmail: newMemberEmail.trim(),
      });

      if (result.success) {
        toast.success("成员添加成功");
        setNewMemberEmail("");
        loadTeamData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("网络错误，请重试");
    } finally {
      setIsAddingMember(false);
    }
  };

  // 移除成员
  const handleRemoveMember = async (member: User & { personalUser: User | null }) => {
    setRemovingMemberId(member.id);

    try {
      const result = await removeTeamMemberAction({
        teamId,
        memberId: member.id,
      });

      if (result.success) {
        toast.success("成员移除成功");
        loadTeamData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("网络错误，请重试");
    } finally {
      setRemovingMemberId(null);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">团队不存在或无权访问</p>
          <Link href="/team/manage">
            <Button>返回团队列表</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/team/manage">
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            返回
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{team.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 团队信息 */}
        <Card>
          <CardHeader>
            <CardTitle>团队信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">总座位数</div>
                <div className="font-medium">{team.seats}</div>
              </div>
              <div>
                <div className="text-muted-foreground">已使用</div>
                <div className="font-medium">{members.filter((m) => m.personalUserId).length}</div>
              </div>
              <div className="col-span-2">
                <div className="text-muted-foreground">创建时间</div>
                <div className="font-medium">{new Date(team.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 添加成员和成员列表 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 添加成员 */}
          <Card>
            <CardHeader>
              <CardTitle>添加成员</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">成员邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="输入已注册用户的邮箱"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    disabled={isAddingMember}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={
                    isAddingMember || members.filter((m) => m.personalUserId).length >= team.seats
                  }
                >
                  {isAddingMember ? "添加中..." : "添加成员"}
                </Button>
                {members.filter((m) => m.personalUserId).length >= team.seats && (
                  <p className="text-sm text-muted-foreground">团队座位已满，无法添加更多成员</p>
                )}
              </form>
            </CardContent>
          </Card>

          {/* 成员列表 */}
          <Card>
            <CardHeader>
              <CardTitle>
                团队成员 ({members.filter((m) => m.personalUserId).length}/{team.seats})
                {members.filter((m) => !m.personalUserId).length > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({members.filter((m) => !m.personalUserId).length} 已移除)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">暂无团队成员</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>加入时间</TableHead>
                      <TableHead className="w-[100px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => {
                      const isDeleted = !member.personalUserId;
                      const isOwner = member.personalUserId === team.ownerUserId;

                      return (
                        <TableRow key={member.id} className={isDeleted ? "opacity-60" : ""}>
                          <TableCell
                            className={`font-medium ${isDeleted ? "text-muted-foreground" : ""}`}
                          >
                            {member.name}
                            {isOwner && (
                              <span className="ml-2 text-xs bg-primary text-primary-foreground px-1 rounded">
                                拥有者
                              </span>
                            )}
                          </TableCell>
                          <TableCell className={isDeleted ? "text-muted-foreground" : ""}>
                            {member.personalUser?.email || (isDeleted ? "已移除" : "无")}
                          </TableCell>
                          <TableCell className={isDeleted ? "text-muted-foreground" : ""}>
                            {new Date(member.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {!isDeleted && !isOwner && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    disabled={removingMemberId === member.id}
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>确认移除成员</AlertDialogTitle>
                                  </AlertDialogHeader>
                                  <div className="text-sm">
                                    你确定要移除成员 <strong>{member.name}</strong> 吗？
                                    <br />
                                    <br />
                                    移除后：
                                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                                      <li>该成员将无法访问团队资源</li>
                                      <li>其历史数据和记录将被保留</li>
                                      <li>可以释放一个团队座位给新成员</li>
                                    </ul>
                                  </div>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={removingMemberId === member.id}>
                                      取消
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleRemoveMember(member)}
                                      disabled={removingMemberId === member.id}
                                      className="bg-destructive hover:bg-destructive/90"
                                    >
                                      {removingMemberId === member.id ? "移除中..." : "确认移除"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                            {isDeleted && (
                              <span className="text-xs text-muted-foreground">已移除</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
