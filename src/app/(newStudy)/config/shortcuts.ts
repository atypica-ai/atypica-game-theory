export interface StudyShortcut {
  id: string;
  emoji: string;
  title: {
    zh: string;
    en: string;
  };
  description: {
    zh: string;
    en: string;
  };
  tags: string[];
  category: string;
}

export const studyShortcuts: StudyShortcut[] = [
  // 产品测试 & 方案对比
  {
    id: "iphone-vs-huawei",
    emoji: "🎯",
    title: {
      zh: "iPhone vs 华为旗舰机焦点小组",
      en: "iPhone vs Huawei Focus Group",
    },
    description: {
      zh: "比较 iPhone vs 华为旗舰机，邀请 8 位不同年龄段用户进行焦点小组讨论，了解他们的选择理由",
      en: "Compare iPhone vs Huawei flagship phones through focus group discussion with 8 users of different age groups",
    },
    tags: ["焦点小组", "生成报告", "Focus Group", "Report"],
    category: "product-testing",
  },
  {
    id: "delivery-app-design",
    emoji: "📱",
    title: {
      zh: "外卖 APP 首页设计 A/B 测试",
      en: "Delivery App Homepage A/B Test",
    },
    description: {
      zh: "测试 3 种外卖 APP 首页设计方案，让年轻白领评价哪个更符合他们的使用习惯",
      en: "Test 3 delivery app homepage designs, have young professionals evaluate which best fits their usage habits",
    },
    tags: ["焦点小组", "方案测试", "Focus Group", "A/B Test"],
    category: "product-testing",
  },
  {
    id: "coffee-brand-positioning",
    emoji: "☕",
    title: {
      zh: "咖啡品牌定位圆桌讨论",
      en: "Coffee Brand Positioning Roundtable",
    },
    description: {
      zh: '新咖啡品牌定位策略：对比"精品咖啡"vs"平价连锁"，通过用户圆桌讨论收集意见',
      en: 'Compare "Specialty Coffee" vs "Budget Chain" positioning strategies through user roundtable discussion',
    },
    tags: ["圆桌讨论", "生成报告", "Roundtable", "Report"],
    category: "product-testing",
  },

  // 社媒观察 & 人设构建
  {
    id: "xiaohongshu-camping",
    emoji: "🏕️",
    title: {
      zh: "小红书露营爱好者画像",
      en: "Xiaohongshu Camping Enthusiast Personas",
    },
    description: {
      zh: "从小红书露营笔记中构建 3-5 个典型露营爱好者画像（精致露营派、硬核户外派、亲子露营派...）",
      en: "Build 3-5 typical camping enthusiast personas from Xiaohongshu camping notes (Glamping, Hardcore, Family camping...)",
    },
    tags: ["小红书观察", "构建人设", "Xiaohongshu Scout", "Build Personas"],
    category: "persona-building",
  },
  {
    id: "zhihu-ai-tools",
    emoji: "💻",
    title: {
      zh: "知乎程序员 AI 工具态度分析",
      en: "Zhihu Programmers' AI Tools Attitude",
    },
    description: {
      zh: "分析知乎程序员对 AI 编程工具的讨论，提取不同资历程序员的使用态度和画像",
      en: "Analyze Zhihu programmers' discussions on AI coding tools, extract attitudes from different experience levels",
    },
    tags: ["知乎观察", "构建人设", "Zhihu Scout", "Build Personas"],
    category: "persona-building",
  },
  {
    id: "douban-movie-taste",
    emoji: "🎬",
    title: {
      zh: "豆瓣文艺青年观影品味",
      en: "Douban Art Film Enthusiasts' Taste",
    },
    description: {
      zh: "从豆瓣观影小组提取文艺青年画像，研究他们的观影品味和推荐偏好",
      en: "Extract art film enthusiast personas from Douban film groups, study their viewing preferences",
    },
    tags: ["豆瓣观察", "构建人设", "圆桌讨论", "Douban Scout", "Personas", "Roundtable"],
    category: "persona-building",
  },

  // 内容生成：播客 & 报告
  {
    id: "skincare-podcast",
    emoji: "🎙️",
    title: {
      zh: "护肤指南播客节目",
      en: "Skincare Guide Podcast",
    },
    description: {
      zh: '基于小红书护肤讨论构建用户画像，然后生成一期"敏感肌护理指南"播客节目',
      en: 'Build personas from Xiaohongshu skincare discussions, generate a "Sensitive Skin Care Guide" podcast episode',
    },
    tags: ["小红书观察", "构建人设", "播客生成", "Xiaohongshu Scout", "Personas", "Podcast"],
    category: "content-generation",
  },
  {
    id: "coffee-trend-report",
    emoji: "📊",
    title: {
      zh: "咖啡消费趋势市场报告",
      en: "Coffee Consumption Trend Report",
    },
    description: {
      zh: "研究咖啡消费趋势，让不同类型的咖啡爱好者进行圆桌讨论，最后生成市场洞察报告",
      en: "Research coffee consumption trends, roundtable with different coffee enthusiasts, generate market insight report",
    },
    tags: ["调研专家", "焦点小组", "生成报告", "Expert Planning", "Focus Group", "Report"],
    category: "content-generation",
  },

  // 深度访谈
  {
    id: "tesla-owner-journey",
    emoji: "🚗",
    title: {
      zh: "特斯拉车主决策旅程访谈",
      en: "Tesla Owner Decision Journey Interview",
    },
    description: {
      zh: "深度访谈 5-8 位特斯拉车主，了解他们从燃油车切换到电动车的完整决策旅程",
      en: "Deep interviews with 5-8 Tesla owners about their complete decision journey from gas to electric vehicles",
    },
    tags: ["深度访谈", "生成报告", "Deep Interview", "Report"],
    category: "deep-interview",
  },
  {
    id: "gen-z-instant-food",
    emoji: "🍱",
    title: {
      zh: "00 后独居青年预制菜态度",
      en: "Gen Z Singles' Pre-made Food Attitude",
    },
    description: {
      zh: "采访 00 后独居青年，挖掘他们对预制菜的真实态度和使用场景",
      en: "Interview Gen Z singles living alone, uncover their real attitudes and usage scenarios for pre-made food",
    },
    tags: ["深度访谈", "Deep Interview"],
    category: "deep-interview",
  },

  // 市场分析 & 竞品
  {
    id: "starbucks-luckin-comparison",
    emoji: "☕",
    title: {
      zh: "星巴克 vs 瑞幸品牌认知对比",
      en: "Starbucks vs Luckin Brand Perception",
    },
    description: {
      zh: "对比星巴克、瑞幸、Manner 三个品牌：通过焦点小组了解用户对各品牌的认知差异",
      en: "Compare Starbucks, Luckin, Manner: understand user perception differences through focus group",
    },
    tags: ["焦点小组", "竞品分析", "Focus Group", "Competitive Analysis"],
    category: "market-analysis",
  },
  {
    id: "smartwatch-market",
    emoji: "⌚",
    title: {
      zh: "智能手表市场机会点分析",
      en: "Smartwatch Market Opportunity Analysis",
    },
    description: {
      zh: "搜索智能手表市场最新趋势，结合用户深度访谈，生成产品机会点分析报告",
      en: "Search latest smartwatch market trends, combine with user interviews, generate product opportunity analysis report",
    },
    tags: ["联网搜索", "深度访谈", "生成报告", "Web Search", "Deep Interview", "Report"],
    category: "market-analysis",
  },
];
