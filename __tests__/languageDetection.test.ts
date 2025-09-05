import { detectInputLanguage } from "@/lib/textUtils";
import { describe, expect, it } from "vitest";

describe("Language Detection for LLM Prompt Selection", () => {
  describe("detectInputLanguage", () => {
    describe("Pure language detection", () => {
      it("should detect Chinese for pure Chinese text", async () => {
        expect(await detectInputLanguage({ text: "你好世界，我想了解AI技术" })).toBe("zh-CN");
        expect(await detectInputLanguage({ text: "我需要创建一个新的研究项目" })).toBe("zh-CN");
        expect(await detectInputLanguage({ text: "请帮我分析用户画像" })).toBe("zh-CN");
      });

      it("should detect English for pure English text", async () => {
        expect(await detectInputLanguage({ text: "Hello world, I want to learn about AI" })).toBe(
          "en-US",
        );
        expect(await detectInputLanguage({ text: "I need to create a new research project" })).toBe(
          "en-US",
        );
        expect(await detectInputLanguage({ text: "Please help me analyze user personas" })).toBe(
          "en-US",
        );
      });
    });

    describe("Empty input and fallback locale handling", () => {
      it("should use fallback locale for empty input", async () => {
        expect(await detectInputLanguage({ text: "", fallbackLocale: "zh-CN" })).toBe("zh-CN");
        expect(await detectInputLanguage({ text: "   ", fallbackLocale: "zh-CN" })).toBe("zh-CN");
        expect(await detectInputLanguage({ text: "\n\t", fallbackLocale: "zh-CN" })).toBe("zh-CN");

        // Default fallback should be from getLocale() - testing with different fallbacks
        expect(await detectInputLanguage({ text: "", fallbackLocale: "en-US" })).toBe("en-US");
      });

      it("should handle null/undefined input with fallback", async () => {
        expect(await detectInputLanguage({ text: null as any, fallbackLocale: "zh-CN" })).toBe(
          "zh-CN",
        );
        expect(await detectInputLanguage({ text: undefined as any, fallbackLocale: "en-US" })).toBe(
          "en-US",
        );
      });
    });

    describe("System message detection and fallback", () => {
      it("should use fallback for standard system messages", async () => {
        const systemMessages = [
          "[READY]",
          "[USER_HESITATED]",
          "[CONTINUE]",
          "[CONTINUE_ASSISTANT_STEPS]",
        ];

        for (const msg of systemMessages) {
          expect(await detectInputLanguage({ text: msg, fallbackLocale: "zh-CN" })).toBe("zh-CN");
          expect(await detectInputLanguage({ text: msg, fallbackLocale: "en-US" })).toBe("en-US");
        }
      });

      it("should handle case-insensitive system messages", async () => {
        const variations = [
          "[ready]",
          "[READY]",
          "[Ready]",
          "[user_hesitated]",
          "[USER_HESITATED]",
          "[User_Hesitated]",
          "[continue]",
          "[CONTINUE]",
          "[Continue]",
        ];

        for (const msg of variations) {
          expect(await detectInputLanguage({ text: msg, fallbackLocale: "zh-CN" })).toBe("zh-CN");
        }
      });

      it("should handle system messages with single space variations", async () => {
        const validSpacingVariations = ["[USER HESITATED]", "[CONTINUE ASSISTANT STEPS]"];

        for (const msg of validSpacingVariations) {
          expect(await detectInputLanguage({ text: msg, fallbackLocale: "zh-CN" })).toBe("zh-CN");
        }
      });

      it("should NOT treat invalid spacing as system messages", async () => {
        const invalidSpacingVariations = [
          "[USER  HESITATED]", // 连续空格
          "[ USER_HESITATED ]", // 前后空格
          "[CONTINUE  ASSISTANT  STEPS]", // 连续空格
        ];

        // 这些应该按正常文本处理，不使用fallback
        for (const msg of invalidSpacingVariations) {
          expect(await detectInputLanguage({ text: msg, fallbackLocale: "zh-CN" })).toBe("en-US");
        }
      });

      it("should not treat non-system bracket text as system messages", async () => {
        // These should be processed normally, not treated as system messages
        expect(await detectInputLanguage({ text: "[这是中文内容]", fallbackLocale: "en-US" })).toBe(
          "zh-CN",
        );
        expect(
          await detectInputLanguage({ text: "[This is English content]", fallbackLocale: "zh-CN" }),
        ).toBe("en-US");
        expect(
          await detectInputLanguage({ text: "[NOT_A_SYSTEM_MESSAGE]", fallbackLocale: "zh-CN" }),
        ).toBe("en-US");
      });
    });

    describe("Heuristic rules testing", () => {
      it("should prioritize Chinese when text starts with Chinese", async () => {
        // 中文开头强烈倾向中文（用户意图优先）
        expect(await detectInputLanguage({ text: "我需要调用 getUserProfile() 这个方法" })).toBe(
          "zh-CN",
        );
        expect(
          await detectInputLanguage({ text: "使用 const result = await api.call() 获取数据" }),
        ).toBe("zh-CN");
        expect(await detectInputLanguage({ text: "这个function很有用：function test() {}" })).toBe(
          "zh-CN",
        );
      });

      it("should handle English start with some Chinese content", async () => {
        // 英文开头但有较多连续中文（3+个字符），适度倾向中文
        expect(await detectInputLanguage({ text: "Hello你好世界，欢迎使用" })).toBe("zh-CN"); // 有连续中文"你好世界"和"欢迎使用"

        // 英文开头，中文较少，保持英文
        expect(await detectInputLanguage({ text: "Hello你好World" })).toBe("en-US"); // 只有连续中文"你好"，不足3个字符
      });

      it("should maintain original logic for edge cases", async () => {
        // 纯中文
        expect(await detectInputLanguage({ text: "你好世界" })).toBe("zh-CN");
        // 纯英文
        expect(await detectInputLanguage({ text: "Hello World" })).toBe("en-US");
        // 中文比例很高但英文开头
        expect(await detectInputLanguage({ text: "Call我需要这个功能来处理用户数据" })).toBe(
          "zh-CN",
        ); // 有连续中文"我需要这个功能来处理用户数据"
      });
    });

    describe("Mixed language threshold testing", () => {
      it("should detect Chinese when ratio > 0.3", async () => {
        // 中文占比约 0.67 (4/6)
        expect(await detectInputLanguage({ text: "我用AI做事" })).toBe("zh-CN");
        // 中文占比约 0.5 (4/8)
        expect(await detectInputLanguage({ text: "你好AI助手" })).toBe("zh-CN");
        // 中文占比约 0.36 (4/11) - 日文汉字
        expect(await detectInputLanguage({ text: "ユーザー研究が必要です" })).toBe("zh-CN");
      });

      it("should detect based on new heuristic rules", async () => {
        // 中文开头，强烈倾向中文
        expect(await detectInputLanguage({ text: "我要做research" })).toBe("zh-CN");
        // 英文开头，中文较少（"助手"只有2个字符），保持英文
        expect(await detectInputLanguage({ text: "AI助手rocks" })).toBe("en-US");
        // 英文开头，但有连续中文"你好"（不足3个字符），按原比例判断
        expect(await detectInputLanguage({ text: "Hello你好World测试" })).toBe("en-US");
      });

      it("should handle custom threshold with new rules", async () => {
        const mixedText = "Hello你好World测试"; // 英文开头，连续中文"你好"不足3个字符，按原逻辑

        // 使用默认阈值 0.3，中文占比约0.29，应该检测为英文
        expect(await detectInputLanguage({ text: mixedText })).toBe("en-US");

        // 使用较低阈值 0.2，中文占比0.29>0.2，应该检测为中文
        expect(await detectInputLanguage({ text: mixedText, threshold: 0.2 })).toBe("zh-CN");

        // 使用较高阈值 0.5，中文占比0.29<0.5，应该检测为英文
        expect(await detectInputLanguage({ text: mixedText, threshold: 0.5 })).toBe("en-US");
      });
    });

    describe("Real-world mixed language scenarios", () => {
      it("should handle tech terms with Chinese discussion", async () => {
        expect(await detectInputLanguage({ text: "我需要调用API获取数据" })).toBe("zh-CN");
        expect(await detectInputLanguage({ text: "请访问https://example.com获取更多信息" })).toBe(
          "zh-CN",
        );
        expect(await detectInputLanguage({ text: "使用React开发前端应用程序" })).toBe("zh-CN");
      });

      it("should handle Chinese terms in English discussion", async () => {
        expect(await detectInputLanguage({ text: "I think 用户体验 is important" })).toBe("en-US");
        expect(await detectInputLanguage({ text: "We should focus on 产品经理 feedback" })).toBe(
          "en-US",
        );
        expect(await detectInputLanguage({ text: "The 研究 shows interesting results" })).toBe(
          "en-US",
        );
      });

      it("should handle brand names and proper nouns", async () => {
        // 产品名称通常是英文，但讨论用中文
        expect(await detectInputLanguage({ text: "我觉得iPhone的设计很好" })).toBe("zh-CN");
        expect(await detectInputLanguage({ text: "iPhone design is really good" })).toBe("en-US");
        expect(await detectInputLanguage({ text: "我想购买Tesla电动汽车" })).toBe("zh-CN");
      });

      it("should handle code snippets in different languages", async () => {
        // 中文开头，强烈倾向中文
        const codeText = "使用 const result = await api.call() 获取数据";
        expect(await detectInputLanguage({ text: codeText })).toBe("zh-CN");

        expect(
          await detectInputLanguage({ text: "Use const result = await api.call() to fetch data" }),
        ).toBe("en-US");

        // 中文开头，强烈倾向中文
        expect(await detectInputLanguage({ text: "这个function很有用：function test() {}" })).toBe(
          "zh-CN",
        );

        // 中文开头的代码场景
        expect(await detectInputLanguage({ text: "我需要使用这个方法来处理数据" })).toBe("zh-CN");
      });
    });

    describe("CJK and other language handling", () => {
      it("should detect Traditional Chinese as Chinese", async () => {
        expect(await detectInputLanguage({ text: "繁體中文輸入測試" })).toBe("zh-CN");
        expect(await detectInputLanguage({ text: "我們需要進行使用者研究" })).toBe("zh-CN");
      });

      it("should handle Japanese text (detected as Chinese due to Kanji)", async () => {
        // Japanese Kanji will be detected as Chinese characters - expected behavior
        expect(await detectInputLanguage({ text: "日本語のテスト" })).toBe("zh-CN");
        expect(await detectInputLanguage({ text: "ユーザー研究が必要です" })).toBe("zh-CN");
      });

      it("should handle Korean text", async () => {
        // Korean should be detected as English since it doesn't match Chinese character ranges
        expect(await detectInputLanguage({ text: "한국어 테스트입니다" })).toBe("en-US");
        expect(await detectInputLanguage({ text: "사용자 연구가 필요합니다" })).toBe("en-US");
      });
    });

    describe("Edge cases and performance", () => {
      it("should handle very long text efficiently", async () => {
        const longChineseText = "中文内容".repeat(1000);
        const longEnglishText = "English content ".repeat(1000);

        expect(await detectInputLanguage({ text: longChineseText })).toBe("zh-CN");
        expect(await detectInputLanguage({ text: longEnglishText })).toBe("en-US");
      });

      it("should be consistent with repeated calls", async () => {
        const testText = "这是一个测试文本with mixed languages";
        const result1 = await detectInputLanguage({ text: testText });
        const result2 = await detectInputLanguage({ text: testText });
        const result3 = await detectInputLanguage({ text: testText });

        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
      });

      it("should handle special characters and symbols", async () => {
        expect(await detectInputLanguage({ text: "用户满意度达到95%，非常不错" })).toBe("zh-CN");
        expect(
          await detectInputLanguage({ text: "User satisfaction reached 95%, very good" }),
        ).toBe("en-US");
        expect(await detectInputLanguage({ text: "123456!@#$%^" })).toBe("en-US");
      });
    });

    describe("Fallback behavior without explicit fallbackLocale", () => {
      it("should handle missing fallbackLocale gracefully", async () => {
        // 在测试环境中，getLocale() 可能不可用，所以我们只测试有 fallbackLocale 的情况
        // 实际使用中应该总是提供 fallbackLocale
        try {
          const result = await detectInputLanguage({ text: "" });
          expect(["zh-CN", "en-US"]).toContain(result);
        } catch (error) {
          // 在测试环境中 getLocale() 可能不可用，这是预期的
          expect((error as Error).message).toContain("getLocale");
        }
      });
    });

    describe("Integration with prompt selection", () => {
      it("should work correctly in prompt selection scenarios", async () => {
        // Simulate selecting prompts based on detected language
        const chineseInput = "我想研究用户对智能家居产品的接受度";
        const englishInput = "I want to study user acceptance of smart home products";

        const chineseLocale = await detectInputLanguage({
          text: chineseInput,
          fallbackLocale: "en-US",
        });
        const englishLocale = await detectInputLanguage({
          text: englishInput,
          fallbackLocale: "zh-CN",
        });

        expect(chineseLocale).toBe("zh-CN");
        expect(englishLocale).toBe("en-US");

        // Simulate system messages falling back to user's locale preference
        const systemWithChinese = await detectInputLanguage({
          text: "[READY]",
          fallbackLocale: "zh-CN",
        });
        const systemWithEnglish = await detectInputLanguage({
          text: "[USER_HESITATED]",
          fallbackLocale: "en-US",
        });

        expect(systemWithChinese).toBe("zh-CN");
        expect(systemWithEnglish).toBe("en-US");
      });
    });
  });
});
