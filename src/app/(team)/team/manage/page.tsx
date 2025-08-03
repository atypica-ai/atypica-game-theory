"use client";

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
import { PlusIcon, TrashIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addTeamMemberAction,
  getTeamMembersAction,
  getUserTeamsAction,
  removeTeamMemberAction,
} from "../actions";

export default function ManageTeamPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Array<User & { personalUser: User | null }>>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);

  // 加载团队列表
  const loadTeams = async () => {
    try {
      const result = await getUserTeamsAction();
      if (result.success) {
        setTeams(result.data);
        if (result.data.length > 0 && !selectedTeam) {
          setSelectedTeam(result.data[0]);
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("网络错误，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  // 加载团队成员
  const loadMembers = async (teamId: number) => {
    try {
      const result = await getTeamMembersAction(teamId);
      if (result.success) {
        setMembers(result.data);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("网络错误，请重试");
    }
  };

  // 添加成员
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTeam) return;

    if (!newMemberEmail.trim()) {
      toast.error("请输入成员邮箱");
      return;
    }

    setIsAddingMember(true);

    try {
      const result = await addTeamMemberAction({
        teamId: selectedTeam.id,
        memberEmail: newMemberEmail.trim(),
      });

      if (result.success) {
        toast.success("成员添加成功");
        setNewMemberEmail("");
        loadMembers(selectedTeam.id);
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
  const handleRemoveMember = async (memberId: number) => {
    if (!selectedTeam) return;

    setRemovingMemberId(memberId);

    try {
      const result = await removeTeamMemberAction({
        teamId: selectedTeam.id,
        memberId,
      });

      if (result.success) {
        toast.success("成员移除成功");
        loadMembers(selectedTeam.id);
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
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadMembers(selectedTeam.id);
    }
  }, [selectedTeam]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">团队管理</h1>
        <Link href="/team/create">
          <Button>
            <PlusIcon className="w-4 h-4 mr-2" />
            创建团队
          </Button>
        </Link>
      </div>

      {teams.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <UsersIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">您还没有团队</p>
            <Link href="/team/create">
              <Button>创建第一个团队</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 团队列表 */}
          <Card>
            <CardHeader>
              <CardTitle>我的团队</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTeam?.id === team.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                    onClick={() => setSelectedTeam(team)}
                  >
                    <div className="font-medium">{team.name}</div>
                    <div className="text-sm opacity-75">
                      {members.length}/{team.seats} 成员
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 团队详情和成员管理 */}
          <div className="lg:col-span-2 space-y-6">
            {selectedTeam && (
              <>
                {/* 团队信息 */}
                <Card>
                  <CardHeader>
                    <CardTitle>{selectedTeam.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">总座位数</div>
                        <div className="font-medium">{selectedTeam.seats}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">已使用</div>
                        <div className="font-medium">{members.length}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

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
                        disabled={isAddingMember || members.length >= selectedTeam.seats}
                      >
                        {isAddingMember ? "添加中..." : "添加成员"}
                      </Button>
                      {members.length >= selectedTeam.seats && (
                        <p className="text-sm text-muted-foreground">
                          团队座位已满，无法添加更多成员
                        </p>
                      )}
                    </form>
                  </CardContent>
                </Card>

                {/* 成员列表 */}
                <Card>
                  <CardHeader>
                    <CardTitle>团队成员</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {members.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">暂无团队成员</div>
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
                          {members.map((member) => (
                            <TableRow key={member.id}>
                              <TableCell>{member.name}</TableCell>
                              <TableCell>{member.personalUser?.email || "无"}</TableCell>
                              <TableCell>
                                {new Date(member.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveMember(member.id)}
                                  disabled={removingMemberId === member.id}
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
