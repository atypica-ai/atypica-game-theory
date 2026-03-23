-- Create shadow database for Prisma migrations
CREATE DATABASE atypica_dev_shadow;

-- Enable pgvector extension in both databases
CREATE EXTENSION IF NOT EXISTS vector;

\connect atypica_dev_shadow;
CREATE EXTENSION IF NOT EXISTS vector;
