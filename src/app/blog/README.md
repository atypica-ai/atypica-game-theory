# Blog System

## Overview

atypica.AI's blog system syncs articles from Substack RSS feed to the database, with automatic translation to Chinese.

## Architecture

- **Data Source**: Substack RSS feed (`https://blog.atypica.ai/feed`)
- **Storage**: PostgreSQL database (`BlogArticle` table)
- **Translation**: Claude Haiku 4.5 translates English HTML to Chinese Markdown
- **Rendering**: Streamdown component for both HTML and Markdown content

## Database Schema

```prisma
model BlogArticle {
  id          Int       @id @default(autoincrement())
  title       String    @db.VarChar(255)
  content     String    @db.Text
  slug        String    @db.VarChar(255)
  publishedAt DateTime? @db.Timestamptz(6)
  locale      String    @db.VarChar(16)  // "en-US" | "zh-CN"
  extra       Json      @default("{}")   // See BlogArticleExtra

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([locale, slug])
  @@index([locale, publishedAt])
}
```

### Extra Field Structure

```typescript
export type BlogArticleExtra = Partial<{
  contentType: "html" | "markdown";  // en-US: HTML, zh-CN: Markdown
  coverObjectUrl: string;            // Substack cover image URL
  originalUrl: string;               // Link to original Substack article
}>;
```

## Sync API

### Endpoint

```
POST /blog/api/sync
```

### Authentication

Requires `x-internal-secret` header matching `INTERNAL_API_SECRET` environment variable.

### Behavior

1. Fetches latest 20 posts from Substack RSS
2. For each post:
   - Checks if en-US version exists (skips if already synced)
   - Creates en-US version with original HTML content
   - Translates title and content to Chinese using Claude Haiku 4.5
   - Creates zh-CN version with Markdown content
3. Returns sync statistics

### Response

```json
{
  "success": true,
  "totalPosts": 20,
  "synced": 5,
  "skipped": 15,
  "translated": 5,
  "errors": [],
  "timestamp": "2024-01-08T12:00:00.000Z"
}
```

### Usage

**Local Testing**:
```bash
# Make sure your dev server is running (pnpm dev)
curl -X POST http://localhost:3000/blog/api/sync \
  -H "x-internal-secret: $(grep INTERNAL_API_SECRET .env.local | cut -d '=' -f2)"
```

Or with explicit secret:
```bash
curl -X POST http://localhost:3000/blog/api/sync \
  -H "x-internal-secret: your_secret_here"
```

**Production Trigger**:
```bash
curl -X POST https://atypica.ai/blog/api/sync \
  -H "x-internal-secret: $INTERNAL_API_SECRET"
```

**Kubernetes CronJob** (recommended):
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: sync-blog-articles
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: curl
            image: curlimages/curl:latest
            command:
            - /bin/sh
            - -c
            - |
              curl -X POST https://atypica.ai/blog/api/sync \
                -H "x-internal-secret: $INTERNAL_API_SECRET"
```

## Pages

### Blog List (`/blog`)

- Displays articles filtered by current locale
- Shows cover image (if available), title, and publish date
- Sorted by `publishedAt` DESC

### Blog Detail (`/blog/[slug]`)

- Fetches article by `locale` + `slug` (unique constraint)
- Renders content using Streamdown (supports both HTML and Markdown)
- Shows link to original Substack article in footer

## Benefits

1. **No RSS Limitation**: Substack RSS only returns 20 posts, database stores full history
2. **Bilingual Support**: Auto-translates English content to Chinese
3. **Performance**: No external API calls on page load
4. **SEO**: Full control over metadata and content structure

## Files

```
src/app/blog/
├── README.md              # This file
├── api/
│   └── sync/
│       └── route.ts       # Sync API endpoint
├── lib.ts                 # Substack RSS parser (used by sync API)
├── page.tsx               # Blog list page
├── [slug]/
│   ├── page.tsx           # Blog detail page
│   ├── loading.tsx        # Loading state
│   └── not-found.tsx      # 404 page
└── layout.tsx             # Blog layout
```
