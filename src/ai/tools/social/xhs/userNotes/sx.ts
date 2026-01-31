import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { tool } from "ai";
import {
  xhsUserNotesInputSchema,
  xhsUserNotesOutputSchema,
  type XHSUserNotesResult,
} from "./types";

const toolLog = rootLogger.child({
  tool: "xhsUserNotes",
});

function parseXHSUserNotes(data: {
  data: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notes: any[];
  };
}): XHSUserNotesResult {
  const notes: XHSUserNotesResult["notes"] = [];
  // 只取前十条
  const topUserNotes = (data?.data?.notes ?? []).slice(0, 10);
  topUserNotes.forEach((note) => {
    notes.push({
      id: note.id,
      title: note.title,
      desc: note.desc,
      type: note.type,
      liked_count: note.likes,
      collected_count: note.collected_count,
      comments_count: note.comments_count,
      user: {
        nickname: note.user?.nickname,
        userid: note.user?.userid,
        image: note.user?.images,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      images_list: note.images_list?.slice(0, 1).map((image: any) => ({
        url: image.url,
        // width: image.width,
        // height: image.height,
      })),
    });
  });
  const plainText = JSON.stringify(
    notes.map((note) => ({
      nodeid: note.id,
      userid: note.user.userid,
      nickname: note.user.nickname,
      title: note.title,
      desc: note.desc,
      comments_count: note.comments_count,
    })),
  );
  return {
    notes,
    plainText,
  };
}

async function xhsUserNotes({ userid }: { userid: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const params = {
        token: process.env.SX_API_TOKEN!,
        userId: userid,
      };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${process.env.SX_API_BASE_URL}/xiaohongshu/get-user-note-list/v1?${queryString}`,
      );
      const data = await response.json();
      toolLog.info(`Response text: ${JSON.stringify(data).slice(0, 100)}`);
      if (data.code === 0) {
        const result = parseXHSUserNotes(data);
        return result;
      } else {
        toolLog.warn(`Failed to fetch XHS user notes, retrying... ${i + 1}`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        continue;
      }
    } catch (error) {
      toolLog.warn(`Error fetching XHS user notes: ${(error as Error).message}`);
    }
  }
  return {
    notes: [],
    plainText: "Failed to fetch XHS user notes after 3 retries",
  };
}

export const xhsUserNotesTool = tool({
  description: "获取小红书特定用户的帖子",
  inputSchema: xhsUserNotesInputSchema,
  outputSchema: xhsUserNotesOutputSchema,
  toModelOutput: (result: PlainTextToolResult) => {
    return { type: "text", value: result.plainText };
  },
  execute: async ({ userid }) => {
    const result = await xhsUserNotes({ userid });
    return result;
  },
});
