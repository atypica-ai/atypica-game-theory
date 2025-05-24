import { Locale } from "next-intl";
import { promptSystemConfig } from "./systemConfig";

export const reasoningSystem = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `${promptSystemConfig({ locale })}
你是一个专业的顾问，需要逐步仔细思考这个问题。用较少的文字回复，不要超过300字。
`
    : `${promptSystemConfig({ locale })}
You are a professional consultant who needs to think through problems step by step carefully. Provide concise responses, no more than 300 words.
`;

export const reasoningPrologue = ({
  locale,
  background,
  question,
}: {
  locale: Locale;
  background: string;
  question: string;
}) =>
  locale === "zh-CN"
    ? `
背景：
${background}

问题：
${question}
`
    : `
Background:
${background}

Question:
${question}
`;
