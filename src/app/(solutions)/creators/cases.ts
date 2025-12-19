import type { Locale } from "next-intl";

export interface CreatorCase {
  token: string;
  title: string;
  description: string;
  link: string;
}

export interface FeaturedCase extends CreatorCase {
  audioUrl: string;
  additionalLinks: {
    label: string;
    url: string;
  }[];
}

/**
 * Get the featured case with audio player
 */
export function getFeaturedCase(locale: Locale): FeaturedCase {
  if (locale === "zh-CN") {
    return {
      token: "xhKzUDdmgvuzLrvH",
      title: "99%出海失败的真相：AI硬件如何18月打造全球爆款",
      description:
        "从Plaud AI的案例出发，用产品、市场、法律与供应链的跨学科视角，拆解出一套可复制的GTM路径，告诉你如何在18个月内完成验证、放大与品牌化。",
      link: "https://atypica.ai/artifacts/podcast/xhKzUDdmgvuzLrvH/share",
      audioUrl:
        "https://bmrlab-prod.s3.us-east-1.amazonaws.com/atypica/podcasts/xhKzUDdmgvuzLrvH.mp3",
      additionalLinks: [
        {
          label: "查看研究",
          url: "https://atypica.ai/artifacts/podcast/xhKzUDdmgvuzLrvH/share",
        },
        {
          label: "更多Insight Radio",
          url: "/insight-radio",
        },
      ],
    };
  }

  // en-US
  return {
    token: "eqxbaF7Yp7qKgTFN",
    title: "When Giants Fail: Why Meta Blew Its AI Lead",
    description:
      "Generated from an Atypica research workflow — turn one deep dive into an episode your audience actually wants to hear.",
    link: "https://atypica.ai/artifacts/podcast/eqxbaF7Yp7qKgTFN/share",
    audioUrl:
      "https://bmrlab-prod.s3.us-east-1.amazonaws.com/atypica/podcasts/PWchKQcPhH6TTd9p.mp3",
    additionalLinks: [
      {
        label: "View Study",
        url: "https://atypica.ai/artifacts/podcast/eqxbaF7Yp7qKgTFN/share",
      },
      {
        label: "More Insight Radio",
        url: "/insight-radio",
      },
    ],
  };
}

/**
 * Get example cases for the gallery
 */
export function getExampleCases(locale: Locale): CreatorCase[] {
  if (locale === "zh-CN") {
    return [
      {
        token: "xhKzUDdmgvuzLrvH",
        title: "99%出海失败的真相：AI硬件如何18月打造全球爆款",
        description:
          "众筹作为PMF工具、独立站优先策略、渠道扩展顺序，以及如何避免credential-collector陷阱。一套可复制的出海GTM路径。",
        link: "https://atypica.ai/artifacts/podcast/xhKzUDdmgvuzLrvH/share",
      },
      {
        token: "PWdu4dM3qnD43giX",
        title: "用AI做学习外挂：把费曼法变成十倍记忆力",
        description:
          '当费曼法、主动回忆与AI结合，你可以把理解与记忆效率提升数倍。用认知科学和实践案例，告诉你如何用AI变成学习的"涡轮增压器"。',
        link: "https://atypica.ai/artifacts/podcast/PWdu4dM3qnD43giX/share",
      },
      {
        token: "FC4rPJxKdzHuHH3K",
        title: "10亿美元营收的秘密：Surge AI如何用质量逆袭硅谷规则",
        description:
          '用120人、0风投创造10亿美元营收，颠覆了"规模优先"的创业神话。揭示如何以"人机协同+高薪人才+深度客户绑定"实现极致人效。',
        link: "https://atypica.ai/artifacts/podcast/FC4rPJxKdzHuHH3K/share",
      },
    ];
  }

  // en-US
  return [
    {
      token: "eqxbaF7Yp7qKgTFN",
      title: "When Giants Fail: Why Meta Blew Its AI Lead",
      description:
        "A deep dive into strategic missteps and organizational dynamics. Learn how even tech giants can lose their competitive edge through poor decision-making and execution.",
      link: "https://atypica.ai/artifacts/podcast/eqxbaF7Yp7qKgTFN/share",
    },
    {
      token: "2n2TPbQhY7fPQ7DK",
      title: "When Productivity Tools Kill Deep Work",
      description:
        "Most companies think more tools equal more output — but they're destroying focus and fueling burnout. Discover why popular features become harmful and what leaders must change.",
      link: "https://atypica.ai/artifacts/podcast/2n2TPbQhY7fPQ7DK/share",
    },
    {
      token: "FwTaPY7fgVktgUNs",
      title: "The Degree Bubble: Your Career's Hidden Opportunity",
      description:
        "The traditional degree is losing its economic edge. Learn why the degree premium is collapsing, who should pivot to alternative credentials, and how to build proof-of-work portfolios.",
      link: "https://atypica.ai/artifacts/podcast/FwTaPY7fgVktgUNs/share",
    },
  ];
}
