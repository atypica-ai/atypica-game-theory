export interface StudyShortcut {
  id: string;
  emoji: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
}

// English shortcuts - independent cases for global markets
export const studyShortcutsEN: StudyShortcut[] = [
  // Product Testing & Comparison
  {
    id: "streaming-apps-comparison",
    emoji: "📺",
    title: "Netflix vs Disney+ vs HBO Max: Which wins Gen Z?",
    description:
      "8-person focus group comparing streaming platforms: content quality, UI/UX, pricing perception among 18-25 year olds",
    tags: ["Focus Group", "Report"],
    category: "product-testing",
  },
  {
    id: "fitness-app-features",
    emoji: "💪",
    title: "What features make fitness apps sticky for busy professionals?",
    description:
      "Test 3 feature sets with working professionals, find what drives 30-day retention: gamification vs community vs AI coaching",
    tags: ["Focus Group", "A/B Test"],
    category: "product-testing",
  },
  {
    id: "sustainable-fashion-positioning",
    emoji: "👕",
    title: "How should sustainable fashion brands position to Gen Z?",
    description:
      "Roundtable discussion exploring Gen Z attitudes: eco-consciousness vs affordability, brand authenticity, social proof",
    tags: ["Roundtable", "Report"],
    category: "product-testing",
  },

  // Social Media Insights & Personas
  {
    id: "tiktok-fitness-creators",
    emoji: "🏋️",
    title: "What fitness content goes viral on TikTok in 2025?",
    description:
      "Scout TikTok fitness creators, extract 3-5 creator personas (science-based, motivational, beginner-friendly), identify viral patterns",
    tags: ["TikTok Scout", "Build Personas"],
    category: "persona-building",
  },
  {
    id: "instagram-skincare-community",
    emoji: "✨",
    title: "What do Instagram skincare enthusiasts really want?",
    description:
      "Analyze Instagram skincare discussions, build personas of clean beauty advocates, K-beauty fans, and dermatology followers",
    tags: ["Instagram Scout", "Build Personas"],
    category: "persona-building",
  },
  {
    id: "twitter-ai-developers",
    emoji: "🤖",
    title: "How are developers talking about AI tools on Twitter?",
    description:
      "Scout Twitter AI dev community, extract attitudes from indie hackers, enterprise engineers, and AI researchers",
    tags: ["Twitter Scout", "Build Personas", "Roundtable"],
    category: "persona-building",
  },

  // Content Generation: Podcasts & Reports
  {
    id: "mental-health-podcast",
    emoji: "🎙️",
    title: "What mental health topics resonate with young professionals?",
    description:
      "Build personas from mental health discussions, generate a podcast on workplace burnout and coping strategies",
    tags: ["Build Personas", "Podcast"],
    category: "content-generation",
  },
  {
    id: "ai-tools-trend-report",
    emoji: "📊",
    title: "Where is the AI productivity tools market heading in 2025?",
    description:
      "Research AI tools trends, roundtable with different user types (developers, designers, writers), generate market insight report",
    tags: ["Expert Planning", "Focus Group", "Report"],
    category: "content-generation",
  },

  // Deep Interviews
  {
    id: "ev-adoption-journey",
    emoji: "🚗",
    title: "Why did early adopters switch to electric vehicles?",
    description:
      "Deep interviews with 5-8 EV owners, reconstruct decision journey: concerns about range, charging infrastructure, turning points",
    tags: ["Deep Interview", "Report"],
    category: "deep-interview",
  },
  {
    id: "remote-work-tools",
    emoji: "💼",
    title: "What makes remote workers stick to a collaboration tool?",
    description:
      "Interview remote workers about Slack vs Discord vs Notion: onboarding experience, daily habits, team dynamics",
    tags: ["Deep Interview"],
    category: "deep-interview",
  },

  // Market Analysis & Competitive
  {
    id: "coffee-chains-battle",
    emoji: "☕",
    title: "Starbucks vs local coffee shops: What drives loyalty?",
    description:
      "Focus group comparing Starbucks, Blue Bottle, local cafes: brand perception, experience value, community vs convenience",
    tags: ["Focus Group", "Competitive Analysis"],
    category: "market-analysis",
  },
  {
    id: "wearables-market-gaps",
    emoji: "⌚",
    title: "What unmet needs exist in the smartwatch market?",
    description:
      "Search latest wearables trends, interview users, find innovation opportunities beyond Apple Watch, Garmin, Samsung",
    tags: ["Web Search", "Deep Interview", "Report"],
    category: "market-analysis",
  },
];

// Chinese shortcuts - independent cases, can include Xiaohongshu/Douyin
export const studyShortcutsZH: StudyShortcut[] = [
  // 产品测试 & 方案对比
  {
    id: "streaming-platform-comparison-zh",
    emoji: "📺",
    title: "爱优腾哪家会员最值得买？",
    description: "8 人焦点小组对比爱奇艺、优酷、腾讯视频：内容质量、UI体验、价格认知，找到 18-30 岁用户的真实选择理由",
    tags: ["焦点小组", "生成报告"],
    category: "product-testing",
  },
  {
    id: "fitness-app-retention-zh",
    emoji: "💪",
    title: "什么功能让健身 App 用户留下来？",
    description: "测试 3 种功能组合，找到让上班族坚持 30 天的关键：游戏化 vs 社区 vs AI 私教",
    tags: ["焦点小组", "方案测试"],
    category: "product-testing",
  },
  {
    id: "tea-brand-positioning-zh",
    emoji: "🍵",
    title: "新茶饮品牌如何在喜茶奈雪之外突围？",
    description: "圆桌讨论探索 Z 世代态度：健康 vs 口感、品牌调性、社交属性，找到差异化定位机会",
    tags: ["圆桌讨论", "生成报告"],
    category: "product-testing",
  },

  // 社媒观察 & 人设构建
  {
    id: "xiaohongshu-camping",
    emoji: "🏕️",
    title: "什么样的露营产品能在小红书爆火？",
    description: "从小红书露营笔记中提取 3-5 种典型用户画像（精致露营派、硬核户外派、亲子派），发现他们的消费偏好和内容偏好",
    tags: ["小红书观察", "构建人设"],
    category: "persona-building",
  },
  {
    id: "douyin-beauty-trends",
    emoji: "💄",
    title: "抖音美妆博主的流量密码是什么？",
    description: "观察抖音美妆内容，提取爆款博主画像（成分党、平价替代、高端测评），分析他们的内容策略和粉丝画像",
    tags: ["抖音观察", "构建人设"],
    category: "persona-building",
  },
  {
    id: "xiaohongshu-travel",
    emoji: "✈️",
    title: "小红书旅游笔记什么内容最受欢迎？",
    description: "从小红书旅游内容中提取用户偏好：City Walk、小众目的地、美食探店，构建不同类型旅行者画像",
    tags: ["小红书观察", "构建人设", "圆桌讨论"],
    category: "persona-building",
  },

  // 内容生成：播客 & 报告
  {
    id: "workplace-anxiety-podcast",
    emoji: "🎙️",
    title: "职场年轻人最关心什么心理健康话题？",
    description: "基于职场讨论构建年轻人画像，生成一期关于职场焦虑和应对策略的播客节目",
    tags: ["构建人设", "播客生成"],
    category: "content-generation",
  },
  {
    id: "new-consumer-report",
    emoji: "📊",
    title: "2025 年新消费品牌的机会在哪里？",
    description: "研究新消费趋势，让不同消费群体（Z世代、新中产、银发族）进行圆桌讨论，生成市场洞察报告",
    tags: ["调研专家", "焦点小组", "生成报告"],
    category: "content-generation",
  },

  // 深度访谈
  {
    id: "ev-china-adoption",
    emoji: "🚗",
    title: "为什么他们选择了国产电动车？",
    description: "深度访谈 5-8 位比亚迪、小鹏、蔚来车主，还原完整决策旅程：顾虑、转折点、购后体验对比",
    tags: ["深度访谈", "生成报告"],
    category: "deep-interview",
  },
  {
    id: "gen-z-career-choice",
    emoji: "💼",
    title: "00 后为什么不想进大厂了？",
    description: "采访年轻职场人，挖掘他们的职业选择逻辑：工作意义 vs 薪资、Work-Life Balance、职业发展路径",
    tags: ["深度访谈"],
    category: "deep-interview",
  },

  // 市场分析 & 竞品
  {
    id: "coffee-chains-china",
    emoji: "☕",
    title: "星巴克 vs 瑞幸 vs Manner，谁抓住了年轻人？",
    description: "焦点小组对比三个品牌，揭示用户认知差异：品牌形象、性价比、空间体验、社交价值",
    tags: ["焦点小组", "竞品分析"],
    category: "market-analysis",
  },
  {
    id: "smartphone-market-gaps",
    emoji: "📱",
    title: "手机市场还有哪些未被满足的需求？",
    description: "搜索最新市场趋势，结合用户访谈，发现 iPhone、华为、小米之外的产品创新机会点",
    tags: ["联网搜索", "深度访谈", "生成报告"],
    category: "market-analysis",
  },
];
