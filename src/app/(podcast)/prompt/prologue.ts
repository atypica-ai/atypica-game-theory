import { Locale } from "next-intl";

export const podcastScriptPrologue = ({
  locale,
  studyLog,
  instruction,
}: {
  locale: Locale;
  studyLog: string;
  instruction?: string;
}) =>
  locale === "zh-CN"
    ? `
# 播客脚本生成请求

研究过程：
<studyLog>
${studyLog}
</studyLog>

  ${
    instruction
      ? `
额外指令（在遵循上述核心要求的基础上）：

<instruction>
${instruction}
</instruction>
`
      : ""
  }

请基于以上研究发现生成全面、引人入胜的播客脚本。
`
    : `
# Podcast Script Generation Request

Study process:
<studyLog>
${studyLog}
</studyLog>

${
  instruction
    ? `
Additional instructions (while following the core requirements above):

<instruction>
${instruction}
</instruction>
`
    : ""
}

Please generate a comprehensive, engaging podcast script based on the above research findings.
`;
