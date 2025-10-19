// Generate UserProfile for all users without profiles
// Usage: pnpm tsx scripts/upsert-user-profiles.ts

import { loadEnvConfig } from "@next/env";
import "./mock-server-only";

async function main() {
  console.log("Starting upsert-user-profiles script...");

  // Load env config from .env file
  loadEnvConfig(process.cwd());

  // Import after env is loaded
  const { prisma } = await import("@/prisma/prisma");
  const { upsertUserProfile } = await import("@/app/(auth)/lib");

  let totalProcessed = 0;
  let batchNumber = 1;

  while (true) {
    console.log(`\n--- Batch ${batchNumber} ---`);

    // 找到 100 个没有 UserProfile 的用户
    const usersWithoutProfile = await prisma.user.findMany({
      where: {
        profile: null, // UserProfile 不存在
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: 100,
    });

    if (usersWithoutProfile.length === 0) {
      console.log("No more users without profiles found. Script completed!");
      break;
    }

    console.log(`Found ${usersWithoutProfile.length} users without profiles`);

    // 为每个用户创建 UserProfile（并行处理）
    console.log(`Processing ${usersWithoutProfile.length} users in parallel...`);

    const results = await Promise.allSettled(
      usersWithoutProfile.map(async (user) => {
        await upsertUserProfile({ userId: user.id });
        return user;
      }),
    );

    let successCount = 0;
    let errorCount = 0;

    results.forEach((result, index) => {
      const user = usersWithoutProfile[index];
      if (result.status === "fulfilled") {
        successCount++;
        console.log(`✓ Created profile for user ${user.id} (${user.name || user.email})`);
      } else {
        errorCount++;
        console.error(
          `✗ Failed to create profile for user ${user.id}: ${result.reason?.message || result.reason}`,
        );
      }
    });

    totalProcessed += successCount;

    console.log(`Batch ${batchNumber} completed:`);
    console.log(`- Successful: ${successCount}`);
    console.log(`- Errors: ${errorCount}`);
    console.log(`- Total processed so far: ${totalProcessed}`);

    batchNumber++;

    // 如果处理的用户数少于 100，说明已经处理完了
    if (usersWithoutProfile.length < 100) {
      console.log("\nAll users processed!");
      break;
    }

    // 短暂延迟，避免数据库压力过大
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // 最终统计
  const totalUsers = await prisma.user.count();
  const usersWithProfile = await prisma.user.count({
    where: {
      profile: { isNot: null },
    },
  });
  const usersWithoutProfile = totalUsers - usersWithProfile;

  console.log("\n=== Final Statistics ===");
  console.log(`Total users: ${totalUsers}`);
  console.log(`Users with profile: ${usersWithProfile}`);
  console.log(`Users without profile: ${usersWithoutProfile}`);
  console.log(`Total profiles created in this run: ${totalProcessed}`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("Fatal error:", error);
      process.exit(1);
    })
    .finally(() => {
      process.exit(0);
    });
}
