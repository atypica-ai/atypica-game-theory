import { persistentAIMessageToDB } from "@/lib/messageUtils";
import { Message } from "ai";

export const debouncePersistentMessage = (() => {
  let timeout: NodeJS.Timeout | null = null;
  return async (
    studyUserChatId: number,
    message: Message,
    { immediate }: { immediate?: boolean } = {},
  ) => {
    // Clear any existing timeout
    if (timeout) {
      clearTimeout(timeout);
    }
    // Set new timeout for 10 seconds
    timeout = setTimeout(
      async () => {
        try {
          await persistentAIMessageToDB(studyUserChatId, message);
          console.log(
            `StudyUserChat [${studyUserChatId}] Message ${message.id} persisted successfully`,
          );
        } catch (error) {
          console.log(
            `StudyUserChat [${studyUserChatId}] Error persisting message ${message.id}:`,
            error,
          );
        }
      },
      immediate ? 0 : 5000,
    ); // 5 seconds debounce
  };
})();
