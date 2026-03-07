import { PrismaClient } from '../src/prisma/generated/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

async function checkCategories() {
  console.log('Fetching all pulse categories...');
  const categories = await prisma.pulseCategory.findMany({
    select: { id: true, name: true },
    orderBy: { id: 'asc' }
  });

  console.log('\nAll Pulse Categories:');
  categories.forEach((cat: { id: number; name: string }) => {
    console.log(`  ID: ${cat.id}, Name: ${cat.name}`);
  });

  console.log('\n✅ Done!');
  await prisma.$disconnect();
  await pool.end();
}

checkCategories().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
