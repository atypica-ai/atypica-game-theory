"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { UserSubscription, UserSubscriptionExtra } from "@/prisma/client";
import { CalendarIcon, CircleDollarSignIcon, CreditCardIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { AddTokensDialog } from "../payment/components/AddTokensDialog";
import { SubscriptionDialog } from "../payment/components/SubscriptionDialog";
import { PaymentHistory } from "./PaymentHistory";
import { TokensHistory } from "./TokensHistory";

export function AccountPageClient({
  userTokens,
  subscription,
}: {
  userTokens: {
    permanentBalance: number;
    monthlyBalance: number;
    monthlyResetAt: Date | null;
  } | null;
  subscription:
    | (Omit<UserSubscription, "extra"> & {
        extra: UserSubscriptionExtra;
      })
    | null;
}) {
  const t = useTranslations("AccountPage");
  const locale = useLocale();
  const [isAddTokensOpen, setIsAddTokensOpen] = useState(false);
  const [isSubscribeOpen, setIsSubscribeOpen] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin py-6">
      <div className="container max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{t("title")}</h1>

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
                    {subscription
                      ? `${t("subscriptionSection.proPlan")}` //(${subscription.plan})
                      : t("subscriptionSection.notSubscribed")}
                  </div>
                </div>

                {subscription && (
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

                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        {t("subscriptionSection.expires")}
                      </div>
                      <div className="font-medium flex items-center">
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                        {subscription.endsAt
                          ? formatDate(subscription.endsAt, locale)
                          : t("subscriptionSection.neverExpires")}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
            <CardFooter>
              {subscription?.extra?.invoice ? (
                <div className="w-full mt-4 text-center px-2 py-1.5 text-sm rounded-md border bg-background shadow-xs dark:bg-input/30 dark:border-input">
                  {t("subscriptionSection.autoRenew")}
                </div>
              ) : (
                <Button className="w-full mt-4" onClick={() => setIsSubscribeOpen(true)}>
                  {subscription ? t("subscriptionSection.renew") : t("subscriptionSection.upgrade")}
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
              <Button className="w-full mt-4" onClick={() => setIsAddTokensOpen(true)}>
                {t("tokensSection.purchase")}
              </Button>
            </CardFooter>
          </Card>
        </div>
        <Tabs defaultValue="Tokens" className="mb-6">
          <TabsList>
            <TabsTrigger value="Tokens">{t("tokensHistorySection.title")}</TabsTrigger>
            <TabsTrigger value="Payments">{t("paymentRecordsSection.title")}</TabsTrigger>
          </TabsList>
          <TabsContent value="Tokens" className="mt-4">
            <TokensHistory />
          </TabsContent>
          <TabsContent value="Payments" className="mt-4">
            <PaymentHistory />
          </TabsContent>
        </Tabs>
      </div>
      {/* Dialogs */}
      <AddTokensDialog open={isAddTokensOpen} onOpenChange={setIsAddTokensOpen} />
      <SubscriptionDialog open={isSubscribeOpen} onOpenChange={setIsSubscribeOpen} />
    </div>
  );
}
