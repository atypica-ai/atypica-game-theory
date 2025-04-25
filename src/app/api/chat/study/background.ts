import { rootLogger } from "@/lib/logging";
import { prisma } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";
import { StreamTextResult, ToolSet } from "ai";

export async function raceForUserChat(studyUserChatId: number) {
  const logger = rootLogger.child({ studyUserChatId });
  // race, 争取 userchat 的写入
  const backgroundToken = new Date().valueOf().toString();

  const clearBackgroundToken = async () => {
    try {
      await prisma.userChat.update({
        where: { id: studyUserChatId, backgroundToken },
        data: { backgroundToken: null },
      });
    } catch (error) {
      logger.error(`Failed to clear background token ${(error as Error).message}`);
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
  const logger = rootLogger.child({ studyUserChatId });
  let stop = false;

  waitUntil(
    new Promise((resolve) => {
      async function checkBackgroundToken() {
        const userChat = await prisma.userChat.findUniqueOrThrow({
          where: { id: studyUserChatId },
          select: { backgroundToken: true },
        });
        if (stop) {
          logger.info(`stopped, quit checkBackgroundToken`);
        } else if (userChat.backgroundToken !== backgroundToken) {
          logger.warn(`background token cleared or changed, aborting background running`);
          try {
            abortController.abort();
          } catch (error) {
            logger.error(`Error during abort: ${(error as Error).message}`);
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
          logger.warn(`timeout`);
          stop = true;
          reject(new Error("StudyChat timeout"));
        }
        if (stop) {
          logger.info(`stopped`);
        } else {
          logger.info(`ongoing, ${elapsedSeconds} seconds`);
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
          logger.info(`stopped, quit checkUserTokensBalance`);
        } else if (userTokens.balance <= 0) {
          logger.warn(`user is out of balance, aborting background running`);
          try {
            abortController.abort(); // stop streamText
            clearBackgroundToken(); // stop checkBackgroundToken
            stop = true; // stop tick
          } catch (error) {
            logger.error(`Error during abort: ${(error as Error).message}`);
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
