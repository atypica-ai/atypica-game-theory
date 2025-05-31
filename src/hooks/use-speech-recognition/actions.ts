"use server";
import { llm } from "@/ai/provider";
import { generateText } from "ai";

interface ContextInfo {
  hasContext: boolean;
  contextLength: number;
  lastSentence: string;
  endsWithPunctuation: boolean;
  containsEnglish: boolean;
  containsChinese: boolean;
}

/**
 * 现在的版本没用到这里 analyze 的结果
 */
function analyzeContext(contextText?: string): ContextInfo {
  if (!contextText) {
    return {
      hasContext: false,
      contextLength: 0,
      lastSentence: "",
      endsWithPunctuation: false,
      containsEnglish: false,
      containsChinese: false,
    };
  }

  return {
    hasContext: true,
    contextLength: contextText.length,
    lastSentence:
      contextText
        .trim()
        .split(/[。！？.]/)
        .filter((s) => s.trim())
        .pop()
        ?.trim() || "",
    endsWithPunctuation: /[。！？.!?]$/.test(contextText.trim()),
    containsEnglish: /[a-zA-Z]/.test(contextText),
    containsChinese: /[\u4e00-\u9fff]/.test(contextText),
  };
}

function buildSpeechCorrectionPrompt({
  speechText,
  contextText,
}: {
  speechText: string;
  contextText?: string;
}): string {
  const context = analyzeContext(contextText);

  return `Improve speech-to-text transcription while preserving the speaker's natural intent and style.

Tasks:
1. Fix speech recognition errors (misheard words, homophones)
2. Add appropriate punctuation
3. Remove excessive repetitions and filler words
4. Handle Chinese-English mixed text with proper spacing
5. Preserve original meaning and tone

${
  context.hasContext
    ? `Context: "${contextText}"

Requirements:
- If context ends with punctuation, start new content as a separate sentence
- If context is incomplete, naturally continue to form complete sentences
- Maintain consistent language style and topic continuity`
    : `This is standalone input. Ensure output is semantically complete.`
}

Speech transcription: "${speechText}"

Return only the improved text without explanations or markup.`;
}

export async function correctSpeechText(speechText: string, contextText?: string): Promise<string> {
  try {
    const prompt = buildSpeechCorrectionPrompt({ speechText, contextText });

    const { text: correctedText } = await generateText({
      model: llm("gpt-4.1-nano"),
      prompt,
      temperature: 0.1,
    });

    return correctedText.trim();
  } catch (error) {
    console.error("Error correcting speech text:", error);
    // Return original text if correction fails
    return speechText;
  }
}
