import { Analyst } from "@/prisma/client";
import { Locale } from "next-intl";

export const podcastScriptPrologue = ({
  locale,
  analyst,
  instruction,
}: {
  locale: Locale;
  analyst: Pick<Analyst, "brief" | "topic" | "studyLog">;
  instruction?: string;
}) =>
  locale === "zh-CN"
    ? `
# 播客脚本生成请求

<用户简述>
${analyst.brief}
</用户简述>

<研究主题>
${analyst.topic}
</研究主题>

<研究内容>
${analyst.studyLog}
</研究内容>

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

<User Brief>
${analyst.brief}
</User Brief>

<Research Topic>
${analyst.topic}
</Research Topic>

<Research Content>
${analyst.studyLog}
</Research Content>

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
