-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- AlterTable
ALTER TABLE "Persona" ADD COLUMN "embedding" vector(1024);

-- 创建向量索引以加速相似性搜索，schema 里只是定义了 @@index([embedding])，这里要人工修改成 hnsw
CREATE INDEX "Persona_embedding_idx" on "Persona" USING hnsw ("embedding" vector_cosine_ops);
