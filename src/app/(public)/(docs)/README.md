# Documentation Pages

This directory contains the documentation pages (features, FAQ, guides) that dynamically load markdown content from the `docs/` directory.

## Required Configuration

These pages require special configuration to work in Docker/standalone builds:

### 1. `.dockerignore`

Must **NOT** exclude the `docs` directory:

```dockerignore
# docs - required for features pages (must be included in Docker build)
```

### 2. `Dockerfile`

Must manually copy `docs` directory to runner stage:

```dockerfile
# Copy docs directory for runtime access (required for features pages)
COPY --from=builder --chown=nextjs:nodejs /app/docs ./docs
```

### 3. `next.config.ts`

Must include `docs` in file tracing:

```typescript
outputFileTracingIncludes: {
  "/(docs)/features/[slug]": ["./docs/**/*"],
  "/(docs)/faq/[slug]": ["./docs/**/*"],
  "/(docs)/guides/[slug]": ["./docs/**/*"],
}
```

## Why These Are Needed

- Documentation pages (features, FAQ, guides) use `fs.readFile` to load markdown files at runtime
- All documentation pages use dynamic [slug] routing to display individual documents
- The `docs/` directory must be present in the Docker image
- `.dockerignore` was excluding `docs`, causing 404 errors in production
- All three configurations work together to ensure `docs` is available at runtime

## Directory Structure

```
src/app/(docs)/
├── types.ts                          # Shared TypeScript types
├── display-category-mapping.ts      # Category mapping for FAQ/guides
├── features/
│   ├── docs-config.ts               # 44 docs (10 features + 34 competitors)
│   ├── page.tsx                     # List page with category tabs
│   └── [slug]/page.tsx              # Individual feature/competitor pages
├── faq/
│   ├── docs-config.ts               # 19 FAQ documents
│   ├── page.tsx                     # List page with category sections
│   └── [slug]/page.tsx              # Individual FAQ pages
└── guides/
    ├── docs-config.ts               # 31 guide documents
    ├── page.tsx                     # List page with hero card
    └── [slug]/page.tsx              # Individual guide pages
```
