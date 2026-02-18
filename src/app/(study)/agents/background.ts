import { rootLogger } from "@/lib/logging";
import { prisma } from "@/prisma/prisma";
import { waitUntil } from "@vercel/functions";
import { StreamTextResult, ToolSet } from "ai";
import { Logger } from "pino";

export async function raceForUserChat(studyUserChatId: number) {
  const logger = rootLogger.child({ userChatId: studyUserChatId });
  // race, 争取 userchat 的写入
  const backgroundToken = new Date().valueOf().toString();

  const clearBackgroundToken = async () => {
    // 加上 OR backgroundToken: null 条件是为了忽略 backgroundToken 已经被清空的情况（比如用户手动停止）
    try {
      await prisma.userChat.update({
        where: { id: studyUserChatId, OR: [{ backgroundToken }, { backgroundToken: null }] },
        data: { backgroundToken: null },
      });
    } catch (error) {
      logger.warn(`Failed to clear background token ${(error as Error).message}`);
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
  logger,
  studyUserChatId,
  backgroundToken,
  toolAbortController,
  studyAbortController,
  streamTextResult,
}: {
  logger: Logger;
  studyUserChatId: number;
  backgroundToken: string;
  toolAbortController: AbortController;
  studyAbortController: AbortController;
  streamTextResult: StreamTextResult<TOOLS, PARTIAL_OUTPUT>;
}) {
  const abortToolsAndStudy = () => {
    const safeAbort = (abortController: AbortController) => {
      try {
        abortController.abort();
      } catch (error) {
        rootLogger.error(`Error during abort: ${(error as Error).message}`);
      }
    };
    setTimeout(() => safeAbort(toolAbortController), 0);
    // 要先等 tool 都 abort 最后再 abort StudyChat，否则 StudyChat 提前中断会取消它后续调用的所有 promise，导致他们自己在调用 toolAbortController.abort() 方法时失败
    setTimeout(() => safeAbort(studyAbortController), 1000);
  };

  // https://nextjs.org/docs/app/api-reference/functions/after#alternatives
  waitUntil(
    new Promise((resolve, reject) => {
      const start = Date.now();
      let timeoutTick: NodeJS.Timeout;
      const tick = () => {
        const elapsedSeconds = Math.floor((Date.now() - start) / 1000);
        if (elapsedSeconds > 3600) {
          logger.warn(`timeout`);
          abortToolsAndStudy();
          return;
        }
        prisma.userChat
          .findUniqueOrThrow({
            where: { id: studyUserChatId },
            select: { backgroundToken: true },
          })
          .then((userChat) => {
            if (userChat.backgroundToken !== backgroundToken) {
              logger.warn(`background token cleared or changed, aborting background running`);
              abortToolsAndStudy();
            }
          });
        logger.info(`ongoing, ${elapsedSeconds} seconds`);
        timeoutTick = setTimeout(() => tick(), 5000);
      };

      timeoutTick = setTimeout(() => tick(), 0);

      // consume the stream to ensure it runs to completion & triggers onFinish even when the client response is aborted:
      streamTextResult
        .consumeStream()
        .then(() => {
          resolve(null);
        })
        .catch((error) => {
          reject(error);
        })
        .finally(() => {
          logger.info(`stopped`);
          if (timeoutTick) clearTimeout(timeoutTick);
        });
    }),
  );

  return {};
}
