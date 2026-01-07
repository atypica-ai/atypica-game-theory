import { isSystemMessage } from "@/ai/messageUtilsClient";
import { Locale } from "next-intl";
import { getLocale } from "next-intl/server";

/**
 * 检测字符串中中文字符的比例
 */
export function getChineseCharacterRatio(text: string): number {
  const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g;
  const chineseMatches = text.match(chineseRegex);
  const chineseCount = chineseMatches ? chineseMatches.length : 0;
  return text.length > 0 ? chineseCount / text.length : 0;
}

/**
 * 计算字符串的显示宽度（中文字符算2个宽度单位，英文字符算1个）
 */
export function getDisplayWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    // 检查是否为中文字符、全角字符或其他宽字符
    if (/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\uff00-\uffef]/.test(char)) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * 根据显示宽度截取字符串
 * @param text 要截取的文本
 * @param maxWidth 最大显示宽度（中文字符算2个宽度单位）
 * @param suffix 截取后的后缀，默认为 "..."
 * @returns 截取后的字符串
 */
export function truncateByDisplayWidth(
  text: string,
  maxWidth: number,
  suffix: string = "...",
): string {
  if (getDisplayWidth(text) <= maxWidth) {
    return text;
  }

  let result = "";
  let currentWidth = 0;
  const suffixWidth = getDisplayWidth(suffix);

  for (const char of text) {
    const charWidth = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\uff00-\uffef]/.test(char) ? 2 : 1;

    if (currentWidth + charWidth + suffixWidth > maxWidth) {
      break;
    }

    result += char;
    currentWidth += charWidth;
  }

  return result + suffix;
}

/**
 * 智能截取字符串用于生成标题
 * 根据中英文比例动态调整截取长度
 * @param text 要截取的文本
 * @param options 配置选项
 * @returns 截取后的字符串
 */
export function truncateForTitle(
  text: string,
  options: {
    /** 英文为主时的最大字符数，默认100 */
    maxEnglishChars?: number;
    /** 中文为主时的最大字符数，默认50 */
    maxChineseChars?: number;
    /** 中文字符比例阈值，超过此比例认为是中文为主，默认0.3 */
    chineseThreshold?: number;
    /** 是否使用显示宽度截取，默认true */
    useDisplayWidth?: boolean;
    /** 最大显示宽度（仅在useDisplayWidth为true时生效），默认80 */
    maxDisplayWidth?: number;
    /** 截取后缀，默认为空字符串 */
    suffix?: string;
  } = {},
): string {
  const {
    maxEnglishChars = 100,
    maxChineseChars = 50,
    chineseThreshold = 0.3,
    useDisplayWidth = true,
    maxDisplayWidth = 80,
    suffix = "",
  } = options;

  // 如果使用显示宽度截取
  if (useDisplayWidth) {
    return truncateByDisplayWidth(text, maxDisplayWidth, suffix);
  }

  // 否则根据中英文比例动态调整
  const chineseRatio = getChineseCharacterRatio(text);
  const maxChars = chineseRatio > chineseThreshold ? maxChineseChars : maxEnglishChars;

  if (text.length <= maxChars) {
    return text;
  }

  return text.substring(0, maxChars) + suffix;
}

/**
 * 检测用户输入的语言并返回对应的locale
 * 基于中文字符比例判断输入语言
 * @param options 配置选项
 * @param options.text 用户输入文本
 * @param options.threshold 中文字符比例阈值，默认0.3
 * @param options.fallbackLocale 当输入为空或系统消息时使用的回退locale
 * @returns 检测到的locale
 */
export async function detectInputLanguage({
  text,
  threshold = 0.3,
  fallbackLocale,
}: {
  text: string;
  threshold?: number;
  fallbackLocale?: Locale;
}): Promise<Locale> {
  // 处理 null/undefined 输入或空白字符
  if (!text || !text.trim()) {
    return fallbackLocale || (await getLocale());
  }

  // 处理系统消息，只允许单个空格转下划线，不允许连续空格或前后空格
  if (isSystemMessage(text)) {
    return fallbackLocale || (await getLocale());
  }

  // 清理文本：去掉 URL 和连续数字，避免干扰语言检测
  const cleanedText = text
    .replace(/https?:\/\/[^\s]+/g, "") // 去掉 URL
    .replace(/\d+/g, ""); // 去掉连续数字

  let adjustedThreshold = threshold;

  // 启发式规则1: 中文开头强烈倾向中文（用户意图优先）
  if (/^[\u4e00-\u9fff]/.test(cleanedText.trim())) {
    adjustedThreshold *= 0.4; // 0.3 -> 0.12，大幅降低阈值
  }

  // 启发式规则2: 英文开头但有较多连续中文，适度倾向中文
  else if (/[\u4e00-\u9fff]{3,}/.test(cleanedText)) {
    adjustedThreshold *= 0.8; // 0.3 -> 0.24，适度降低阈值
  }

  const chineseRatio = getChineseCharacterRatio(cleanedText);
  return chineseRatio > adjustedThreshold ? "zh-CN" : "en-US";
}

/**
 * 识别纯文本中的 URL 并转换为 Markdown 链接格式
 * @param text 要处理的文本
 * @returns 转换后的文本，纯文本 URL 会被转换为 [URL](URL) 格式
 */
export function convertUrlsToMarkdownLinks(text: string): string {
  // Step 1: 移除所有 Markdown 链接格式（包括格式错误的），提取其中的 URL
  // 匹配各种可能的 Markdown 链接格式，包括格式错误的
  // 使用更宽松的匹配策略：先找到所有可能的 [text](url) 模式
  let cleanedText = text;

  // 使用更宽松的正则，匹配可能包含各种字符的 Markdown 链接
  // 注意：对于格式错误的链接如 [url。](url`。)，需要匹配到真正的结束位置
  // 使用非贪婪匹配，但需要处理括号内可能包含的格式错误字符
  const markdownLinkPattern = /\[([^\]]*?)\]\(([^)]*?)\)/g;
  const matches: Array<{ fullMatch: string; url: string; linkText: string; index: number }> = [];
  let match;

  // 收集所有匹配
  while ((match = markdownLinkPattern.exec(text)) !== null) {
    matches.push({
      fullMatch: match[0],
      url: match[2], // 提取 URL（括号中的内容）
      linkText: match[1], // 提取链接文本（中括号中的内容）
      index: match.index,
    });
  }

  // 从后往前替换，避免索引偏移
  for (let i = matches.length - 1; i >= 0; i--) {
    const { fullMatch, url, linkText, index } = matches[i];

    // 清理 URL：移除所有可能的格式错误字符
    // 1. 移除所有反引号
    let cleanUrl = url.replace(/`/g, "");
    // 2. 移除末尾的所有标点符号（中文和英文）
    cleanUrl = cleanUrl.replace(/[。，,;:!?、。]+$/g, "").trim();
    // 3. 再次清理，确保没有残留的标点
    cleanUrl = cleanUrl.replace(/[。，,;:!?、。]+$/g, "").trim();

    // 如果提取的 URL 看起来像是一个有效的 URL，替换为纯文本 URL
    if (cleanUrl && (cleanUrl.startsWith("http") || cleanUrl.startsWith("www."))) {
      cleanedText =
        cleanedText.slice(0, index) + cleanUrl + cleanedText.slice(index + fullMatch.length);
    } else {
      // 如果提取的内容不是有效的 URL，尝试从链接文本中提取
      let urlFromText = linkText.replace(/`/g, "");
      urlFromText = urlFromText.replace(/[。，,;:!?、。]+$/g, "").trim();
      urlFromText = urlFromText.replace(/[。，,;:!?、。]+$/g, "").trim();
      if (urlFromText && (urlFromText.startsWith("http") || urlFromText.startsWith("www."))) {
        cleanedText =
          cleanedText.slice(0, index) + urlFromText + cleanedText.slice(index + fullMatch.length);
      } else {
        // 如果都无效，直接移除整个 Markdown 格式
        cleanedText = cleanedText.slice(0, index) + cleanedText.slice(index + fullMatch.length);
      }
    }
  }

  // Step 2: 统一处理所有纯文本 URL（包括从 Markdown 链接中提取出来的）
  const urlRegex = /(https?:\/\/[^\s\)]+|www\.[^\s\)]+)/g;
  const urlMatches: Array<{ url: string; index: number }> = [];
  urlRegex.lastIndex = 0;
  while ((match = urlRegex.exec(cleanedText)) !== null) {
    urlMatches.push({ url: match[0], index: match.index });
  }

  // 从后往前处理，避免索引偏移
  let result = cleanedText;
  for (let i = urlMatches.length - 1; i >= 0; i--) {
    const { url, index } = urlMatches[i];

    // 彻底清理 URL：移除所有反引号和标点符号
    let cleanUrl = url.replace(/`/g, ""); // 先移除反引号
    // 移除末尾的所有标点符号（中文和英文）
    const trailingPunctuation = cleanUrl.match(/[。，,;:!?、。]+$/);
    cleanUrl = trailingPunctuation ? cleanUrl.slice(0, -trailingPunctuation[0].length) : cleanUrl;
    cleanUrl = cleanUrl.trim();
    const punctuation = trailingPunctuation ? trailingPunctuation[0] : "";

    // 确保 URL 有协议
    const fullUrl = cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`;

    // 直接使用 Markdown 自动链接格式 <URL>，这样只会显示 URL 本身（可点击），不显示中括号
    const replacement = `<${fullUrl}>${punctuation}`;
    result = result.slice(0, index) + replacement + result.slice(index + url.length);
  }

  return result;
}
