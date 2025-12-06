import "../mock-server-only";

import { loadEnvConfig } from "@next/env";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

interface ExportedProject {
  version: string;
  exportedAt: string;
  project: {
    token: string;
    brief: string;
    extra: any;
    createdAt: string;
    updatedAt: string;
  };
  sessions: Array<{
    title: string;
    intervieweeUserId: string | null; // "[PLACEHOLDER]" if original has userId
    intervieweePersonaId: string | null; // "[PLACEHOLDER]" if original has personaId
    extra: any;
    createdAt: string;
    updatedAt: string;
    userChat: {
      token: string;
      title: string;
      kind: string;
      backgroundToken: string | null;
      extra: any;
      createdAt: string;
      updatedAt: string;
      messages: Array<{
        messageId: string;
        role: string;
        content: string;
        parts: any;
        extra: any;
        attachments: any;
        createdAt: string;
        updatedAt: string;
      }>;
    } | null;
  }>;
}

async function exportInterviewProject(projectToken: string) {
  // 确保在 loadEnvConfig 之后再导入依赖 env 的模块
  const { prisma } = await import("@/prisma/prisma");

  console.log(`🔍 Searching for project with token: ${projectToken}`);

  // Query project with all related data
  const project = await prisma.interviewProject.findUnique({
    where: { token: projectToken },
    include: {
      sessions: {
        include: {
          userChat: {
            include: {
              messages: {
                orderBy: { id: "asc" },
              },
            },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!project) {
    console.error(`❌ Project not found with token: ${projectToken}`);
    process.exit(1);
  }

  console.log(`✅ Found project: ID ${project.id}`);
  console.log(
    `   Brief: ${project.brief.substring(0, 100)}${project.brief.length > 100 ? "..." : ""}`,
  );
  console.log(`   Sessions: ${project.sessions.length}`);

  // Count total messages
  const totalMessages = project.sessions.reduce(
    (sum, session) => sum + (session.userChat?.messages.length || 0),
    0,
  );
  console.log(`   Messages: ${totalMessages}`);

  // Build export data structure
  const exportData: ExportedProject = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    project: {
      token: project.token,
      brief: project.brief,
      extra: project.extra,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    },
    sessions: project.sessions.map((session) => ({
      title: session.title,
      // Mark which field originally had value with [PLACEHOLDER]
      intervieweeUserId: session.intervieweeUserId ? "[PLACEHOLDER]" : null,
      intervieweePersonaId: session.intervieweePersonaId ? "[PLACEHOLDER]" : null,
      extra: session.extra,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      userChat: session.userChat
        ? {
            token: session.userChat.token,
            title: session.userChat.title,
            kind: session.userChat.kind,
            backgroundToken: session.userChat.backgroundToken,
            extra: session.userChat.extra,
            createdAt: session.userChat.createdAt.toISOString(),
            updatedAt: session.userChat.updatedAt.toISOString(),
            messages: session.userChat.messages.map((msg) => ({
              messageId: msg.messageId,
              role: msg.role,
              content: msg.content,
              parts: msg.parts,
              extra: msg.extra,
              attachments: msg.attachments,
              createdAt: msg.createdAt.toISOString(),
              updatedAt: msg.updatedAt.toISOString(),
            })),
          }
        : null,
    })),
  };

  // Create exports directory if not exists
  const exportsDir = join(__dirname, "exports");
  if (!existsSync(exportsDir)) {
    mkdirSync(exportsDir, { recursive: true });
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const filename = `interview-project-${projectToken}-${timestamp}.json`;
  const filepath = join(exportsDir, filename);

  // Write to file
  writeFileSync(filepath, JSON.stringify(exportData, null, 2), "utf-8");

  console.log(`\n✨ Export completed successfully!`);
  console.log(`📁 File saved to: ${filepath}`);
  console.log(`📊 Export statistics:`);
  console.log(`   - Sessions: ${exportData.sessions.length}`);
  console.log(`   - Messages: ${totalMessages}`);
  console.log(
    `   - File size: ${(Buffer.byteLength(JSON.stringify(exportData)) / 1024).toFixed(2)} KB`,
  );
}

async function main() {
  loadEnvConfig(process.cwd());
  const { prisma } = await import("@/prisma/prisma");

  const args = process.argv.slice(2);
  const projectToken = args[0];

  if (!projectToken) {
    console.error("❌ Usage: pnpm tsx scripts/dumps/export-interview-project.ts <project-token>");
    process.exit(1);
  }

  try {
    await exportInterviewProject(projectToken);
  } catch (error) {
    console.error("❌ Export failed:", error);
    process.exit(1);
  } finally {
    // import 的是同一个 global 实例，所以这里 disconnect 的就是全局的
    await prisma.$disconnect();
  }
}

main().catch(console.error);
