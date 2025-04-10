import { authOptions } from "@/lib/auth";
import { prepareDBForInterview, runInterview } from "@/tools/experts/interviewChat";
import { waitUntil } from "@vercel/functions";
import { getServerSession } from "next-auth";
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

  const { analystInterviewId, interviewUserChatId, prompt } = await prepareDBForInterview({
    userId,
    personaId,
    analystId,
  });

  waitUntil(
    new Promise(async (resolve, reject) => {
      let stop = false;
      const start = Date.now();
      const tick = () => {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - start) / 1000);
        if (elapsedSeconds > 600) {
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
        abortSignal: req.signal,
        statReport: async () => {},
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
