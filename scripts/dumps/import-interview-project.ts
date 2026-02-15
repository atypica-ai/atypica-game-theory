import "../mock-server-only";

import { generateToken } from "@/lib/utils";
import type { Prisma } from "@/prisma/client";
import { loadEnvConfig } from "@next/env";
import { existsSync, readFileSync } from "fs";

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

async function importInterviewProject(userId: number, jsonFilePath: string) {
  // 确保在 loadEnvConfig 之后再导入依赖 env 的模块
  const { prisma } = await import("@/prisma/prisma");

  console.log(`📖 Reading import file: ${jsonFilePath}`);

  // Check if file exists
  if (!existsSync(jsonFilePath)) {
    console.error(`❌ File not found: ${jsonFilePath}`);
    process.exit(1);
  }

  // Read and parse JSON file
  const fileContent = readFileSync(jsonFilePath, "utf-8");
  let exportData: ExportedProject;

  try {
    exportData = JSON.parse(fileContent);
  } catch (error) {
    console.error(`❌ Invalid JSON file:`, error);
    process.exit(1);
  }

  // Validate data version
  if (exportData.version !== "1.0") {
    console.error(`❌ Unsupported export version: ${exportData.version}`);
    process.exit(1);
  }

  console.log(`✅ Loaded export data from ${exportData.exportedAt}`);
  console.log(`   Original token: ${exportData.project.token}`);
  console.log(`   Sessions: ${exportData.sessions.length}`);

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    console.error(`❌ User not found with ID: ${userId}`);
    process.exit(1);
  }

  console.log(`✅ Target user: ${user.name} (${user.email || "no email"})`);

  // Generate new tokens
  const newProjectToken = generateToken();
  console.log(`🔑 Generated new project token: ${newProjectToken}`);

  // Count total messages
  const totalMessages = exportData.sessions.reduce(
    (sum, session) => sum + (session.userChat?.messages.length || 0),
    0,
  );

  console.log(`\n📊 Import preview:`);
  console.log(`   - Project: 1`);
  console.log(`   - Sessions: ${exportData.sessions.length}`);
  console.log(`   - UserChats: ${exportData.sessions.filter((s) => s.userChat).length}`);
  console.log(`   - Messages: ${totalMessages}`);

  // Check and create mockup persona (id=1)
  console.log(`\n🔍 Checking mockup persona (id=1)...`);
  let mockupPersona = await prisma.persona.findUnique({
    where: { id: 1 },
  });

  if (!mockupPersona) {
    console.log(`   ⚠️  Persona id=1 not found, creating mockup...`);
    mockupPersona = await prisma.persona.create({
      data: {
        id: 1,
        token: generateToken(),
        name: "导入数据占位角色",
        source: "mockup",
        prompt: "This is a mockup persona for imported interview sessions.",
        tier: 0,
      },
    });
    console.log(`   ✅ Created mockup persona (id=1)`);
  } else {
    console.log(`   ✅ Mockup persona exists (id=1)`);
  }

  // Perform import in transaction
  console.log(`\n🚀 Starting import transaction...`);

  try {
    await prisma.$transaction(
      async (tx) => {
        // Create project with new token
        const createdProject = await tx.interviewProject.create({
          data: {
            token: newProjectToken,
            userId: userId,
            brief: `[IMPORTED] ${exportData.project.brief}`,
            extra: {
              ...(exportData.project.extra as object),
              // @ts-expect-error
              originalToken: exportData.project.token,
              importedAt: new Date().toISOString(),
              importedFrom: exportData.exportedAt,
            },
            // Use current timestamp for project creation
          },
        });

        console.log(`   ✅ Created project (ID: ${createdProject.id})`);

        // Create sessions with their chats and messages
        for (let i = 0; i < exportData.sessions.length; i++) {
          const sessionData = exportData.sessions[i];

          // Create UserChat first if exists
          let userChatId: number;

          if (sessionData.userChat) {
            const newChatToken = generateToken();
            const chat = sessionData.userChat;

            const createdChat = await tx.userChat.create({
              data: {
                token: newChatToken,
                userId: userId,
                title: chat.title,
                kind: chat.kind as any,
                backgroundToken: chat.backgroundToken,
                extra: {
                  ...(chat.extra as object),
                  // @ts-expect-error
                  originalToken: chat.token,
                },
                createdAt: new Date(chat.createdAt),
                updatedAt: new Date(chat.updatedAt),
              },
            });

            userChatId = createdChat.id;

            // Create all messages for this chat
            if (chat.messages.length > 0) {
              const messagesData: Prisma.ChatMessageCreateManyInput[] = chat.messages.map(
                (msg) => ({
                  messageId: generateToken(), // Generate new messageId
                  userChatId: createdChat.id,
                  role: msg.role as any,
                  content: msg.content,
                  parts: msg.parts,
                  extra: {
                    ...(msg.extra as object),
                    originalMessageId: msg.messageId,
                  },
                  attachments: msg.attachments,
                  createdAt: new Date(msg.createdAt),
                  updatedAt: new Date(msg.updatedAt),
                }),
              );

              await tx.chatMessage.createMany({
                data: messagesData,
              });

              console.log(
                `   ✅ Created UserChat (ID: ${createdChat.id}) with ${chat.messages.length} messages`,
              );
            }
          } else {
            // Skip creating UserChat if it doesn't exist
            continue;
          }

          // Create session
          // Check which field originally had value based on [PLACEHOLDER]
          const hasUserId = sessionData.intervieweeUserId === "[PLACEHOLDER]";
          const hasPersonaId = sessionData.intervieweePersonaId === "[PLACEHOLDER]";

          const createdSession = await tx.interviewSession.create({
            data: {
              title: sessionData.title,
              projectId: createdProject.id,
              userChatId: userChatId,
              intervieweeUserId: hasUserId ? userId : null,
              intervieweePersonaId: hasPersonaId ? 1 : null,
              extra: sessionData.extra,
              createdAt: new Date(sessionData.createdAt),
              updatedAt: new Date(sessionData.updatedAt),
            },
          });

          console.log(
            `   ✅ Created session ${i + 1}/${exportData.sessions.length} (ID: ${createdSession.id})`,
          );
        }

        console.log(`\n✨ Transaction completed successfully!`);
      },
      {
        maxWait: 30000, // 30 seconds
        timeout: 60000, // 60 seconds
      },
    );

    console.log(`\n✅ Import completed successfully!`);
    console.log(`📋 New project token: ${newProjectToken}`);
    console.log(`👤 Owner: User ID ${userId}`);
  } catch (error) {
    console.error(`\n❌ Import failed:`, error);
    throw error;
  }
}

async function main() {
  loadEnvConfig(process.cwd());
  const { prisma } = await import("@/prisma/prisma");

  const args = process.argv.slice(2);
  const userIdStr = args[0];
  const jsonFilePath = args[1];

  if (!userIdStr || !jsonFilePath) {
    console.error(
      "❌ Usage: pnpm tsx scripts/dumps/import-interview-project.ts <user-id> <json-file-path>",
    );
    console.error("\nExample:");
    console.error(
      "  pnpm tsx scripts/dumps/import-interview-project.ts 123 scripts/dumps/exports/interview-project-abc123-2025-12-06.json",
    );
    process.exit(1);
  }

  const userId = parseInt(userIdStr, 10);
  if (isNaN(userId)) {
    console.error(`❌ Invalid user ID: ${userIdStr}`);
    process.exit(1);
  }

  try {
    await importInterviewProject(userId, jsonFilePath);
  } catch (error) {
    console.error("❌ Import operation failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
