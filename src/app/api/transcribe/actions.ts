"use server";
import { llm, providerOptions } from "@/ai/provider";
import { detectInputLanguage } from "@/lib/textUtils";
import { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { generateText } from "ai";
import { Locale } from "next-intl";

function buildSpeechCorrectionPrompt({
  speechText,
  contextText,
  locale,
}: {
  speechText: string;
  contextText?: string;
  locale: Locale;
}): string {
  return locale === "zh-CN"
    ? `你是一个专业的语音识别文本校正助手。请修正语音转文字中的错误，同时保持说话者的原意和表达风格。

主要任务：
1. **纠正识别错误**：修复同音词、谐音词、英文品牌名称错误
2. **添加标点符号**：为长句添加适当的逗号、句号，提升可读性
3. **优化语言表达**：
   - 去除过多的"然后"、"那个"等口语词汇
   - 保留自然的语言节奏，不要过度书面化
   - 修正语法错误但保持口语化风格
4. **处理中英文混合**：确保中英文之间有适当间距
5. **品牌名称准确性**：常见软件/工具名称要拼写正确

${
  contextText
    ? `上下文：「${contextText}」

注意事项：
- 如果上下文以句号结尾，将新内容作为独立句子开始
- 如果上下文不完整，自然地续写成完整句子
- 保持语言风格和话题的连续性`
    : `这是独立输入，请确保输出语义完整。`
}

待修正文本：「${speechText}」

请直接返回修正后的文本，不需要解释或标记。`
    : `You are a professional speech-to-text correction assistant. Please correct errors in speech transcription while preserving the speaker's natural intent and style.

Main tasks:
1. **Fix recognition errors**: Correct homophones, misheard words, and brand name errors
2. **Add punctuation**: Insert appropriate commas and periods for readability
3. **Optimize expression**:
   - Remove excessive filler words like "um", "uh", "like", "you know"
   - Maintain natural speech rhythm, don't over-formalize
   - Fix grammar errors while keeping conversational tone
4. **Handle mixed languages**: Ensure proper spacing between English and other languages
5. **Brand name accuracy**: Spell common software/tool names correctly

${
  contextText
    ? `Context: "${contextText}"

Requirements:
- If context ends with punctuation, start new content as a separate sentence
- If context is incomplete, naturally continue to form complete sentences
- Maintain consistent language style and topic continuity`
    : `This is standalone input. Ensure output is semantically complete.`
}

Text to correct: "${speechText}"

Return only the corrected text without explanations or markup.`;
}

export async function correctSpeechText(speechText: string, contextText?: string): Promise<string> {
  try {
    // 检测输入文本的语言
    const locale = await detectInputLanguage({ text: speechText });
    const prompt = buildSpeechCorrectionPrompt({ speechText, contextText, locale });

    const { text: correctedText } = await generateText({
      model: llm("gpt-5-nano"),
      prompt,
      // temperature: 0.1,
      providerOptions: {
        openai: {
          ...providerOptions.openai,
          reasoningSummary: "auto", // 'auto' | 'detailed'
          reasoningEffort: "minimal", // 'minimal' | 'low' | 'medium' | 'high'
        } satisfies OpenAIResponsesProviderOptions,
      },
    });

    return correctedText.trim();
  } catch (error) {
    console.error("Error correcting speech text:", error);
    // Return original text if correction fails
    return speechText;
  }
}
