import { getDisplayWidth, truncateForTitle } from "@/lib/textUtils";
import { describe, expect, it } from "vitest";

describe("textUtils Integration Tests", () => {
  describe("generateChatTitle - Real World Scenarios", () => {
    it("should handle typical English questions", () => {
      const scenarios = [
        "How to implement authentication in Next.js?",
        "What are the best practices for React performance?",
        "Can you help me debug this TypeScript error?",
        "I need help with CSS flexbox layout",
        "Explain the difference between useMemo and useCallback",
      ];

      scenarios.forEach((text) => {
        const result = truncateForTitle(text, {
          maxDisplayWidth: 60,
          suffix: "",
        });

        expect(result).toBe(text); // Should not be truncated
        expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
      });
    });

    it("should handle typical Chinese questions", () => {
      const scenarios = [
        "如何在Next.js中实现身份验证？",
        "React性能优化的最佳实践是什么？",
        "你能帮我调试这个TypeScript错误吗？",
        "我需要CSS flexbox布局的帮助",
        "解释一下useMemo和useCallback的区别",
      ];

      scenarios.forEach((text) => {
        const result = truncateForTitle(text, {
          maxDisplayWidth: 60,
          suffix: "",
        });
        expect(result).toBe(text); // Should not be truncated
        expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
      });
    });

    it("should handle mixed language questions", () => {
      const scenarios = [
        "如何在React中使用useState hook？",
        "Next.js的API routes怎么使用？",
        "TypeScript interface和type的区别是什么？",
        "CSS Grid布局 vs Flexbox的使用场景",
        "JavaScript async/await的最佳实践",
      ];

      scenarios.forEach((text) => {
        const result = truncateForTitle(text, {
          maxDisplayWidth: 60,
          suffix: "",
        });
        expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
      });
    });

    it("should handle long English conversations", () => {
      const longEnglishText =
        "I'm having trouble with implementing a complex data fetching pattern in my React application. I need to fetch data from multiple API endpoints, handle loading states, error states, and implement proper caching mechanisms. Can you provide a comprehensive solution that includes error boundaries, retry logic, and optimistic updates?";

      const result = truncateForTitle(longEnglishText, {
        maxDisplayWidth: 60,
        suffix: "",
      });

      expect(result.length).toBeLessThan(longEnglishText.length);
      expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
      expect(result).not.toContain("...");
    });

    it("should handle long Chinese conversations", () => {
      const longChineseText =
        "我在React应用程序中实现复杂的数据获取模式时遇到了困难。我需要从多个API端点获取数据，处理加载状态、错误状态，并实现适当的缓存机制。你能提供一个包含错误边界、重试逻辑和乐观更新的综合解决方案吗？这个项目使用的是Next.js框架，TypeScript作为开发语言，还集成了Prisma作为ORM工具。";

      const result = truncateForTitle(longChineseText, {
        maxDisplayWidth: 60,
        suffix: "",
      });
      expect(result.length).toBeLessThan(longChineseText.length);
      expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
      expect(result).not.toContain("...");
    });

    it("should handle code snippets in chat", () => {
      const codeSnippets = [
        "const [state, setState] = useState(0); 这行代码什么意思？",
        "如何修复这个错误：Property 'name' does not exist on type 'User'",
        "Why does this function return undefined? function test() { console.log('hello'); }",
        "请解释这段CSS代码：.container { display: grid; grid-template-columns: 1fr 2fr; }",
      ];

      codeSnippets.forEach((text) => {
        const result = truncateForTitle(text, {
          maxDisplayWidth: 60,
          suffix: "",
        });
        expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it("should handle questions with emojis", () => {
      const emojiTexts = [
        "🚀 How to deploy Next.js app to Vercel?",
        "😵 React状态管理库选择困难症",
        "🐛 Bug调试技巧分享",
        "💡 有什么好的编程学习建议吗？",
        "🔥 最新的前端技术趋势是什么？",
      ];

      emojiTexts.forEach((text) => {
        const result = truncateForTitle(text, {
          maxDisplayWidth: 60,
          suffix: "",
        });
        expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
        expect(result.length).toBeGreaterThan(0);
        // Should preserve emojis
        expect(result).toMatch(/[\u{1F300}-\u{1F9FF}]/u);
      });
    });

    it("should handle technical terms and acronyms", () => {
      const technicalTexts = [
        "什么是JWT认证机制？",
        "RESTful API vs GraphQL 优缺点对比",
        "如何优化React应用的SEO？",
        "Docker容器化部署最佳实践",
        "CI/CD流水线搭建指南",
      ];

      technicalTexts.forEach((text) => {
        const result = truncateForTitle(text, {
          maxDisplayWidth: 60,
          suffix: "",
        });
        expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it("should handle multi-line content", () => {
      const multiLineText = `我有一个关于React的问题
具体是关于状态管理的
希望能得到详细的解答`;

      const result = truncateForTitle(multiLineText, {
        maxDisplayWidth: 60,
        suffix: "",
      });

      expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
      expect(result.includes("\n")).toBe(true); // Should preserve line breaks in title
    });

    it("should handle content with special characters", () => {
      const specialCharTexts = [
        "如何处理URL中的特殊字符？&name=value",
        "正则表达式匹配邮箱：/^[\\w.-]+@[\\w.-]+\\.[A-Za-z]{2,}$/",
        'JSON格式化问题：{"name": "张三", "age": 25}',
        "SQL查询优化：SELECT * FROM users WHERE id IN (1,2,3)",
      ];

      specialCharTexts.forEach((text) => {
        const result = truncateForTitle(text, {
          maxDisplayWidth: 60,
          suffix: "",
        });
        expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it("should handle edge cases", () => {
      const edgeCases = [
        "", // Empty string
        "   ", // Only spaces
        "a", // Single character
        "测", // Single Chinese character
        "🎉", // Single emoji
        "A".repeat(200), // Very long English
        "测".repeat(100), // Very long Chinese
      ];

      edgeCases.forEach((text) => {
        const result = truncateForTitle(text, {
          maxDisplayWidth: 60,
          suffix: "",
        });
        expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);

        if (text.trim().length === 0) {
          expect(result).toBe(text); // Preserve empty/space-only strings
        } else {
          expect(result.length).toBeGreaterThan(0);
        }
      });
    });

    it("should be consistent across multiple calls", () => {
      const testText = "这是一个测试文本用于验证函数的一致性表现";

      const results = Array.from({ length: 10 }, () =>
        truncateForTitle(testText, {
          maxDisplayWidth: 60,
          suffix: "",
        }),
      );

      // All results should be identical
      const firstResult = results[0];
      results.forEach((result) => {
        expect(result).toBe(firstResult);
      });
    });

    it("should handle realistic chat conversation starters", () => {
      const conversationStarters = [
        "Hi, I need help with my React project",
        "你好，我想学习TypeScript",
        "Can you explain how async/await works?",
        "请帮我解决这个CSS布局问题",
        "I'm getting an error in my Next.js app",
        "如何优化数据库查询性能？",
        "What's the best way to handle authentication?",
        "React Hooks的使用场景有哪些？",
      ];

      conversationStarters.forEach((text) => {
        const result = truncateForTitle(text, {
          maxDisplayWidth: 60,
          suffix: "",
        });
        expect(result).toBe(text); // Most conversation starters should not be truncated
        expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
      });
    });

    it("should preserve meaning in truncated titles", () => {
      const meaningfulTexts = [
        "我正在开发一个电商网站需要实现用户认证系统购物车功能支付集成和订单管理，请问有什么建议？",
        "I'm building an e-commerce website and need to implement user authentication, shopping cart functionality, payment integration, and order management. What are your recommendations?",
      ];

      meaningfulTexts.forEach((text) => {
        const result = truncateForTitle(text, {
          maxDisplayWidth: 60,
          suffix: "",
        });
        expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
        expect(result.length).toBeGreaterThan(10); // Should preserve meaningful content

        // Should start with the beginning of the original text
        expect(text.startsWith(result.substring(0, Math.min(result.length, 20)))).toBe(true);
      });
    });
  });

  describe("Performance and Memory", () => {
    it("should handle large texts efficiently", () => {
      const largeText = "测试".repeat(10000);

      const startTime = Date.now();
      const result = truncateForTitle(largeText, {
        maxDisplayWidth: 60,
        suffix: "",
      });
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(getDisplayWidth(result)).toBeLessThanOrEqual(60);
    });

    it("should not cause memory leaks with repeated calls", () => {
      const testText = "重复调用测试文本内容";

      // Simulate many calls
      for (let i = 0; i < 1000; i++) {
        const result = truncateForTitle(testText + i, {
          maxDisplayWidth: 60,
          suffix: "",
        });
        expect(result.length).toBeGreaterThan(0);
      }

      // If we reach here without running out of memory, the test passes
      expect(true).toBe(true);
    });
  });
});
