"use client";

import { getUserTeamsAction } from "@/app/(team)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Team } from "@/prisma/client";
import { PlusIcon, SettingsIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function TeamListPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 加载团队列表
  const loadTeams = async () => {
    try {
      const result = await getUserTeamsAction();
      if (result.success) {
        setTeams(result.data);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("网络错误，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <Card key={team.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{team.name}</span>
                  <Link href={`/team/manage/${team.id}`}>
                    <Button variant="ghost" size="sm">
                      <SettingsIcon className="w-4 h-4" />
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">座位数：</span>
                    <span>{team.seats}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">创建时间：</span>
                    <span>{new Date(team.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Link href={`/team/manage/${team.id}`}>
                    <Button className="w-full" variant="outline">
                      管理团队
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
