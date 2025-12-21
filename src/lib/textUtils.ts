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
