"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { createTeamAction } from "../actions";

export default function CreateTeamPage() {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("请输入团队名称");
      return;
    }

    setIsLoading(true);

    try {
      const result = await createTeamAction({ name: name.trim() });

      if (result.success) {
        toast.success("团队创建成功");
        router.push("/team/manage");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("网络错误，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>创建团队</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">团队名称</Label>
              <Input
                id="name"
                type="text"
                placeholder="输入团队名称"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                maxLength={100}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                取消
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "创建中..." : "创建团队"}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-sm text-muted-foreground">
            <h4 className="font-medium">说明：</h4>
            <ul className="mt-2 space-y-1">
              <li>• 团队默认提供 5 个座位</li>
              <li>• 只有个人用户可以创建团队</li>
              <li>• 创建后您将成为团队的拥有者</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
