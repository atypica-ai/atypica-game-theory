import { loadEnvConfig } from "@next/env";
import "./mock-server-only";

import { TInterviewMessageWithTool } from "@/app/(interviewProject)/types";

async function listCities() {
  // load env config from .env file
  loadEnvConfig(process.cwd());
  const { prisma } = await import("@/prisma/prisma");
  const { convertDBMessageToAIMessage } = await import("@/ai/messageUtils");

  const interviewProject = await prisma.interviewProject.findUniqueOrThrow({
    where: { token: "FApusdYsrTmTAtuK" },
    include: {
      sessions: {
        include: {
          userChat: {
            include: {
              messages: true,
            },
          },
        },
      },
    },
  });
  const stats: Record<string, number> = {};
  for (const session of interviewProject.sessions) {
    console.log(session.id);
    if (!session.userChat) {
      continue;
    }
    // const userChat = await prisma.userChat.findUniqueOrThrow({
    //   where: {
    //     id: session.userChatId,
    //   },
    //   include: {
    //     messages: true,
    //   },
    // });
    let completed = false;
    let answer: string | null = null;
    const userChat = session.userChat;
    for (const message of userChat.messages.map(convertDBMessageToAIMessage)) {
      for (const part of (message as TInterviewMessageWithTool).parts) {
        if (
          !answer &&
          part.type === "tool-selectQuestion" &&
          part.state === "output-available" &&
          part.output.question.type === "single-choice" &&
          /哪个城市/.test(part.output.question.text)
        ) {
          console.log(part.output.answer);
          answer =
            typeof part.output.answer === "string"
              ? part.output.answer
              : part.output.answer.join(", ");
        }
        if (part.type === "tool-endInterview") {
          completed = true;
        }
      }
    }
    if (completed && answer) {
      stats[answer] = (stats[answer] || 0) + 1;
      console.log(stats);
    }
  }
  for (const city in stats) {
    console.log(`${city}: ${stats[city]}`);
  }
}

async function listAnwsers() {
  // load env config from .env file
  loadEnvConfig(process.cwd());
  const { prisma } = await import("@/prisma/prisma");
  const { convertDBMessageToAIMessage } = await import("@/ai/messageUtils");

  // 姓名和性别从开场表单里提取
  const questions: string[] = ["姓名", "性别"];
  const anwsers: Record<string, Record<string, string>> = {};

  const interviewProject = await prisma.interviewProject.findUniqueOrThrow({
    where: { token: "FApusdYsrTmTAtuK" },
    include: {
      // sessions: { take: 5 },
      sessions: true,
    },
  });

  for (const session of interviewProject.sessions) {
    console.log(session.id);
    if (!session.userChatId) {
      continue;
    }
    const userChat = await prisma.userChat.findUniqueOrThrow({
      where: {
        id: session.userChatId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        messages: true,
      },
    });
    const name = userChat.user.email ?? userChat.user.name ?? userChat.user.id;
    if (!anwsers[name]) {
      anwsers[name] = {};
    }
    for (const message of userChat.messages.map(convertDBMessageToAIMessage)) {
      for (const part of (message as TInterviewMessageWithTool).parts) {
        if (part.type === "tool-selectQuestion" && part.state === "output-available") {
          const question = part.output.question.text;
          const answer =
            typeof part.output.answer === "string"
              ? part.output.answer
              : part.output.answer.join(", ");
          if (!questions.includes(question)) {
            questions.push(question);
          }
          anwsers[name][question] = answer;
        }
        if (
          part.type === "tool-requestInteractionForm" &&
          part.state === "output-available" &&
          part.output.formResponses
        ) {
          anwsers[name]["姓名"] = part.output.formResponses.name;
          anwsers[name]["性别"] = part.output.formResponses.gender;
        }
      }
    }
  }

  const sanitizeCSV = (str: string) => {
    if (!str) return "";
    // Escape double quotes by doubling them
    const escaped = str.replace(/"/g, '""');
    // If string contains comma, newline, or double quote, wrap in quotes
    if (
      escaped.includes(",") ||
      escaped.includes("\n") ||
      escaped.includes("\r") ||
      str.includes('"')
    ) {
      return `"${escaped}"`;
    }
    return escaped;
  };
  const names = Object.keys(anwsers);
  console.log("Q," + names.map(sanitizeCSV).join(","));
  for (const question of questions) {
    const row = [sanitizeCSV(question)];
    for (const name of names) {
      const answer = anwsers[name][question];
      row.push(sanitizeCSV(answer));
    }
    console.log(row.join(","));
  }
}

async function listGenders() {
  // load env config from .env file
  loadEnvConfig(process.cwd());
  const { prisma } = await import("@/prisma/prisma");
  const { convertDBMessageToAIMessage } = await import("@/ai/messageUtils");

  const interviewProject = await prisma.interviewProject.findUniqueOrThrow({
    where: { token: "FApusdYsrTmTAtuK" },
    include: {
      sessions: {
        include: {
          userChat: {
            include: {
              messages: true,
            },
          },
        },
      },
    },
  });
  const stats: Record<string, number> = {};
  for (const session of interviewProject.sessions) {
    console.log(session.id);
    if (!session.userChat) {
      continue;
    }
    let answer: string | null = null;
    const userChat = session.userChat;
    for (const message of userChat.messages.map(convertDBMessageToAIMessage)) {
      for (const part of (message as TInterviewMessageWithTool).parts) {
        if (
          !answer &&
          part.type === "tool-requestInteractionForm" &&
          part.state === "output-available" &&
          part.output.formResponses
        ) {
          console.log(part.output.formResponses);
          answer = part.output.formResponses.gender;
        }
      }
    }
    if (answer) {
      stats[answer] = (stats[answer] || 0) + 1;
      console.log(stats);
    }
  }
  for (const gender in stats) {
    console.log(`${gender}: ${stats[gender]}`);
  }
}

async function main() {
  // load env config from .env file
  loadEnvConfig(process.cwd());
  // await listGenders();
  // await listCities();
  await listAnwsers();
}

if (require.main === module) {
  main().finally(() => {
    process.exit(0);
  });
}
