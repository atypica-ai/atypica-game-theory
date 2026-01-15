# Features Documentation App

This directory contains the product documentation display feature for atypica.AI.

## Structure

```
src/app/(features)/
├── layout.tsx                    # Layout wrapper for features pages
└── features/
    ├── docs-config.ts           # Documentation configuration and metadata
    ├── page.tsx                 # Index page listing all docs
    └── [slug]/
        └── page.tsx             # Dynamic route for individual docs
```

## Features

- **Bilingual Support**: Automatically displays Chinese or English version based on user locale
- **Static Generation**: All doc pages are statically generated at build time
- **Categories**: Documents organized into 3 categories:
  - Features (功能特性)
  - Competitors (竞品对比)
  - Guides (使用指南)
- **Markdown Rendering**: Uses streamdown for beautiful markdown rendering
- **Responsive Design**: Works on all screen sizes

## URLs

- Index: `/features`
- Individual doc: `/features/{slug}`

## Adding New Documentation

1. Add markdown files to `docs/product/` with `-zh.md` and `-en.md` suffixes
2. Add entry to `docs-config.ts`:

```typescript
{
  slug: "your-doc-slug",
  titleZh: "中文标题",
  titleEn: "English Title",
  category: "features", // or "competitors" or "guides"
  descriptionZh: "中文描述",
  descriptionEn: "English Description",
  filePathZh: "docs/product/your-doc-zh.md",
  filePathEn: "docs/product/your-doc-en.md",
}
```

3. The page will be automatically available at `/features/your-doc-slug`

## Development

Run the dev server to preview:

```bash
pnpm dev
```

Then visit:
- http://localhost:3000/features (index)
- http://localhost:3000/features/scout-agent (example doc)
