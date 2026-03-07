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

async function updatePulseHeatDeltas() {
  console.log('Fetching all pulses...');
  const pulses = await prisma.pulse.findMany({
    select: { id: true, title: true, heatDelta: true },
    orderBy: { id: 'asc' }
  });

  console.log(`Found ${pulses.length} pulses`);

  // Distribution strategy:
  // - 30% NEW (null)
  // - 40% near ±10% (-0.15 to +0.15)
  // - 20% medium changes (±15% to ±40%)
  // - 10% large changes (±40% to ±90%)

  const updates = pulses.map((pulse) => {
    const rand = Math.random();
    let newDelta: number | null;

    if (rand < 0.30) {
      // 30% NEW
      newDelta = null;
    } else if (rand < 0.70) {
      // 40% near ±10%
      newDelta = (Math.random() - 0.5) * 0.3; // -0.15 to +0.15
    } else if (rand < 0.90) {
      // 20% medium changes
      const sign = Math.random() > 0.5 ? 1 : -1;
      newDelta = sign * (0.15 + Math.random() * 0.25); // ±0.15 to ±0.40
    } else {
      // 10% large changes
      const sign = Math.random() > 0.5 ? 1 : -1;
      newDelta = sign * (0.40 + Math.random() * 0.50); // ±0.40 to ±0.90
    }

    // Round to 2 decimal places
    if (newDelta !== null) {
      newDelta = Math.round(newDelta * 100) / 100;
    }

    return { id: pulse.id, title: pulse.title, newDelta };
  });

  console.log('\nSample distribution:');
  const nullCount = updates.filter(u => u.newDelta === null).length;
  const smallCount = updates.filter(u => u.newDelta !== null && Math.abs(u.newDelta) <= 0.15).length;
  const mediumCount = updates.filter(u => u.newDelta !== null && Math.abs(u.newDelta) > 0.15 && Math.abs(u.newDelta) <= 0.40).length;
  const largeCount = updates.filter(u => u.newDelta !== null && Math.abs(u.newDelta) > 0.40).length;

  console.log(`NEW (null): ${nullCount} (${(nullCount/updates.length*100).toFixed(1)}%)`);
  console.log(`Small (±15%): ${smallCount} (${(smallCount/updates.length*100).toFixed(1)}%)`);
  console.log(`Medium (±15-40%): ${mediumCount} (${(mediumCount/updates.length*100).toFixed(1)}%)`);
  console.log(`Large (±40-90%): ${largeCount} (${(largeCount/updates.length*100).toFixed(1)}%)`);

  console.log('\nSample updates (first 10):');
  updates.slice(0, 10).forEach(u => {
    const deltaStr = u.newDelta === null ? 'NEW' : `${(u.newDelta * 100).toFixed(0)}%`;
    console.log(`${u.title.substring(0, 40).padEnd(40)} -> ${deltaStr}`);
  });

  console.log('\nUpdating database...');
  for (const update of updates) {
    await prisma.pulse.update({
      where: { id: update.id },
      data: { heatDelta: update.newDelta }
    });
  }

  console.log('✅ All pulses updated successfully!');

  await prisma.$disconnect();
}

updatePulseHeatDeltas().catch((error) => {
  console.error('Error updating pulses:', error);
  process.exit(1);
});
