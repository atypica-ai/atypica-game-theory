# Features Documentation Pages

This directory contains the features documentation pages that dynamically load markdown content from the `docs/` directory.

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
  "/(features)/features/[slug]": ["./docs/**/*"],
}
```

## Why These Are Needed

- Features pages use `fs.readFile` to load markdown files at runtime
- The `docs/` directory must be present in the Docker image
- `.dockerignore` was excluding `docs`, causing 404 errors in production
- All three configurations work together to ensure `docs` is available at runtime
