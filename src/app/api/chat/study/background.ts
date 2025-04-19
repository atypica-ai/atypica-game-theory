import { prisma } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";
import { StreamTextResult, ToolSet } from "ai";

export async function raceForUserChat(studyUserChatId: number) {
  // race, 争取 userchat 的写入
  const backgroundToken = new Date().valueOf().toString();

  const clearBackgroundToken = async () => {
    try {
      await prisma.userChat.update({
        where: { id: studyUserChatId, backgroundToken },
        data: { backgroundToken: null },
      });
    } catch (error) {
      console.log(
        `[${studyUserChatId}] Failed to clear background token`,
        (error as Error).message,
      );
    }
  };

  // 如果 backgroundToken 不是 null，抛出异常，阻止继续对话
  await prisma.userChat.update({
    where: { id: studyUserChatId, backgroundToken: null },
    data: { backgroundToken },
  });

  return { clearBackgroundToken, backgroundToken };
}

export function backgroundChatUntilCancel<TOOLS extends ToolSet, PARTIAL_OUTPUT>({
  userId,
  studyUserChatId,
  backgroundToken,
  abortController,
  streamTextResult,
  clearBackgroundToken,
}: {
  userId: number;
  studyUserChatId: number;
  backgroundToken: string;
  abortController: AbortController;
  streamTextResult: StreamTextResult<TOOLS, PARTIAL_OUTPUT>;
  clearBackgroundToken: () => Promise<void>;
}) {
  let stop = false;

  waitUntil(
    new Promise((resolve) => {
      async function checkBackgroundToken() {
        const userChat = await prisma.userChat.findUniqueOrThrow({
          where: { id: studyUserChatId },
          select: { backgroundToken: true },
        });
        if (stop) {
          console.log(`StudyChat [${studyUserChatId}] stopped, quit checkBackgroundToken`);
        } else if (userChat.backgroundToken !== backgroundToken) {
          console.log(
            `StudyChat [${studyUserChatId}] background token cleared or changed, aborting background running`,
          );
          try {
            abortController.abort();
          } catch (error) {
            console.log(`StudyChat [${studyUserChatId}] Error during abort:`, error);
          }
          resolve(null);
        } else {
          setTimeout(() => checkBackgroundToken(), 1000);
        }
      }
      checkBackgroundToken();
    }),
  );

  // 还有个方法，after，在这里可能更好
  // https://nextjs.org/docs/app/api-reference/functions/after#alternatives
  waitUntil(
    new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - start) / 1000);
        if (elapsedSeconds > 3600) {
          // 60 mins
          console.log(`StudyChat [${studyUserChatId}] timeout`);
          stop = true;
          reject(new Error("StudyChat timeout"));
        }
        if (stop) {
          console.log(`StudyChat [${studyUserChatId}] stopped`);
        } else {
          console.log(`StudyChat [${studyUserChatId}] is ongoing, ${elapsedSeconds} seconds`);
          setTimeout(() => tick(), 5000);
        }
      };
      tick();
      // consume the stream to ensure it runs to completion & triggers onFinish
      // even when the client response is aborted:
      streamTextResult
        .consumeStream()
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

  waitUntil(
    new Promise((resolve) => {
      async function checkUserTokensBalance() {
        const userTokens = await prisma.userTokens.findUniqueOrThrow({
          where: { userId },
        });
        if (stop) {
          console.log(`StudyChat [${studyUserChatId}] stopped, quit checkUserTokensBalance`);
        } else if (userTokens.balance <= 0) {
          console.log(
            `StudyChat [${studyUserChatId}] user is out of balance, aborting background running`,
          );
          //
          try {
            abortController.abort(); // stop streamText
            clearBackgroundToken(); // stop checkBackgroundToken
            stop = true; // stop tick
          } catch (error) {
            console.log(`StudyChat [${studyUserChatId}] Error during abort:`, error);
          }
          resolve(null);
        } else {
          setTimeout(() => checkUserTokensBalance(), 1000);
        }
      }
      checkUserTokensBalance();
    }),
  );

  return {};
}
