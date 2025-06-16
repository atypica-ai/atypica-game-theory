import {
  getChineseCharacterRatio,
  getDisplayWidth,
  truncateByDisplayWidth,
  truncateForTitle,
} from "@/lib/textUtils";
import { describe, expect, it } from "vitest";

describe("textUtils", () => {
  describe("getChineseCharacterRatio", () => {
    it("should return 0 for empty string", () => {
      expect(getChineseCharacterRatio("")).toBe(0);
    });

    it("should return 0 for pure English text", () => {
      expect(getChineseCharacterRatio("Hello World")).toBe(0);
    });

    it("should return 1 for pure Chinese text", () => {
      expect(getChineseCharacterRatio("你好世界")).toBe(1);
    });

    it("should return correct ratio for mixed text", () => {
      expect(getChineseCharacterRatio("Hello你好")).toBeCloseTo(2 / 7);
    });

    it("should handle numbers and special characters", () => {
      expect(getChineseCharacterRatio("Hello123!@#")).toBe(0);
      expect(getChineseCharacterRatio("你好123!@#")).toBeCloseTo(2 / 8);
    });

    it("should handle traditional Chinese characters", () => {
      expect(getChineseCharacterRatio("繁體中文")).toBe(1);
    });

    it("should handle Japanese characters", () => {
      // Japanese kanji should be detected as Chinese characters
      expect(getChineseCharacterRatio("日本語")).toBe(1);
    });
  });

  describe("getDisplayWidth", () => {
    it("should return 0 for empty string", () => {
      expect(getDisplayWidth("")).toBe(0);
    });

    it("should return correct width for English text", () => {
      expect(getDisplayWidth("Hello")).toBe(5);
    });

    it("should return correct width for Chinese text", () => {
      expect(getDisplayWidth("你好")).toBe(4); // 2 characters × 2 width each
    });

    it("should return correct width for mixed text", () => {
      expect(getDisplayWidth("Hello你好")).toBe(9); // 5 + 4
    });

    it("should handle numbers and special characters", () => {
      expect(getDisplayWidth("123!@#")).toBe(6);
    });

    it("should handle full-width characters", () => {
      expect(getDisplayWidth("ＡＢＣ")).toBe(6); // Full-width A, B, C
    });

    it("should handle mixed full-width and half-width", () => {
      expect(getDisplayWidth("ABCａｂｃ")).toBe(9); // ABC (3) + ａｂｃ (6)
    });
  });

  describe("truncateByDisplayWidth", () => {
    it("should return original text if within width limit", () => {
      expect(truncateByDisplayWidth("Hello", 10)).toBe("Hello");
    });

    it("should truncate English text correctly", () => {
      expect(truncateByDisplayWidth("Hello World", 8)).toBe("Hello...");
    });

    it("should truncate Chinese text correctly", () => {
      expect(truncateByDisplayWidth("你好世界", 5)).toBe("你..."); // 你(2) + ...(3) = 5
    });

    it("should handle mixed text correctly", () => {
      expect(truncateByDisplayWidth("Hello你好", 8)).toBe("Hello...");
    });

    it("should use custom suffix", () => {
      expect(truncateByDisplayWidth("Hello World", 8, "…")).toBe("Hello W…");
    });

    it("should handle empty suffix", () => {
      expect(truncateByDisplayWidth("Hello World", 8, "")).toBe("Hello Wo");
    });

    it("should handle case where suffix is longer than maxWidth", () => {
      expect(truncateByDisplayWidth("Hello", 2, "...")).toBe("...");
    });

    it("should handle single character that exceeds width", () => {
      expect(truncateByDisplayWidth("你", 1, "...")).toBe("...");
    });
  });

  describe("truncateForTitle", () => {
    it("should return original text if within limits", () => {
      expect(truncateForTitle("Hello")).toBe("Hello");
    });

    it("should use display width by default", () => {
      const longText = "A".repeat(100);
      const result = truncateForTitle(longText);
      expect(getDisplayWidth(result)).toBeLessThanOrEqual(80);
    });

    it("should handle Chinese text with display width", () => {
      const longText = "测".repeat(50);
      const result = truncateForTitle(longText);
      expect(getDisplayWidth(result)).toBeLessThanOrEqual(80);
    });

    it("should use character count when useDisplayWidth is false", () => {
      const longText = "A".repeat(100);
      const result = truncateForTitle(longText, { useDisplayWidth: false });
      expect(result.length).toBeLessThanOrEqual(100); // Default maxEnglishChars
    });

    it("should detect Chinese and use shorter limit", () => {
      const chineseText = "测试内容".repeat(20);
      const result = truncateForTitle(chineseText, {
        useDisplayWidth: false,
        maxChineseChars: 10,
      });
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it("should use English limit for mixed text with low Chinese ratio", () => {
      const mixedText = "Hello " + "测".repeat(5); // Low Chinese ratio
      const result = truncateForTitle(mixedText, {
        useDisplayWidth: false,
        chineseThreshold: 0.5,
      });
      expect(result.length).toBeLessThanOrEqual(50); // English limit
    });

    it("should respect custom maxDisplayWidth", () => {
      const longText = "A".repeat(100);
      const result = truncateForTitle(longText, { maxDisplayWidth: 20 });
      expect(getDisplayWidth(result)).toBeLessThanOrEqual(20);
    });

    it("should handle custom suffix", () => {
      const longText = "A".repeat(100);
      const result = truncateForTitle(longText, {
        maxDisplayWidth: 10,
        suffix: "…",
      });
      expect(result.endsWith("…")).toBe(true);
    });
  });

  describe("generateChatTitle", () => {
    it("should handle short English text", () => {
      const text = "Hello World";
      expect(truncateForTitle(text, { maxDisplayWidth: 60, suffix: "" })).toBe(text);
    });

    it("should handle short Chinese text", () => {
      const text = "你好世界";
      expect(truncateForTitle(text, { maxDisplayWidth: 60, suffix: "" })).toBe(text);
    });

    it("should truncate long English text", () => {
      const longText =
        "This is a very long English sentence that should be truncated for use as a chat title";
      const result = truncateForTitle(longText, { maxDisplayWidth: 60, suffix: "" });
      expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
      expect(result.length).toBeLessThan(longText.length);
    });

    it("should truncate long Chinese text", () => {
      const longText = "这是一个非常长的中文句子，应该被截取以用作聊天标题，确保显示效果良好";
      const result = truncateForTitle(longText, { maxDisplayWidth: 60, suffix: "" });
      expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
      expect(result.length).toBeLessThan(longText.length);
    });

    it("should handle mixed language text", () => {
      const mixedText =
        "Hello 你好 this is a mixed language sentence with both English and Chinese characters";
      const result = truncateForTitle(mixedText, { maxDisplayWidth: 60, suffix: "" });
      expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
    });

    it("should not add suffix to titles", () => {
      const longText = "A".repeat(100);
      const result = truncateForTitle(longText, { maxDisplayWidth: 60, suffix: "" });
      expect(result.includes("...")).toBe(false);
      expect(result.includes("…")).toBe(false);
    });

    it("should handle empty string", () => {
      expect(truncateForTitle("", { maxDisplayWidth: 60, suffix: "" })).toBe("");
    });

    it("should handle text with only spaces", () => {
      expect(truncateForTitle("   ", { maxDisplayWidth: 60, suffix: "" })).toBe("   ");
    });

    it("should handle text with line breaks", () => {
      const textWithBreaks = "First line\nSecond line\nThird line that is very long";
      const result = truncateForTitle(textWithBreaks, { maxDisplayWidth: 60, suffix: "" });
      expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
    });

    it("should handle text with emojis", () => {
      const textWithEmojis = "Hello 👋 World 🌍 this is a test with emojis";
      const result = truncateForTitle(textWithEmojis, { maxDisplayWidth: 60, suffix: "" });
      expect(result.includes("👋")).toBe(true);
      expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
    });
  });

  describe("edge cases", () => {
    it("should handle very long single word", () => {
      const veryLongWord = "supercalifragilisticexpialidocious".repeat(10);
      const result = truncateForTitle(veryLongWord, { maxDisplayWidth: 60, suffix: "" });
      expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
    });

    it("should handle text with special Unicode characters", () => {
      const specialText = "Café naïve résumé 北京 東京 🌸🗾";
      const result = truncateForTitle(specialText, { maxDisplayWidth: 60, suffix: "" });
      expect(result.length).toBeGreaterThan(0);
    });

    it("should handle RTL text", () => {
      const rtlText = "مرحبا بالعالم هذا نص طويل باللغة العربية";
      const result = truncateForTitle(rtlText, { maxDisplayWidth: 60, suffix: "" });
      expect(result.length).toBeGreaterThan(0);
      expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
    });
  });
});
