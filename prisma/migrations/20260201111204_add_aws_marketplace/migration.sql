-- CreateTable
CREATE TABLE "AWSMarketplaceCustomer" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "customerIdentifier" VARCHAR(255) NOT NULL,
    "productCode" VARCHAR(255) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dimension" VARCHAR(64),
    "quantity" INTEGER,
    "subscribedAt" TIMESTAMPTZ(6),
    "expiresAt" TIMESTAMPTZ(6),
    "cancelledAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AWSMarketplaceCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AWSMarketplaceEvent" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "eventType" VARCHAR(64) NOT NULL,
    "eventData" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AWSMarketplaceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AWSMarketplaceCustomer_userId_key" ON "AWSMarketplaceCustomer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AWSMarketplaceCustomer_customerIdentifier_key" ON "AWSMarketplaceCustomer"("customerIdentifier");

-- CreateIndex
CREATE INDEX "AWSMarketplaceCustomer_customerIdentifier_idx" ON "AWSMarketplaceCustomer"("customerIdentifier");

-- CreateIndex
CREATE INDEX "AWSMarketplaceCustomer_userId_idx" ON "AWSMarketplaceCustomer"("userId");

-- CreateIndex
CREATE INDEX "AWSMarketplaceEvent_customerId_idx" ON "AWSMarketplaceEvent"("customerId");

-- CreateIndex
CREATE INDEX "AWSMarketplaceEvent_eventType_idx" ON "AWSMarketplaceEvent"("eventType");

-- AddForeignKey
ALTER TABLE "AWSMarketplaceCustomer" ADD CONSTRAINT "AWSMarketplaceCustomer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AWSMarketplaceEvent" ADD CONSTRAINT "AWSMarketplaceEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "AWSMarketplaceCustomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
