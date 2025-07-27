1. Delete all migration folders in the ./prisma/migrations directory (but keep migration_lock.toml)

```bash
# Delete all migration folders but preserve migration_lock.toml
find ./prisma/migrations -mindepth 1 -maxdepth 1 -type d -exec rm -rf {} +
```

2. **For dev environments only:** Clean up the migration history in the database by deleting all records from the `_prisma_migrations` table. This is because `migrate dev` (used in development/testing) checks for consistency between migration files and database records. Since we've deleted the old migration files, `migrate dev` would fail if it finds orphaned migration records in the database.

```sql
-- Connect to your test database and run:
DELETE FROM "_prisma_migrations";
```

Note: This cleanup is **not needed for production environments** because production uses `migrate deploy`, which only applies pending migrations without performing consistency checks.

3. Create a new empty directory in the ./prisma/migrations directory. In this guide this will be called 000000000000_squashed_migrations. Inside this, add a new empty migration.sql file.

```bash
mkdir -p ./prisma/migrations/20250628000000_init
# mkdir -p ./prisma/migrations/000000000000_squashed_migrations
echo '' > ./prisma/migrations/20250628000000_init/migration.sql
```

4. Create a single migration that takes you:

- from an empty database
- to the current state of the production database schema as described in your ./prisma/schema.prisma file
- and outputs this to the migration.sql file created above

You can do this using the migrate diff command. From the root directory of your project, run the following command:

```bash
npx prisma migrate diff \
 --from-empty \
 --to-schema-datamodel ./prisma/schema.prisma \
 --script > ./prisma/migrations/20250628000000_init/migration.sql
```

**Important:** After generating the squashed migration, you may need to manually fix certain index types. For example, if you're using vector embeddings with pgvector, Prisma will generate standard indexes instead of the required HNSW indexes:

```sql
-- Prisma generates (incorrect):
-- CREATE INDEX "Persona_embedding_idx" ON "Persona"("embedding");
-- Manually replace with (correct):
CREATE INDEX "Persona_embedding_idx" on "Persona" USING hnsw ("embedding" vector_cosine_ops);
```

5. Mark this migration as having been applied on production, to prevent it from being run there:

**Execute the following command on all environments:**

```bash
npx prisma migrate resolve --applied 20250628000000_init
```
