const { PrismaClient } = require("../src/prisma/client");

const prisma = new PrismaClient();

async function migrateAnalystAttachments() {
  try {
    // Find all analysts that have attachments
    const analysts = await prisma.analyst.findMany({
      where: {
        AND: [{ attachments: { not: null } }, { attachments: { not: [] } }],
      },
      select: {
        id: true,
        userId: true,
        attachments: true,
        createdAt: true,
      },
      orderBy: { id: "asc" },
    });

    console.log(`Found ${analysts.length} analysts with attachments`);

    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalInserted = 0;

    for (const analyst of analysts) {
      console.log(`Processing analyst ${analyst.id}...`);

      if (!analyst.attachments || !Array.isArray(analyst.attachments)) {
        console.log(`  Skipping analyst ${analyst.id}: invalid attachments format`);
        totalSkipped++;
        continue;
      }

      for (const attachment of analyst.attachments) {
        totalProcessed++;

        if (!attachment.objectUrl) {
          console.log(`  Skipping attachment without objectUrl`);
          totalSkipped++;
          continue;
        }

        // Check if AttachmentFile with same objectUrl already exists
        const existingFile = await prisma.attachmentFile.findUnique({
          where: {
            objectUrl: attachment.objectUrl,
          },
        });

        if (existingFile) {
          console.log(`  Skipping ${attachment.objectUrl}: already exists`);
          totalSkipped++;
          continue;
        }

        // Extract attachment properties with defaults
        const name = attachment.name || attachment.fileName || "Unknown File";
        const mimeType = attachment.mimeType || attachment.type || "application/octet-stream";
        const size = attachment.size || 0;

        try {
          // Insert new AttachmentFile
          const newFile = await prisma.attachmentFile.create({
            data: {
              userId: analyst.userId,
              name: name.substring(0, 255), // Ensure it fits in VARCHAR(255)
              mimeType: mimeType.substring(0, 255), // Ensure it fits in VARCHAR(255)
              size: parseInt(size) || 0,
              objectUrl: attachment.objectUrl,
              extra: {
                migratedFromAnalyst: analyst.id,
              },
              createdAt: analyst.createdAt, // Use analyst's creation time
              updatedAt: analyst.createdAt,
            },
          });

          console.log(`  ✓ Inserted attachment: ${newFile.name} (${newFile.objectUrl})`);
          totalInserted++;
        } catch (error) {
          console.error(`  ✗ Failed to insert attachment ${attachment.objectUrl}:`, error.message);
          totalSkipped++;
        }
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Total attachments processed: ${totalProcessed}`);
    console.log(`Total attachments inserted: ${totalInserted}`);
    console.log(`Total attachments skipped: ${totalSkipped}`);
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error migrating analyst attachments:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await migrateAnalystAttachments();
}

main().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
