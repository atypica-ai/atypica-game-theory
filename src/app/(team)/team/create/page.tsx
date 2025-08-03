"use client";
import { createTeamAction } from "@/app/(team)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function CreateTeamPage() {
  const t = useTranslations("Team.CreatePage");
  const tActions = useTranslations("Team.Actions.createTeam");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(t("toast.enterName"));
      return;
    }

    setIsLoading(true);

    try {
      const result = await createTeamAction({ name: name.trim() });

      if (result.success) {
        toast.success(t("toast.createSuccess"));
        router.push("/team/manage");
      } else {
        // Use error code for translation if available, otherwise fallback to the message
        let errorMessage = result.message;
        if (result.code === "forbidden") {
          errorMessage = tActions("forbidden");
        } else if (result.code === "internal_server_error") {
          errorMessage = tActions("failed");
        } else if (
          result.message === "团队名称已存在" ||
          result.message === "Team name already exists"
        ) {
          // Handle specific message string until a code is provided
          errorMessage = tActions("nameExists");
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error(t("toast.networkError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("teamNameLabel")}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t("teamNamePlaceholder")}
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
                {t("cancelButton")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? t("creatingButton") : t("createButton")}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-sm text-muted-foreground">
            <h4 className="font-medium">{t("notesTitle")}</h4>
            <ul className="mt-2 space-y-1">
              <li>{t("note1")}</li>
              <li>{t("note2")}</li>
              <li>{t("note3")}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
