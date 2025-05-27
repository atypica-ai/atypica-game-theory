import { Metadata } from "next";
import { Locale } from "next-intl";

const siteDescriptions = {
  "zh-CN": `商业研究本质上是关于理解和影响人类决策过程的学问。消费者并不只是根据纯粹的数据和统计概率做决策，而是受到叙事、情感和认知偏见的强烈影响。这也是为什么品牌故事、营销叙事和企业文化等「内容」在商业中如此重要——它们都在塑造人们理解和互动的「故事」，从而影响决策过程。所以，理解影响决策的机制是商业研究的核心；这也是行为经济学、消费者心理学和组织行为学等领域与商业研究紧密相连的原因。

我们做了一个商业问题研究的智能体框架「atypica.AI」。将「语言模型」应用于理解商业领域中那些难以量化的主观因素——消费者情绪、市场认知和决策偏好；通过「智能体」来「塑造」消费者的个性和认知；通过与智能体的「互动」来获得消费者的行为和决策。

如果，「物理」为「客观世界」建模；那么，「语言模型」则为「主观世界」建模。`,
  "en-US": `Business research is fundamentally about understanding and influencing human decision-making processes. Consumers don't make decisions based purely on data and statistical probabilities—they are heavily influenced by narratives, emotions, and cognitive biases. This is why brand stories, marketing narratives, and corporate culture are so crucial in business—they shape the "stories" that people understand and interact with, thereby influencing decision-making processes. Understanding the mechanisms that influence decisions is at the core of business research, which is why fields like behavioral economics, consumer psychology, and organizational behavior are so closely connected to business research.

We've built an AI agent framework called "atypica.AI" for business research. It applies "language models" to understand subjective factors in business that are difficult to quantify—consumer emotions, market perceptions, and decision preferences. Through "agents," we "model" consumer personalities and cognition; through "interactions" with agents, we obtain consumer behavior and decisions.

If "physics" models the "objective world," then "language models" model the "subjective world."`,
};

export function generatePageMetadata({
  title,
  description,
  locale,
}: {
  title: string;
  description?: string;
  locale: Locale;
}): Pick<Metadata, "title" | "description" | "openGraph" | "twitter"> {
  const defaultDescription =
    siteDescriptions[locale as keyof typeof siteDescriptions] || siteDescriptions["en-US"];
  description = description || defaultDescription;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
