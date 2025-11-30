import "server-only";

import { llm } from "@/ai/provider";
import { parsePDFToText } from "@/ai/reader";
import { rootLogger } from "@/lib/logging";
import { proxiedFetch } from "@/lib/proxy/fetch";
import { detectInputLanguage } from "@/lib/textUtils";
import { AttachmentFile, AttachmentFileExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import { mergeExtra } from "@/prisma/utils";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { waitUntil } from "@vercel/functions";
import { streamText } from "ai";
import { Logger } from "pino";
import { s3SignedUrl } from "./s3";

type AttachmentFileWithTypedExtra = Omit<AttachmentFile, "extra"> & {
  extra: AttachmentFileExtra;
};

const SUPPORTED_MIME_TYPES = ["application/pdf", "text/plain", "text/csv"];
const THIRTY_MINUTES = 30 * 60 * 1000;
const CHECK_INTERVAL = 30_000; // 30 seconds
const MAX_COMPRESSED_TOKENS = 20_000;

function convertAttachmentFileExtra(file: AttachmentFile): AttachmentFileWithTypedExtra {
  return {
    ...file,
    extra: file.extra as unknown as AttachmentFileExtra,
  };
}

async function fetchFileWithTypedExtra(id: number): Promise<AttachmentFileWithTypedExtra | null> {
  const file = await prisma.attachmentFile.findUnique({ where: { id } });
  return file ? convertAttachmentFileExtra(file) : null;
}

function isProcessingTimeout(startsAt: number): boolean {
  return startsAt < Date.now() - THIRTY_MINUTES;
}

async function checkFileStatus(
  file: AttachmentFileWithTypedExtra,
): Promise<"skip" | "ready" | "timeout" | "wait"> {
  if (!SUPPORTED_MIME_TYPES.includes(file.mimeType)) return "skip";
  if (file.extra.compressedText) return "skip";
  if (file.extra.error) return "skip";

  if (file.extra.processing) {
    if (isProcessingTimeout(file.extra.processing.startsAt)) return "timeout";
    return "wait";
  }

  return "ready";
}

async function extractFullText(file: AttachmentFileWithTypedExtra): Promise<string> {
  const { mimeType, objectUrl, name } = file;

  if (mimeType === "application/pdf") {
    return await parsePDFToText({ name, objectUrl, mimeType });
  }

  if (mimeType === "text/plain" || mimeType === "text/csv") {
    const fileUrl = await s3SignedUrl(objectUrl);
    const response = await proxiedFetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    return await response.text();
  }

  throw new Error(`Unsupported mime type: ${mimeType}`);
}

export async function compressText({
  fullText,
  logger,
  abortSignal,
}: {
  fullText: string;
  logger: Logger;
  abortSignal: AbortSignal;
}): Promise<string> {
  const locale = await detectInputLanguage({ text: fullText });

  const systemPrompt =
    locale === "zh-CN"
      ? `你是一位专业的信息压缩专家。你的任务是压缩文档，而非总结文档。

核心原则：
- 这是信息压缩，不是总结或提炼
- 保持原文的所有信息和意思，不要抽象化或提炼洞察
- 能合并的句子就合并，能简化的表达就简化
- 删除冗余的修饰词、重复表述、无意义的连接词
- 使用紧凑格式：分号连接、缩写、去掉不必要的词
- 保留所有具体的事实、数据、实体、观点和关系
- 目标：<${MAX_COMPRESSED_TOKENS.toLocaleString()} tokens（约 ${MAX_COMPRESSED_TOKENS * 3} 字符）

重要：不要改变原文的意思，不要添加原文没有的推断或洞察。

输出格式：直接输出压缩后的文本内容，不要任何解释，不要任何开场白或结束语。`
      : `You are an expert information compression specialist. Your task is to compress documents, not summarize them.

Core Principles:
- This is information compression, not summarization or abstraction
- Preserve all information and meaning from the original text, do not abstract or extract insights
- Merge sentences where possible, simplify expressions where feasible
- Remove redundant modifiers, repetitive statements, and meaningless connectors
- Use compact formatting: semicolons, abbreviations, remove unnecessary words
- Preserve all concrete facts, data, entities, viewpoints, and relationships
- Target: <${MAX_COMPRESSED_TOKENS.toLocaleString()} tokens (~${MAX_COMPRESSED_TOKENS * 3} chars)

Important: Do not change the original meaning, do not add inferences or insights not present in the source.

Output Format: Output the compressed text directly, with no explanations, no preambles, and no closing remarks.`;

  const messages =
    locale === "zh-CN"
      ? [
          { role: "user" as const, content: "以下是需要压缩的文本原文：" },
          { role: "user" as const, content: fullText },
          {
            role: "user" as const,
            content: "直接输出所有压缩后的文本内容，不要任何解释、不要任何开场白或结束语。",
          },
        ]
      : [
          { role: "user" as const, content: "Here is the original text to compress:" },
          { role: "user" as const, content: fullText },
          {
            role: "user" as const,
            content:
              "Output all the compressed text directly, with no explanations, no preambles, and no closing remarks.",
          },
        ];

  const promise = new Promise<string>(async (resolve, reject) => {
    let compressedText = "";
    const response = streamText({
      model: llm("gpt-5-mini"),
      providerOptions: {
        openai: {
          reasoningSummary: "auto",
          reasoningEffort: "minimal",
        } satisfies OpenAIResponsesProviderOptions,
      },
      system: systemPrompt,
      messages,
      maxOutputTokens: MAX_COMPRESSED_TOKENS,
      maxRetries: 3,
      onChunk: ({ chunk }) => {
        if (chunk.type === "text-delta") {
          compressedText += chunk.text;
          logger.debug({
            msg: "compressText onChunk",
            compressedTextLength: compressedText.length,
          });
        }
      },
      onError: ({ error }) => {
        logger.error({
          msg: "compressText onError",
          error: (error as Error).message,
        });
        reject(error);
      },
      onFinish: () => {
        logger.info({
          msg: "compressText onFinish",
          compressedTextLength: compressedText.length,
        });
        resolve(compressedText);
      },
      abortSignal,
    });
    abortSignal.addEventListener("abort", () => {
      reject(new Error("compressText abortSignal received"));
    });
    await response
      .consumeStream()
      .then(() => resolve(compressedText))
      .catch((error) => reject(error));
  });

  const compressedText = await promise;
  return compressedText;
}

async function startParsing({
  attachmentFileId,
  abortSignal,
}: {
  attachmentFileId: number;
  abortSignal: AbortSignal;
}): Promise<AttachmentFileWithTypedExtra> {
  const file = await fetchFileWithTypedExtra(attachmentFileId);
  if (!file) throw new Error("File not found");

  const logger = rootLogger.child({ attachmentFileId, fileName: file.name });

  try {
    await mergeExtra({
      tableName: "AttachmentFile",
      id: attachmentFileId,
      extra: { processing: { startsAt: Date.now() } },
    });

    logger.info("Starting text extraction");
    const fullText = await extractFullText(file);

    logger.info({ msg: "Starting text compression", fullTextLength: fullText.length });
    const compressedText = await compressText({ fullText, logger, abortSignal });

    if (compressedText) {
      await mergeExtra({
        tableName: "AttachmentFile",
        id: attachmentFileId,
        extra: { processing: false, compressedText } satisfies AttachmentFileExtra,
      });
    } else {
      await mergeExtra({
        tableName: "AttachmentFile",
        id: attachmentFileId,
        extra: {
          processing: false,
          error: "Text compression completed but returned empty result",
        } satisfies AttachmentFileExtra,
      });
    }

    logger.info({
      msg: "Parsing completed",
      fullTextLength: fullText.length,
      compressedTextLength: compressedText.length,
    });

    const updatedFile = await fetchFileWithTypedExtra(attachmentFileId);
    if (!updatedFile) throw new Error("File not found after update");
    return updatedFile;
  } catch (error) {
    logger.error({ msg: "Parsing failed", error: (error as Error).message });

    await mergeExtra({
      tableName: "AttachmentFile",
      id: attachmentFileId,
      extra: {
        processing: false,
        error: error instanceof Error ? error.message : String(error),
      },
    });

    const updatedFile = await fetchFileWithTypedExtra(attachmentFileId);
    if (!updatedFile) throw new Error("File not found after error");
    return updatedFile;
  }
}

export async function parseAttachmentText(
  attachmentFileId: number,
): Promise<AttachmentFileWithTypedExtra> {
  const abortController = new AbortController();

  const file = await fetchFileWithTypedExtra(attachmentFileId);
  if (!file) throw new Error("File not found");
  const status = await checkFileStatus(file);

  if (status === "skip") {
    return file;
  }

  if (status === "timeout") {
    // 刚进来就发现已经超时了，直接重新开始
    await mergeExtra({
      tableName: "AttachmentFile",
      id: attachmentFileId,
      extra: { processing: false, error: null },
    });
  }
  if (status === "ready" || status === "timeout") {
    waitUntil(startParsing({ attachmentFileId, abortSignal: abortController.signal }));
  }

  // 此时状态是变成 wait，循环等待

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL));
    const file = await fetchFileWithTypedExtra(attachmentFileId);
    if (!file) throw new Error("File not found");
    const status = await checkFileStatus(file);
    // 如果再一次超时，不会接继续
    if (status === "skip" || status === "timeout") {
      try {
        abortController.abort();
      } catch {}
      return file;
    }
  }
}
