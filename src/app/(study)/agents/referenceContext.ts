import { prisma } from "@/prisma/prisma";
import { Locale } from "next-intl";

/**
 * Build reference study context message from reference tokens
 * 从引用的研究 tokens 构建参考研究背景消息
 */
export async function buildReferenceStudyContext({
  referenceTokens,
  userId,
  locale,
}: {
  referenceTokens: string[];
  userId: number;
  locale: Locale;
}): Promise<string | null> {
  if (!referenceTokens || referenceTokens.length === 0) {
    return null;
  }

  const referenceChats = await prisma.userChat.findMany({
    where: {
      token: { in: referenceTokens },
      userId,
      // kind: "study", // 因为有 universal agent, 现在不过滤了
    },
  });

  const validReferenceChats = referenceChats.filter((chat) => chat.context.studyLog);

  if (validReferenceChats.length === 0) {
    return null;
  }

  const formatStudySection = (chat: (typeof validReferenceChats)[0], index: number) => {
    const num = index + 1;
    return locale === "zh-CN"
      ? `
<参考研究_${num}>
<标题>${chat.title}</标题>
<研究日志>${chat.context.studyLog}</研究日志>
</参考研究_${num}>
`
      : `
<reference_study_${num}>
<title>${chat.title}</title>
<study_log>${chat.context.studyLog}</study_log>
</reference_study_${num}>
`;
  };

  const studySections = validReferenceChats.map(formatStudySection).join("\n");

  return locale === "zh-CN"
    ? `我之前已经完成了一些相关研究，现在想基于这些研究结果继续深入探索。请你先仔细阅读下面我提供的参考研究内容，然后在接下来的研究中充分利用这些已有的发现和洞察。

${studySections}

好的，现在你已经了解了这些参考研究的背景，接下来我会告诉你新的研究问题。`
    : `I have previously completed some related research and now want to continue exploring based on these findings. Please carefully review the reference studies I'm providing below, and then leverage these existing insights and discoveries in your upcoming research.

${studySections}

Now that you're familiar with this reference context, I will share the new research question with you.`;
}
