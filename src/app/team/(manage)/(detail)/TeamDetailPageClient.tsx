"use client";
import { TeamSubscriptionDialog } from "@/app/payment/components/TeamSubscriptionDialog";
import {
  addTeamMemberAction,
  getTeamDetailsAction,
  getTeamMembersAction,
  getTeamSubscriptionAction,
  removeTeamMemberAction,
} from "@/app/team/actions";
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
import { ExtractServerActionData } from "@/lib/serverAction";
import { formatDate } from "@/lib/utils";
import { Team, User } from "@/prisma/client";
import { CreditCardIcon, TrashIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function TeamDetailPageClient({ teamId }: { teamId: number }) {
  const t = useTranslations("Team.ManageDetailPage");
  const tActions = useTranslations("Team.Actions");
  const locale = useLocale();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Array<User & { personalUser: User | null }>>([]);
  const [teamSubscription, setTeamSubscription] = useState<ExtractServerActionData<
    typeof getTeamSubscriptionAction
  > | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);
  const [isSubscriptionDialogOpen, setIsSubscriptionDialogOpen] = useState(false);

  // 加载团队信息和成员
  const loadTeamData = useCallback(async () => {
    try {
      const [teamResult, membersResult, subscriptionResult] = await Promise.all([
        getTeamDetailsAction(teamId),
        getTeamMembersAction(teamId),
        getTeamSubscriptionAction(teamId),
      ]);

      if (teamResult.success) {
        setTeam(teamResult.data);
      } else {
        toast.error(teamResult.message);
        // if (teamResult.code === "forbidden" || teamResult.code === "not_found") {
        //   router.push("/team/manage");
        //   return;
        // }
      }

      if (membersResult.success) {
        setMembers(membersResult.data);
      } else {
        toast.error(membersResult.message);
      }

      if (subscriptionResult.success) {
        setTeamSubscription(subscriptionResult.data);
      } else {
        // Subscription error is not critical, just log it
        console.log("Failed to load team subscription:", subscriptionResult.message);
      }
    } catch (error) {
      console.log("Failed to load team data:", error);
      toast.error(t("toast.networkError"));
    } finally {
      setIsLoading(false);
    }
  }, [teamId, t]);

  // 添加成员
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMemberEmail.trim()) {
      toast.error(tActions("addMember.userNotExist")); // Re-using a relevant error
      return;
    }

    setIsAddingMember(true);

    try {
      const result = await addTeamMemberAction({
        teamId,
        memberEmail: newMemberEmail.trim(),
      });

      if (result.success) {
        toast.success(t("toast.addSuccess"));
        setNewMemberEmail("");
        await loadTeamData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.log("Failed to add team member:", error);
      toast.error(t("toast.networkError"));
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
        toast.success(t("toast.removeSuccess"));
        await loadTeamData();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.log("Failed to remove team member:", error);
      toast.error(t("toast.networkError"));
    } finally {
      setRemovingMemberId(null);
    }
  };

  useEffect(() => {
    loadTeamData();
  }, [teamId, loadTeamData]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">{t("loading")}</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="container p-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">{t("notFound")}</p>
          <Link href="/team/manage">
            <Button>{t("backToListButton")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const activeMembersCount = members.filter((m) => m.personalUserId).length;
  const removedMembersCount = members.filter((m) => !m.personalUserId).length;

  return (
    <div className="container p-6 space-y-6">
      <div className="flex items-center gap-4">
        {/*<Link href="/team/manage">
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            {t("backButton")}
          </Button>
        </Link>*/}
        <h1 className="text-2xl font-bold">{team.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 团队信息 */}
        <Card>
          <CardHeader>
            <CardTitle>{t("infoTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">{t("totalSeats")}</div>
                <div className="font-medium">{team.seats}</div>
              </div>
              <div>
                <div className="text-muted-foreground">{t("usedSeats")}</div>
                <div className="font-medium">{activeMembersCount}</div>
              </div>
              <div className="col-span-2">
                <div className="text-muted-foreground">{t("createdAt")}</div>
                <div className="font-medium">{new Date(team.createdAt).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Subscription Status */}
            {teamSubscription && (
              <div className="pt-4 border-t">
                <div className="text-sm text-muted-foreground mb-2">{t("subscriptionStatus")}</div>
                <div className="text-sm">
                  <div className="flex justify-between">
                    <span>{t("currentSeats")}</span>
                    <span className="font-medium">
                      {(teamSubscription.extra as any)?.seats || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("subscriptionEnd")}</span>
                    <span className="font-medium">
                      {formatDate(teamSubscription.endsAt, locale)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button
                onClick={() => setIsSubscriptionDialogOpen(true)}
                className="w-full"
                variant="outline"
              >
                <CreditCardIcon className="w-4 h-4 mr-2" />
                {teamSubscription ? t("manageSubscription") : t("purchaseSeats")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 添加成员和成员列表 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 添加成员 */}
          <Card>
            <CardHeader>
              <CardTitle>{t("addMemberTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
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
                <Button type="submit" disabled={isAddingMember || activeMembersCount >= team.seats}>
                  {isAddingMember ? t("addingButton") : t("addButton")}
                </Button>
                {activeMembersCount >= team.seats && (
                  <p className="text-sm text-muted-foreground">{t("seatsFull")}</p>
                )}
              </form>
            </CardContent>
          </Card>

          {/* 成员列表 */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t("membersTitle")} ({activeMembersCount}/{team.seats})
                {removedMembersCount > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    {t("removedCount", { count: removedMembersCount })}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">{t("noMembers")}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("table.name")}</TableHead>
                      <TableHead>{t("table.email")}</TableHead>
                      <TableHead>{t("table.joinedAt")}</TableHead>
                      <TableHead className="w-[100px]">{t("table.actions")}</TableHead>
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
                                {t("table.ownerBadge")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className={isDeleted ? "text-muted-foreground" : ""}>
                            {member.personalUser?.email ||
                              (isDeleted ? t("table.removedStatus") : t("table.noEmail"))}
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
                                    <AlertDialogTitle>{t("removeDialog.title")}</AlertDialogTitle>
                                  </AlertDialogHeader>
                                  <div className="text-sm">
                                    {t("removeDialog.confirmMessage", { memberName: member.name })}
                                    <br />
                                    <br />
                                    {t("removeDialog.afterRemovalTitle")}
                                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
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
                            {isDeleted && (
                              <span className="text-xs text-muted-foreground">
                                {t("table.removedStatus")}
                              </span>
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

      {/* Team Subscription Dialog */}
      <TeamSubscriptionDialog
        open={isSubscriptionDialogOpen}
        onOpenChange={setIsSubscriptionDialogOpen}
        team={team}
        existingSubscription={
          teamSubscription
            ? {
                seats: (teamSubscription.extra as any)?.seats || 0,
                endsAt: teamSubscription.endsAt,
              }
            : null
        }
        onSuccess={() => {
          setIsSubscriptionDialogOpen(false);
          loadTeamData();
        }}
      />
    </div>
  );
}
