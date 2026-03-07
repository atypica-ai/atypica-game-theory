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
  console.log('Fetching distinct pulse categories...');
  const results = await prisma.pulse.findMany({
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });

  console.log('\nAll Pulse Categories:');
  results.forEach((r: { category: string }) => {
    console.log(`  ${r.category}`);
  });

  console.log(`\nTotal: ${results.length} categories`);
  console.log('\n✅ Done!');
  await prisma.$disconnect();
  await pool.end();
}

checkCategories().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
