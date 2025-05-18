import { prepareDBForInterview, runInterview } from "@/ai/tools/experts/interviewChat";
import { authOptions } from "@/lib/auth";
import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { getServerSession } from "next-auth";
import { forbidden } from "next/navigation";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const payload = await req.json();
  const analystId = parseInt(payload["analystId"]);
  const personaId = parseInt(payload["personaId"]);

  // 确保 analyst 属于当前用户
  const analyst = await prisma.analyst.findUnique({
    where: { id: analystId },
  });
  if (analyst?.userId !== session.user.id) {
    forbidden();
  }

  const { analystInterviewId, interviewUserChatId, prompt } = await prepareDBForInterview({
    userId,
    personaId,
    analystId,
    instruction: "",
    // language: "中英皆可",
    language: "中文",
  });

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
        abortSignal: req.signal, // 因为请求了以后立即进入 background，这个 signal 不会产生什么影响
        statReport: async () => {},
        interviewLog: rootLogger.child({ interviewUserChatId, analystInterviewId }),
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

  return NextResponse.json({ message: "POST request received" });
}
