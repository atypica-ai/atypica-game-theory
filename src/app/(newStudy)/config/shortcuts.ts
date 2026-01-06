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
    title: "Streaming Platform Competition Research",
    description: "Observe social media discussions about Netflix, Disney+, HBO Max, and other streaming services to understand consumer decision factors. Explore content preferences, pricing perception, user interface experience, sharing habits, and what drives platform loyalty or switching behavior across different age groups and viewing patterns.",
    tags: ["Social Listening", "Focus Group", "Report"],
    category: "product-testing",
  },
  {
    id: "fitness-app-features",
    emoji: "💪",
    title: "Fitness App Retention Study",
    description: "Investigate what keeps users coming back to fitness apps like Peloton, Strava, or Nike Training Club. Explore feature usage patterns, social motivation dynamics, gamification effectiveness, habit formation triggers, and the emotional journey from download to long-term commitment or abandonment.",
    tags: ["User Research", "A/B Testing", "Report"],
    category: "product-testing",
  },
  {
    id: "sustainable-fashion-positioning",
    emoji: "👕",
    title: "Sustainable Fashion Brand Positioning",
    description: "Listen to social media conversations about sustainable fashion brands like Patagonia, Allbirds, or Everlane to understand consumer attitudes. Discover how different demographics balance ethical values with style preferences, price sensitivity, and lifestyle fit. Identify positioning opportunities in the growing conscious consumer market.",
    tags: ["Social Listening", "Focus Group", "Report"],
    category: "product-testing",
  },

  // Social Media Insights & Personas
  {
    id: "tiktok-fitness-creators",
    emoji: "🏋️",
    title: "Fitness Content Trends on TikTok",
    description: "Discover what types of fitness content resonate on TikTok—from workout routines to body positivity movements. Identify emerging creator patterns, viral format characteristics, audience engagement drivers, and how fitness influencers build communities around different wellness philosophies and training styles.",
    tags: ["TikTok Scout", "Persona Building", "Report"],
    category: "persona-building",
  },
  {
    id: "instagram-skincare-community",
    emoji: "✨",
    title: "Skincare Community Insights",
    description: "Understand the skincare enthusiast community on Instagram and Reddit. Explore product discovery processes, ingredient obsessions, routine complexity preferences, influencer trust factors, and how different user groups navigate the overwhelming world of serums, acids, and K-beauty trends.",
    tags: ["Instagram Scout", "Persona Building", "Report"],
    category: "persona-building",
  },
  {
    id: "twitter-ai-developers",
    emoji: "🤖",
    title: "Developer Attitudes Toward AI Tools",
    description: "Observe Twitter and GitHub discussions about AI coding assistants like Copilot, Claude, or ChatGPT. Build developer personas and bring them together in focus group discussions to compare perspectives on adoption trade-offs, productivity claims vs concerns, ethical boundaries, and how different developer communities weigh the benefits against potential risks of AI augmentation.",
    tags: ["Twitter Scout", "Persona Building", "Focus Group"],
    category: "persona-building",
  },

  // Content Generation: Podcasts & Reports
  {
    id: "mental-health-podcast",
    emoji: "🎙️",
    title: "Workplace Mental Health Topics",
    description: "Research which mental health topics matter most to working professionals—burnout, work-life boundaries, imposter syndrome, or career anxiety. Build personas representing different professional contexts and generate podcast episode ideas that resonate with their real concerns and coping strategies.",
    tags: ["Persona Building", "Podcast Generation"],
    category: "content-generation",
  },
  {
    id: "ai-tools-trend-report",
    emoji: "📊",
    title: "AI Productivity Tools Market Trends",
    description: "Research the rapidly evolving landscape of AI productivity tools—writing assistants, meeting summarizers, research helpers, and workflow automation through web research. Facilitate focus group discussions among diverse users to compare their experiences, debate adoption priorities, and collectively identify emerging needs, barriers, feature gaps, and market opportunities that different user segments value differently.",
    tags: ["Web Research", "Focus Group", "Report"],
    category: "content-generation",
  },

  // Deep Interviews
  {
    id: "ev-adoption-journey",
    emoji: "🚗",
    title: "Electric Vehicle Adoption Insights",
    description: "Understand the complex decision-making journey behind switching to electric vehicles. Explore factors like range anxiety, charging infrastructure concerns, environmental motivations, cost calculations, brand perceptions (Tesla vs traditional automakers), and the emotional shift from gas to electric driving.",
    tags: ["Deep Interview", "Report"],
    category: "deep-interview",
  },
  {
    id: "remote-work-tools",
    emoji: "💼",
    title: "Remote Collaboration Tool Preferences",
    description: "Explore what drives remote workers to adopt Slack, Teams, Notion, or other collaboration platforms. Understand team dynamics, integration needs, feature overload vs simplicity preferences, notification fatigue, and the social aspects of staying connected in distributed work environments.",
    tags: ["Deep Interview", "Report"],
    category: "deep-interview",
  },

  // Market Analysis & Competitive
  {
    id: "coffee-chains-battle",
    emoji: "☕",
    title: "Coffee Shop Brand Loyalty Research",
    description: "Bring coffee enthusiasts together in focus group discussions to debate what drives their loyalty to Starbucks, Blue Bottle, local cafés, or competitors. Observe how different customers weigh trade-offs between beverage quality and convenience, compare atmosphere preferences, discuss mobile app experiences and rewards programs, and articulate what community connection and coffee culture mean in their daily routines.",
    tags: ["Focus Group", "Competitive Analysis", "Report"],
    category: "market-analysis",
  },
  {
    id: "wearables-market-gaps",
    emoji: "⌚",
    title: "Smartwatch Market Opportunities",
    description: "Research the wearables market landscape, then conduct deep one-on-one interviews to understand individual consumers' personal experiences with smartwatches. Explore their decision-making journeys, unmet needs beyond Apple Watch and Fitbit, feature gaps in their daily lives, how they personally navigate fashion vs function trade-offs, and innovation opportunities they wish existed in the intersection of wellness technology and personal accessories.",
    tags: ["Web Research", "Deep Interview", "Report"],
    category: "market-analysis",
  },
];

// Chinese shortcuts - independent cases, can include Xiaohongshu/Douyin
export const studyShortcutsZH: StudyShortcut[] = [
  // 产品测试 & 方案对比
  {
    id: "streaming-platform-comparison-zh",
    emoji: "📺",
    title: "视频平台竞争力研究",
    description: "通过观察社交媒体上关于爱奇艺、腾讯视频、优酷、B站等视频平台的讨论，了解用户决策因素。探索内容偏好、会员价值感知、界面体验、观看习惯，以及是什么驱动用户在不同平台间切换或保持忠诚，不同年龄段和观看场景下的选择差异。",
    tags: ["社交观察", "焦点小组", "生成报告"],
    category: "product-testing",
  },
  {
    id: "fitness-app-retention-zh",
    emoji: "💪",
    title: "健身 App 留存研究",
    description: "研究是什么让用户持续使用 Keep、咕咚、薄荷健康等健身应用。探索功能使用模式、社交激励动态、游戏化效果、习惯养成触发点，以及用户从下载到长期坚持或放弃的情感历程和关键转折点。",
    tags: ["用户研究", "A/B 测试", "生成报告"],
    category: "product-testing",
  },
  {
    id: "tea-brand-positioning-zh",
    emoji: "🍵",
    title: "新茶饮品牌定位研究",
    description: "通过社交媒体观察，研究消费者对喜茶、奈雪、茶颜悦色等新茶饮品牌的态度。发现不同人群如何在品质追求、价格敏感度、品牌调性、社交属性之间权衡，识别快速变化的茶饮市场中的差异化定位机会和未被满足的需求。",
    tags: ["社交观察", "焦点小组", "生成报告"],
    category: "product-testing",
  },

  // 社媒观察 & 人设构建
  {
    id: "xiaohongshu-camping",
    emoji: "🏕️",
    title: "露营消费趋势研究",
    description: "通过观察小红书等社交平台，发现露营爱好者的消费偏好、装备选择标准、目的地决策过程。了解他们分享内容背后的生活方式态度、社交动机、审美取向，以及从城市精致露营到户外硬核探险的不同细分群体特征。",
    tags: ["小红书观察", "人设构建", "生成报告"],
    category: "persona-building",
  },
  {
    id: "douyin-beauty-trends",
    emoji: "💄",
    title: "美妆内容趋势分析",
    description: "研究抖音上什么样的美妆内容更容易获得关注和互动——从妆教分享到产品测评，从国货推荐到成分科普。识别新兴创作者模式、爆款内容特征、受众互动驱动因素，以及美妆博主如何围绕不同美学理念和护肤哲学建立社群。",
    tags: ["抖音观察", "人设构建", "生成报告"],
    category: "persona-building",
  },
  {
    id: "xiaohongshu-travel",
    emoji: "✈️",
    title: "旅游内容偏好研究",
    description: "通过观察小红书旅游内容，构建不同旅行风格的用户人设，然后组织焦点小组讨论。让小众探索者、亲子出游家长、城市漫步爱好者等不同群体对比他们的目的地发现过程、攻略信息需求差异、视觉呈现偏好冲突，讨论打卡文化的不同理解，以及在内容消费和创作上的群体共识与分歧。",
    tags: ["小红书观察", "人设构建", "焦点小组"],
    category: "persona-building",
  },

  // 内容生成：播客 & 报告
  {
    id: "workplace-anxiety-podcast",
    emoji: "🎙️",
    title: "职场心理健康话题研究",
    description: "研究职场人群最关心的心理健康议题——职业倦怠、工作边界、冒充者综合征还是职业焦虑。构建代表不同职场环境的人设，生成能引起共鸣的播客主题，探讨真实的困扰和应对策略。",
    tags: ["人设构建", "播客生成"],
    category: "content-generation",
  },
  {
    id: "new-consumer-report",
    emoji: "📊",
    title: "新消费品牌机会研究",
    description: "通过网络调研了解快速演变的新消费品牌格局——从国货美妆到精品咖啡，从功能食品到生活方式品牌。组织焦点小组，让不同消费群体讨论和对比他们的需求差异、采用障碍权衡、功能优先级冲突，通过群体辩论识别拥挤市场中被忽视的品牌机会和差异化空间。",
    tags: ["网络调研", "焦点小组", "生成报告"],
    category: "content-generation",
  },

  // 深度访谈
  {
    id: "ev-china-adoption",
    emoji: "🚗",
    title: "电动车消费决策研究",
    description: "了解消费者转向电动车背后的复杂决策历程。探索续航焦虑、充电设施顾虑、环保动机、成本计算、品牌认知（特斯拉、蔚小理、比亚迪），以及从燃油车到电动车驾驶体验的情感转变和生活方式调整。",
    tags: ["深度访谈", "生成报告"],
    category: "deep-interview",
  },
  {
    id: "gen-z-career-choice",
    emoji: "💼",
    title: "年轻人职业选择偏好",
    description: "探索新一代职场人在选择工作时的价值观和决策逻辑。了解他们如何权衡薪资、工作意义、成长空间、工作环境、企业文化，以及职业选择背后的生活方式期待、身份认同需求和对工作与生活平衡的新理解。",
    tags: ["深度访谈", "生成报告"],
    category: "deep-interview",
  },

  // 市场分析 & 竞品
  {
    id: "coffee-chains-china",
    emoji: "☕",
    title: "咖啡品牌忠诚度研究",
    description: "召集咖啡爱好者进行焦点小组讨论，辩论是什么驱动他们对星巴克、Manner、瑞幸、精品独立咖啡馆的忠诚度。观察不同顾客如何权衡咖啡品质与便利性的取舍，对比空间氛围偏好，讨论 App 体验和会员权益的差异，阐述社区连接感和咖啡文化在各自日常生活中的角色与情感意义。",
    tags: ["焦点小组", "竞品分析", "生成报告"],
    category: "market-analysis",
  },
  {
    id: "smartphone-market-gaps",
    emoji: "📱",
    title: "手机市场机会研究",
    description: "通过网络调研了解手机市场格局，然后进行一对一深度访谈，了解消费者个人使用手机的真实经历。探索他们在苹果、华为、小米、OPPO之间的选择历程，日常生活中遇到的功能空白点，个人如何权衡影像技术、设计与性能，以及在技术同质化背景下他们希望存在的产品创新方向和用户体验突破口。",
    tags: ["网络调研", "深度访谈", "生成报告"],
    category: "market-analysis",
  },
];
