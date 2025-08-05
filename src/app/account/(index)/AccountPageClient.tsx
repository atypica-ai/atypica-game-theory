"use client";
import { cancelSubscriptionAction, stripeSubscriptionAction } from "@/app/account/actions";
import { AddTokensDialog } from "@/app/payment/components/AddTokensDialog";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { UserSubscription, UserSubscriptionExtra } from "@/prisma/client";
import { CalendarIcon, CircleDollarSignIcon, CreditCardIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Stripe from "stripe";

export function AccountPageClient({
  userTokens,
  activeSubscription,
  planExpiresAt,
  stripeSubscriptionId,
}: (
  | {
      activeSubscription: Omit<UserSubscription, "extra"> & { extra: UserSubscriptionExtra };
      planExpiresAt: Date;
    }
  | {
      activeSubscription: null;
      planExpiresAt: null;
    }
) & {
  stripeSubscriptionId: string | null;
  userTokens: {
    permanentBalance: number;
    monthlyBalance: number;
    monthlyResetAt: Date | null;
  } | null;
}) {
  const t = useTranslations("AccountPage");
  const locale = useLocale();

  const [isAddTokensOpen, setIsAddTokensOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [stripeSubscription, setStripeSubscription] = useState<Pick<
    Stripe.Subscription,
    "id" | "status"
  > | null>(null);

  useEffect(() => {
    if (stripeSubscriptionId) {
      stripeSubscriptionAction()
        .then((stripeSubscription) => {
          setStripeSubscription(stripeSubscription);
        })
        .catch((error) => {
          console.error(error);
        });
    }
  }, [stripeSubscriptionId]);

  const handleCancelSubscription = useCallback(async () => {
    if (!stripeSubscriptionId) {
      return;
    }
    setIsCanceling(true);
    try {
      const result = await cancelSubscriptionAction();
      if (!result.success) {
        throw new Error(result.message);
      }
      toast.success(t("subscriptionSection.cancelSuccess"));
      // Refresh the page to update subscription status
      await new Promise((resolve) => setTimeout(() => resolve(null), 1000));
      window.location.reload();
    } catch (error) {
      toast.error((error as Error).message || t("subscriptionSection.cancelError"));
    } finally {
      setIsCanceling(false);
      setIsCancelDialogOpen(false);
    }
  }, [stripeSubscriptionId, t]);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-6xl">
        <h1 className="text-2xl font-bold mb-6">{t("title")}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Subscription Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCardIcon className="mr-2 h-5 w-5" />
                {t("subscriptionSection.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {t("subscriptionSection.currentPlan")}
                  </div>
                  <div className="font-medium">
                    {activeSubscription?.plan === "pro"
                      ? t("subscriptionSection.proPlan")
                      : activeSubscription?.plan === "max"
                        ? t("subscriptionSection.maxPlan")
                        : activeSubscription?.plan === "team"
                          ? t("subscriptionSection.teamPlan")
                          : t("subscriptionSection.notSubscribed")}
                  </div>
                </div>

                {activeSubscription && (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        {t("subscriptionSection.status")}
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                        <span>{t("subscriptionSection.active")}</span>
                      </div>
                    </div>

                    {stripeSubscriptionId ? (
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          {stripeSubscription?.status === "active"
                            ? t("subscriptionSection.autoRenew")
                            : t("subscriptionSection.expires")}
                        </div>
                        <div className="font-medium flex items-center">
                          <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                          {stripeSubscription?.status === "active"
                            ? formatDate(activeSubscription.endsAt, locale)
                            : formatDate(planExpiresAt, locale)}
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-muted-foreground">
                          {t("subscriptionSection.expires")}
                        </div>
                        <div className="font-medium flex items-center">
                          <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                          {
                            planExpiresAt
                              ? formatDate(planExpiresAt, locale)
                              : t("subscriptionSection.neverExpires") // activeSubscription 不为空的情况下，这个不可能出现
                          }
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
            <CardFooter>
              {stripeSubscription?.status === "active" ? (
                <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full mt-4" disabled={isCanceling}>
                      {isCanceling
                        ? t("subscriptionSection.canceling")
                        : t("subscriptionSection.cancelSubscription")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("subscriptionSection.confirmCancel")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("subscriptionSection.cancelDescription")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isCanceling}>
                        {t("subscriptionSection.keepSubscription")}
                      </AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancelSubscription} disabled={isCanceling}>
                        {isCanceling
                          ? t("subscriptionSection.canceling")
                          : t("subscriptionSection.confirmCancel")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : stripeSubscriptionId ? (
                // 是 stripeSubscription 但是状态不是 active，啥也不显示
                <></>
              ) : (
                // 非 stripeSubscription，直接显示续费/升级按钮
                <Button className="w-full mt-4" asChild>
                  <Link href="/pricing">
                    {activeSubscription
                      ? t("subscriptionSection.renew")
                      : t("subscriptionSection.upgrade")}
                  </Link>
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* Tokens Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CircleDollarSignIcon className="mr-2 h-5 w-5" />
                {t("tokensSection.title")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {t("tokensSection.permanentBalance")}
                  </div>
                  <div className="text-lg font-semibold">
                    {(userTokens?.permanentBalance || 0).toLocaleString()}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {t("tokensSection.monthlyBalance")}
                  </div>
                  <div className="text-lg font-semibold">
                    {(userTokens?.monthlyBalance || 0).toLocaleString()}
                  </div>
                </div>
                {userTokens?.monthlyResetAt && (
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      {t("tokensSection.monthlyResetAt")}
                    </div>
                    <div className="text-sm font-medium">
                      {formatDate(userTokens.monthlyResetAt, locale)}
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">{t("tokensSection.totalBalance")}</div>
                    <div className="text-xl font-bold">
                      {(
                        (userTokens?.permanentBalance || 0) + (userTokens?.monthlyBalance || 0)
                      ).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full mt-4"
                onClick={() => setIsAddTokensOpen(true)}
                disabled={!activeSubscription} // 只有订阅的用户才能 add tokens
              >
                {t("tokensSection.purchase")}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      {/* Dialogs */}
      <AddTokensDialog open={isAddTokensOpen} onOpenChange={setIsAddTokensOpen} />
    </div>
  );
}
