import { prisma } from "@/lib/prisma";
import { waitUntil } from "@vercel/functions";
import { StreamTextResult, ToolSet } from "ai";

export function backgroundChatUntilCancel<TOOLS extends ToolSet, PARTIAL_OUTPUT>({
  studyUserChatId,
  abortController,
  streamTextResult,
}: {
  studyUserChatId: number;
  abortController: AbortController;
  streamTextResult: StreamTextResult<TOOLS, PARTIAL_OUTPUT>;
}) {
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

  waitUntil(
    new Promise((resolve) => {
      async function checkBackgroundToken() {
        const userChat = await prisma.userChat.findUnique({
          where: { id: studyUserChatId },
          select: { backgroundToken: true },
        });
        if (userChat?.backgroundToken !== backgroundToken) {
          console.log(
            `[${studyUserChatId}] StudyChat background token cleared or changed, aborting background running`,
          );
          try {
            abortController.abort();
          } catch (error) {
            console.log(`[${studyUserChatId}] Error during abort:`, error);
          }
          resolve(null);
        } else {
          setTimeout(() => checkBackgroundToken(), 1000);
        }
      }
      prisma.userChat
        .update({
          where: { id: studyUserChatId },
          data: { backgroundToken },
        })
        .then(() => {
          // 更新成功以后开始检查用户取消 backgroundToken
          checkBackgroundToken();
        })
        .catch((error) => {
          console.log("Error updating background token:", error);
        });
    }),
  );

  waitUntil(
    new Promise((resolve, reject) => {
      let stop = false;
      const start = Date.now();
      const tick = () => {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - start) / 1000);
        if (elapsedSeconds > 1800) {
          // 30 mins
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

  return {
    clearBackgroundToken,
  };
}
