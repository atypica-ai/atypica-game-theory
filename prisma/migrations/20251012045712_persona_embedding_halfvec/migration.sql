-- Delete existing index
DROP INDEX IF EXISTS "Persona_embedding_idx";

-- Convert column type to halfvec
ALTER TABLE "Persona"
ALTER COLUMN "embedding" TYPE halfvec (1024) USING "embedding"::halfvec;

-- Create halfvec index
CREATE INDEX "Persona_embedding_idx" ON "Persona"
USING hnsw ("embedding" halfvec_cosine_ops)
WITH (m = 16, ef_construction = 64);
