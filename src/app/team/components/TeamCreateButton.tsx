import { createTeamAction, generateUserSwitchTokenAction } from "@/app/team/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

interface TeamCreateButtonProps {
  children?: React.ReactNode;
}

export function TeamCreateButton({ children }: TeamCreateButtonProps) {
  const t = useTranslations("Team.CreatePage");
  const tSwitch = useTranslations("Team.SwitchDialog");
  const router = useRouter();
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setIsLoading(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(t("toast.enterName"));
      return;
    }

    setIsLoading(true);

    try {
      const result = await createTeamAction({ name: name.trim() });

      if (!result.success) throw result;
      toast.success(t("toast.createSuccess"));

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { team, teamUser } = result.data;
      const tokenResult = await generateUserSwitchTokenAction(teamUser.id);
      if (!tokenResult.success) throw tokenResult;

      const signInResult = await signIn("team-switch", {
        targetUserId: teamUser.id.toString(),
        switchToken: tokenResult.data,
        redirect: false,
      });

      if (signInResult?.error) {
        toast.error(signInResult.error || tSwitch("toast.switchFailed"));
        setIsLoading(false);
      } else {
        toast.success(tSwitch("toast.switchSuccess"));
        setOpen(false);
        router.push("/team");
      }
    } catch (error) {
      console.log("Failed to create team:", error);
      toast.error((error as Error).message);
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? (
          children
        ) : (
          <Button variant="outline" size="sm">
            {t("title")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
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

          <div className="text-sm text-muted-foreground">
            <h4 className="font-medium">{t("notesTitle")}</h4>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>{t("note1")}</li>
              <li>{t("note2")}</li>
              <li>{t("note3")}</li>
            </ul>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              {t("cancelButton")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t("creatingButton") : t("createButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
