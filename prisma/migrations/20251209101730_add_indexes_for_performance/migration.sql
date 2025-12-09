-- CreateIndex
CREATE INDEX "Analyst_userId_idx" ON "Analyst"("userId");

-- CreateIndex
CREATE INDEX "AnalystPodcast_analystId_idx" ON "AnalystPodcast"("analystId");

-- CreateIndex
CREATE INDEX "AnalystReport_analystId_idx" ON "AnalystReport"("analystId");

-- CreateIndex
CREATE INDEX "PaymentRecord_userId_idx" ON "PaymentRecord"("userId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_teamId_idx" ON "Subscription"("teamId");

-- CreateIndex
CREATE INDEX "TokensAccount_userId_idx" ON "TokensAccount"("userId");

-- CreateIndex
CREATE INDEX "UserChat_userId_idx" ON "UserChat"("userId");
