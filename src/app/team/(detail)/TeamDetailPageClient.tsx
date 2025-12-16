"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { Team, TeamExtra, User } from "@/prisma/client";
import {
  CreditCardIcon,
  CrownIcon,
  InfinityIcon,
  PlusIcon,
  ShieldCheckIcon,
  TrashIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addTeamMemberAction,
  getTeamMembersAction,
  getTeamSubscriptionAction,
  removeTeamMemberAction,
} from "./actions";

export function TeamDetailPageClient({ team, isOwner }: { team: Team; isOwner: boolean }) {
  const t = useTranslations("Team.ManageDetailPage");
  const tActions = useTranslations("Team.Actions");
  const locale = useLocale();
  const teamExtra = team.extra as TeamExtra | null;
  const hasUnlimitedSeats = teamExtra?.unlimitedSeats === true;
  const [members, setMembers] = useState<Array<User & { personalUser: User | null }>>([]);
  const [teamSubscription, setTeamSubscription] = useState<ExtractServerActionData<
    typeof getTeamSubscriptionAction
  > | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);

  // Load team data
  const loadTeamData = useCallback(async () => {
    try {
      const [membersResult, subscriptionResult] = await Promise.all([
        getTeamMembersAction(),
        getTeamSubscriptionAction(),
      ]);
      if (!membersResult.success) throw membersResult;
      setMembers(membersResult.data);
      if (!subscriptionResult.success) throw subscriptionResult;
      setTeamSubscription(subscriptionResult.data);
    } catch (error) {
      console.log("Failed to load team data:", error);
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add member
  const handleAddMember = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newMemberEmail.trim()) {
        toast.error(tActions("addMember.userNotExist"));
        return;
      }
      setIsAddingMember(true);
      try {
        const result = await addTeamMemberAction({
          teamId: team.id,
          memberEmail: newMemberEmail.trim(),
        });
        if (!result.success) throw result;
        toast.success(t("toast.addSuccess"));
        setNewMemberEmail("");
        setIsAddMemberDialogOpen(false);
        await loadTeamData();
      } catch (error) {
        console.log("Failed to add team member:", error);
        toast.error((error as Error).message);
      } finally {
        setIsAddingMember(false);
      }
    },
    [team.id, t, loadTeamData, newMemberEmail, tActions],
  );

  // Remove member
  const handleRemoveMember = useCallback(
    async (member: User & { personalUser: User | null }) => {
      setRemovingMemberId(member.id);
      try {
        const result = await removeTeamMemberAction({
          teamId: team.id,
          memberId: member.id,
        });
        if (!result.success) throw result;
        toast.success(t("toast.removeSuccess"));
        await loadTeamData();
      } catch (error) {
        console.log("Failed to remove team member:", error);
        toast.error((error as Error).message);
      } finally {
        setRemovingMemberId(null);
      }
    },
    [team.id, t, loadTeamData],
  );

  useEffect(() => {
    loadTeamData();
  }, [loadTeamData]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 flex justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-48 bg-muted rounded"></div>
          <div className="h-64 w-full max-w-4xl bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const activeMembersCount = members.filter((m) => m.personalUserId).length;
  const removedMembersCount = members.filter((m) => !m.personalUserId).length;
  const isSeatsFull = !hasUnlimitedSeats && activeMembersCount >= team.seats;

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{team.name}</h1>
          <p className="text-muted-foreground mt-1">
            {t("infoTitle")} • {new Date(team.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* 所有成员都可以购买团队订阅 */}
          {!teamSubscription && (
            <Button variant="outline" asChild>
              <Link href="/pricing#organization">
                <CreditCardIcon className="size-4" />
                {t("purchaseTeam")}
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalSeats")}</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasUnlimitedSeats ? <InfinityIcon className="h-8 w-8" /> : team.seats}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasUnlimitedSeats ? t("unlimitedSeatsAvailable") : t("totalSeatsAvailable")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("usedSeats")}</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMembersCount}</div>
            {!hasUnlimitedSeats && (
              <p className="text-xs text-muted-foreground">
                {t("seatsRemaining", { count: team.seats - activeMembersCount })}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className={teamSubscription ? "border-primary/50 bg-primary/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("subscriptionStatus")}</CardTitle>
            <ShieldCheckIcon className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamSubscription?.plan === "superteam"
                ? t("subscriptionPlanSuperTeam")
                : teamSubscription?.plan === "team"
                  ? t("subscriptionPlanTeam")
                  : t("subscriptionPlanFree")}
            </div>
            {teamSubscription ? (
              <p className="text-xs text-muted-foreground">
                {t("subscriptionEndsPrefix")} {formatDate(teamSubscription.endsAt, locale)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("upgradePrompt")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>
            {t("membersTitle")}
            {removedMembersCount > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {t("removedCount", { count: removedMembersCount })}
              </span>
            )}
          </CardTitle>
          <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
            <DialogTrigger asChild>
              {/* 非 owner 或席位已满时禁用添加成员按钮 */}
              <Button disabled={!isOwner || isSeatsFull}>
                <PlusIcon className="size-4" />
                {t("addMemberTitle")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("addMemberTitle")}</DialogTitle>
                <DialogDescription>
                  {t("addMemberDescription") || "Invite a new member to your team."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("memberEmailLabel")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t("memberEmailPlaceholder")}
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    disabled={isAddingMember}
                  />
                </div>
                {isSeatsFull && <p className="text-sm text-destructive">{t("seatsFull")}</p>}
                <DialogFooter>
                  <Button type="submit" disabled={isAddingMember || isSeatsFull}>
                    {isAddingMember ? t("addingButton") : t("addButton")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.name")}</TableHead>
                <TableHead>{t("table.email")}</TableHead>
                <TableHead>{t("table.joinedAt")}</TableHead>
                <TableHead className="text-right">{t("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    {t("noMembers")}
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => {
                  const memberDeleted = !member.personalUserId;
                  const memberIsOwner = member.personalUserId === team.ownerUserId;
                  return (
                    <TableRow
                      key={member.id}
                      className={memberDeleted ? "opacity-50 bg-muted/50" : ""}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>
                              {member.name?.slice(0, 2).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span>{member.name}</span>
                            {memberIsOwner && (
                              <span className="flex items-center gap-1 text-xs text-primary font-normal sm:hidden">
                                <CrownIcon className="w-3 h-3" /> {t("table.ownerBadge")}
                              </span>
                            )}
                          </div>
                          {memberIsOwner && (
                            <Badge
                              variant="secondary"
                              className="hidden sm:flex items-center gap-1 ml-2"
                            >
                              <CrownIcon className="w-3 h-3" /> {t("table.ownerBadge")}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.personalUser?.email ||
                          (memberDeleted ? t("table.removedStatus") : t("table.noEmail"))}
                      </TableCell>
                      <TableCell>{new Date(member.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {/* 当前用户是 owner 的时候，显示 */}
                        {isOwner && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-destructive"
                                disabled={
                                  removingMemberId === member.id ||
                                  memberDeleted ||
                                  member.personalUserId === team.ownerUserId // 不能删除自己
                                }
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("removeDialog.title")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("removeDialog.confirmMessage", { memberName: member.name })}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="text-sm text-muted-foreground">
                                <p className="font-medium text-foreground mb-2">
                                  {t("removeDialog.afterRemovalTitle")}
                                </p>
                                <ul className="list-disc list-inside space-y-1">
                                  <li>{t("removeDialog.note1")}</li>
                                  <li>{t("removeDialog.note2")}</li>
                                  <li>{t("removeDialog.note3")}</li>
                                </ul>
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={removingMemberId === member.id}>
                                  {t("removeDialog.cancelButton")}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveMember(member)}
                                  disabled={removingMemberId === member.id}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  {removingMemberId === member.id
                                    ? t("removeDialog.removingButton")
                                    : t("removeDialog.confirmButton")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
