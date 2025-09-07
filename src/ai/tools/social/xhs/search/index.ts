import "server-only";

import { PlainTextToolResult } from "@/ai/tools/types";
import { rootLogger } from "@/lib/logging";
import { fixMalformedUnicodeString } from "@/lib/utils";
import { tool } from "ai";
import { z } from "zod";
import { XHSNote, XHSSearchResult } from "./types";

const toolLog = rootLogger.child({
  tool: "xhsSearch",
});

function parseXHSSearchResult(data: {
  data: {
    items: {
      model_type: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      note: any;
    }[];
  };
}): XHSSearchResult {
  const notes: XHSNote[] = [];
  // 过滤并取前十条
  const topNotes = (data?.data?.items ?? [])
    .filter((item) => item.model_type === "note")
    .slice(0, 10);
  topNotes.forEach(({ note }) => {
    // Extract the first image URL from the new image_list structure
    const firstImageUrl =
      note.image_list?.[0]?.info_list?.find(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (info: any) => info.image_scene === "WB_DFT",
      )?.url || note.cover?.url_default;

    notes.push({
      id: note.id || note.note_id || "unknown", // fallback for missing id
      title: note.display_title || note.title || "",
      desc: note.desc || note.description || "", // fallback for missing desc
      type: note.type,
      liked_count: note.liked_count || 0, // fallback for missing engagement data
      collected_count: note.collected_count || 0,
      comments_count: note.comments_count || 0,
      user: {
        nickname: note.user?.nickname,
        userid: note.user?.userid,
        image: note.user?.avatar || note.user?.images,
      },
      // Updated to handle new image structure
      images_list: firstImageUrl
        ? [
            {
              url: firstImageUrl,
            },
          ]
        : [],
    });
  });
  // 这个方法返回的结果会发给 LLM 用来生成回复，只需要把 LLM 能够使用的文本给它就行，节省很多 tokens
  const plainText = JSON.stringify(
    notes.map((note) => ({
      noteid: note.id,
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

async function xhsSearch({ keyword }: { keyword: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const params = {
        token: process.env.SX_API_TOKEN!,
        keyword,
        page: "1",
        sort: "general",
        noteType: "_0",
      };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${process.env.SX_API_BASE_URL}/xiaohongshu/search-note/v2?${queryString}`,
      );
      const data = await response.json();
      toolLog.info(`Response text: ${JSON.stringify(data).slice(0, 100)}`);
      if (data.code === 0) {
        const result = parseXHSSearchResult(data);
        return result;
      } else {
        toolLog.warn(`Failed to fetch XHS posts, retrying... ${i + 1}`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        continue;
      }
    } catch (error) {
      toolLog.warn(`Error fetching XHS posts: ${(error as Error).message}`);
    }
  }
  return {
    notes: [],
    plainText: "Failed to fetch XHS posts after 3 retries",
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function xhsSearchTikhub({ keyword }: { keyword: string }) {
  for (let i = 0; i < 3; i++) {
    try {
      const headers = { Authorization: `Bearer ${process.env.TIKHUB_API_TOKEN!}` };
      const params = { keyword, page: "1", sort: "general", noteType: "_0" };
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${process.env.TIKHUB_API_BASE_URL}/xiaohongshu/web/search_notes?${queryString}`,
        { headers },
      );
      const res = await response.json();
      toolLog.info(`Response text: ${JSON.stringify(res).slice(0, 100)}`);
      if (res.code === 200) {
        const result = parseXHSSearchResult(res.data);
        return result;
      } else {
        console.log("Failed to fetch XHS posts, retrying...", i + 1);
        await new Promise((resolve) => setTimeout(resolve, 3 * 1000));
        continue;
      }
    } catch (error) {
      console.log("Error fetching XHS posts:", error);
    }
  }
  return {
    notes: [],
    plainText: "Failed to fetch XHS posts after 3 retries",
  };
}

export const xhsSearchTool = tool({
  description: "在小红书上搜索笔记，可以搜索特定的主题，也可以搜索一个品牌",
  parameters: z.object({
    keyword: z.string().describe("Search keywords").transform(fixMalformedUnicodeString),
  }),
  // 这个方法返回的结果会发给 LLM 用来生成回复，只需要把 LLM 能够使用的文本给它就行，节省很多 tokens
  experimental_toToolResultContent: (result: PlainTextToolResult) => {
    return [{ type: "text", text: result.plainText }];
  },
  execute: async ({ keyword }) => {
    const result = await xhsSearch({ keyword });
    return result;
  },
});
