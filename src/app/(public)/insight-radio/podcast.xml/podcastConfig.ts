import { Locale } from "next-intl";

/**
 * Podcast channel configuration
 */
export interface PodcastChannelConfig {
  /** Tag used to filter podcasts from FeaturedItem */
  tag: string;
  /** Podcast title */
  title: string;
  /** Podcast description (locale-aware) */
  description: {
    "zh-CN": string;
    "en-US": string;
  };
  /** Author/Owner name */
  author: string;
  /** Contact email */
  email: string;
  /** Logo image URL (locale-aware) */
  logoSrc: {
    "zh-CN": string;
    "en-US": string;
  };
  /** iTunes categories */
  categories: Array<{
    text: string;
    subcategory?: string;
  }>;
  /** Explicit content flag */
  explicit: boolean;
  /** Podcast type (episodic or serial) */
  type: "episodic" | "serial";
}

/**
 * All configured podcast channels
 */
export const PODCAST_CONFIGS: Record<string, PodcastChannelConfig> = {
  podcastRSS: {
    tag: "podcastRSS",
    title: "Atypica Insight Radio",
    description: {
      "zh-CN":
        '在信息爆炸的时代，Atypica.AI 让商业研究不仅能"看"，还能"听"。我们把传统的市场和商业调研，变成一场充满洞察力的音频之旅——随时随地，轻松获得新观点。每一期节目都带来鲜活的案例、趋势与视角，帮助你听见消费者，读懂市场。想让你的研究和观点也被世界听见？快来 Atypica.AI，一键生成属于你的研究与播客。',
      "en-US":
        "In an age of information overload, atypica.AI makes research reports something you can not only read, but listen to. We turn traditional market research into an insightful audio journey you can enjoy anytime and anywhere. Each episode brings fresh ideas and perspectives to help you hear the consumers, and understand the market. 💡 And if you'd like, you can also create your own research reports and podcasts with atypica.AI. We can't wait to hear your voice too.",
    },
    author: "atypica.AI",
    email: "hi@atypica.ai",
    logoSrc: {
      "zh-CN":
        "https://bmrlab-prod.s3.cn-north-1.amazonaws.com.cn/atypica/public/atypica-insight-podcast-logo-20251118.jpg",
      "en-US":
        "https://bmrlab-prod.s3.us-east-1.amazonaws.com/atypica/public/atypica-insight-podcast-logo-20251118.jpg",
    },
    categories: [
      {
        text: "Business",
        subcategory: "Management",
      },
      {
        text: "Technology",
      },
    ],
    explicit: false,
    type: "episodic",
  },
  atypicaBet: {
    tag: "atypicaBet",
    title: "The Probability Game",
    description: {
      "zh-CN":
        '这不是又一档 AI 播客。这是通过 AI 重塑预测的实验记录。每一期，我们不问 AI 一个问题——我们召集 12 位模拟领域专家：量化交易员、技术分析师、监管专家、VC 们在虚拟圆桌上辩论。从分歧中提炼概率，从多角度碰撞中发现盲区。这里没有单一答案，只有：透明的方法论剖析、真实的预测市场下注追踪、完整的盈亏复盘、概率思维的实践演示。从加密趋势到政策黑天鹅，从市场情绪到链上数据——我们通过 AI 专家模拟探索"智能如何超越猜测"。这是一场公开进行的认知实验。欢迎来到圆桌。',
      "en-US":
        "This isn't another AI podcast. This is the documented chronicle of reinventing prediction through AI. Each episode, we don't ask AI a single question—we convene 12 simulated domain experts. Quant traders, technical analysts, regulatory specialists, and VCs debate at a virtual roundtable. From their disagreements, we distill probabilities. From multi-angle collision, we uncover blind spots. No single answers here. Only: transparent methodology dissection, real prediction market bet tracking, complete post-mortems of wins and losses, probabilistic thinking in action. From crypto trends to policy black swans, from market sentiment to on-chain data—we explore \"how intelligence goes beyond guessing\" through AI expert simulation. This is a cognitive experiment, conducted in public. Welcome to the roundtable.",
    },
    author: "ioiio.eth",
    email: "hi@ioiio.bet",
    logoSrc: {
      "zh-CN":
        "https://bmrlab-s3.musecdn1.com/atypica/public/ioiio-bet-logo-e5420f33-e7c8-46f1-a544-b2e5f94517fb.png?region=us-east-1",
      "en-US":
        "https://bmrlab-s3.musecdn1.com/atypica/public/ioiio-bet-logo-e5420f33-e7c8-46f1-a544-b2e5f94517fb.png?region=us-east-1",
    },
    categories: [
      {
        text: "Business",
      },
      {
        text: "Technology",
      },
    ],
    explicit: false,
    type: "episodic",
  },
};

/**
 * Get podcast configuration by tag
 * @param tag - Tag to filter
 * @returns Podcast configuration
 * @throws Error if tag is not configured
 */
export function getPodcastConfig(tag: string): PodcastChannelConfig {
  const configTag = tag;
  const config = PODCAST_CONFIGS[configTag];

  if (!config) {
    throw new Error(
      `Podcast configuration not found for tag: ${configTag}. Available tags: ${Object.keys(PODCAST_CONFIGS).join(", ")}`,
    );
  }

  return config;
}

/**
 * Get localized values from config
 */
export function getLocalizedConfig(config: PodcastChannelConfig, locale: Locale) {
  return {
    title: config.title,
    description: config.description[locale],
    author: config.author,
    email: config.email,
    logoSrc: config.logoSrc[locale],
    categories: config.categories,
    explicit: config.explicit,
    type: config.type,
  };
}
