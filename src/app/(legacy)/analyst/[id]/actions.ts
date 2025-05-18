"use server";
import { StatReporter } from "@/ai/tools";
import { prepareDBForInterview, runInterview } from "@/ai/tools/experts/interviewChat";
import { authOptions } from "@/lib/auth";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { getServerSession } from "next-auth";
import { forbidden } from "next/navigation";

export async function batchBackgroundInterview({
  analystId,
  personaIds,
}: {
  analystId: number;
  personaIds: number[];
}): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    forbidden();
  }
  const userId = session.user.id;
  // 确保 analyst 属于当前用户
  const analyst = await prisma.analyst.findUnique({
    where: { id: analystId },
  });
  if (analyst?.userId !== session.user.id) {
    forbidden();
  }

  const abortController = new AbortController();
  const abortSignal = abortController.signal;

  for (const personaId of personaIds) {
    const { analystInterviewId, interviewUserChatId, prompt } = await prepareDBForInterview({
      userId,
      personaId,
      analystId,
      instruction: "",
      // language: "中英皆可",
      language: "中文",
    });

    const interviewLog = rootLogger.child({ interviewUserChatId, analystInterviewId });
    const statReport: StatReporter = async (dimension, value, extra) => {
      interviewLog.info(
        `Stat report in batchBackgroundInterview: ${dimension}=${value} ${JSON.stringify(extra)}`,
      );
    };

    waitUntil(
      new Promise(async (resolve, reject) => {
        let stop = false;
        const start = Date.now();
        const tick = () => {
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - start) / 1000);
          if (elapsedSeconds > 1200) {
            // 20 mins
            console.log(`Interview [${analystInterviewId}] timeout`);
            stop = true;
            reject(new Error("interview timeout"));
          }
          if (stop) {
            console.log(`Interview [${analystInterviewId}] stopped`);
          } else {
            console.log(`Interview [${analystInterviewId}] is ongoing, ${elapsedSeconds} seconds`);
            setTimeout(() => tick(), 5000);
          }
        };
        tick();

        runInterview({
          analystInterviewId,
          interviewUserChatId,
          prompt,
          abortSignal,
          statReport,
          interviewLog,
        })
          .then(() => {
            stop = true;
            resolve(null);
          })
          .catch((error) => {
            stop = true;
            reject(error);
          });
      }),
    );
  }
}
