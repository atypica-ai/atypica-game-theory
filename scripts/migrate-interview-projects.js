const { PrismaClient } = require("../src/prisma/client");

const prisma = new PrismaClient();

async function migrateInterviewProjects() {
  try {
    const interviewProjects = await prisma.interviewProjectLegacy.findMany({
      orderBy: { id: "asc" },
    });
    for (const legacyProject of interviewProjects) {
      console.log("---");
      const legacyCollectSessions = await prisma.interviewSessionLegacy.findMany({
        where: {
          projectId: legacyProject.id,
          userChatId: { not: null },
          kind: "collect",
        },
      });
      if (!legacyCollectSessions.length) {
        console.log(`No sessions found for project ${legacyProject.id}, skipping`);
        continue;
      }
      console.log(`${legacyCollectSessions.length} sessions found for project ${legacyProject.id}`);
      const objectives = legacyProject.objectives?.toString()
        ? `\n##Objectives:\n\n${legacyProject.objectives}`
        : "";
      const brief = `#${legacyProject.title}\n${legacyProject.brief ? `\n${legacyProject.brief}\n` : ""}${objectives}`;
      console.log(brief);
      const token = `legacy-project-${legacyProject.id}`;
      const project = await prisma.interviewProject.upsert({
        where: { token },
        create: {
          userId: legacyProject.userId,
          token,
          brief,
          createdAt: legacyProject.createdAt,
          updatedAt: legacyProject.updatedAt,
        },
        update: { brief },
      });
      for (const legacySession of legacyCollectSessions) {
        await prisma.interviewSession.create({
          data: {
            title: legacySession.title,
            projectId: project.id,
            userChatId: legacySession.userChatId,
            intervieweeUserId: null,
            intervieweePersonaId: null,
            createdAt: legacySession.createdAt,
            updatedAt: legacySession.updatedAt,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error migrating interview projects:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await migrateInterviewProjects();
}

main().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
