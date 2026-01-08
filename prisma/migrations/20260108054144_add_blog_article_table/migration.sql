-- CreateTable
CREATE TABLE "BlogArticle" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "publishedAt" TIMESTAMPTZ(6),
    "locale" VARCHAR(16) NOT NULL,
    "extra" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BlogArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BlogArticle_locale_publishedAt_idx" ON "BlogArticle"("locale", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BlogArticle_locale_slug_key" ON "BlogArticle"("locale", "slug");
