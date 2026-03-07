export interface ChangelogEntry {
  version: string;
  date: string;
  items: {
    icon?: string;
    title: string;
    description?: string;
    subitems?: string[];
  }[];
}

export interface ChangelogSection {
  title: string;
  versions: ChangelogEntry[];
}

export const changelogDataZH: ChangelogSection[] = [
  {
    title: "v1.5.x: 研究面板与个人记忆",
    versions: [
      {
        version: "v1.5.0",
        date: "2026-03-01",
        items: [
          {
            icon: "star",
            title:
              '重磅功能: <a href="https://atypica.ai/panels" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">AI Panel（研究面板）</a>',
            description:
              "将多个 AI Persona 组成可复用的研究小组，在面板内直接发起群体讨论、一对一访谈等多种研究。研究产出（报告、播客等）集中管理，不再散落各处。支持反复使用同一组 Persona，让研究更高效、更连贯。",
          },
          {
            icon: "search",
            title: "全站搜索",
            description:
              "研究项目、AI Persona、访谈项目、Panel、报告和播客，全部支持快速搜索。找到过去的研究和内容变得更加方便。",
          },
          {
            icon: "paperclip",
            title: "研究中上传文件",
            description:
              "研究和访谈时可以上传 PDF、图片等参考资料。AI 会在分析过程中主动读取和引用这些文件，让研究基于你已有的资料展开。",
          },
          {
            icon: "brain",
            title:
              '个人记忆: <a href="https://atypica.ai/user/memory-builder" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">构建你的个人档案</a>',
            description:
              "新增用户级个人记忆（之前只有团队记忆）。通过一段简短对话，AI 了解你的背景、角色和关注点，之后所有研究自动参考。用得越多，AI 越懂你，不再需要每次重复说明。",
          },
          {
            icon: "brain",
            title: "团队记忆体验升级",
            description:
              "团队记忆构建流程重新设计，交互更流畅。访谈结束后自动推荐适合你团队的研究主题，帮助快速开启下一项研究。",
          },
          {
            icon: "users",
            title: "Persona 信息更丰富",
            description:
              "每个 Persona 自动生成角色标签和人口属性，新增自我介绍文本。浏览时能更快了解每个 Persona 是谁、代表什么人群。",
          },
          {
            icon: "bar-chart-3",
            title: "报告视觉升级",
            description:
              "研究报告排版全面优化，更注重可读性和视觉层次。以排版和结构为核心，让报告读起来更清晰、更专业。",
          },
          {
            icon: "palette",
            title: "列表页体验统一",
            description:
              "所有列表页（研究、Persona、访谈、Panel）统一为卡片风格并支持分页，浏览和管理更加一致顺畅。",
          },
        ],
      },
    ],
  },
  {
    title: "v1.4.x: 开放平台与智能体生态",
    versions: [
      {
        version: "v1.4.0",
        date: "2026-01-31",
        items: [
          {
            icon: "code",
            title:
              '开发者功能: <a href="https://atypica.ai/docs/mcp" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">MCP 与 Skills 集成</a>',
            description:
              '推出完整的 MCP Study API，提供 9 个核心研究工具。开发者可以通过标准 MCP 协议将 atypica 的研究能力集成到自己的应用中。新增 <code>atypica-research</code> skill，支持通过 Claude Desktop 等 MCP 客户端使用研究功能。访问 <a href="https://skill0.io" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">skill0.io</a> 下载 skills。详见 <a href="https://atypica.ai/docs/mcp" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">MCP 文档</a>了解配置和使用方法。',
          },
          {
            icon: "building",
            title: "企业功能: AWS Marketplace 集成",
            description:
              "完整集成 AWS Marketplace，企业用户可以通过 AWS 账户直接订阅。支持自动注册、登录和订阅管理，简化企业采购流程。",
          },
          {
            icon: "star",
            title:
              '研究增强: <a href="https://atypica.ai/study" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">AI 研究模板系统</a>',
            description:
              "新增数据库驱动的研究模板系统，AI 根据你的角色自动推荐研究场景。支持动态生成和自动刷新模板，帮助你快速启动研究。",
          },
          {
            icon: "brain",
            title:
              '专家进化: <a href="https://atypica.ai/sage" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Sage 导出为 Claude Skill</a>',
            description:
              "Sage AI 专家现在可以导出为 Claude Skill，让你的专属专家在更多场景中为你服务。Sage 在网站导航中正式展示，更容易被发现和使用。",
          },
          {
            icon: "lightbulb",
            title: "研究透明度: Extended Thinking (深度推理) 显示",
            description:
              "研究过程中可以看到 AI 的深度推理过程，了解 AI 是如何思考和得出结论的。让研究过程更透明，帮助你理解 AI 的决策逻辑。",
          },
          {
            icon: "brain",
            title: "记忆系统增强",
            description:
              "记忆系统支持删除和替换操作，更精确地管理你的个人信息。优化记忆触发机制：研究完成后自动更新记忆，无需手动操作。增加质量门槛，确保记忆内容的高质量和相关性。",
          },
          {
            icon: "share-2",
            title: "分享功能: Twitter/X 集成",
            description:
              "研究报告和播客可以一键分享到 Twitter/X。优化报告页面的 SEO 和微信分享兼容性，让分享更流畅。",
          },
          {
            icon: "book-open",
            title: "内容建设",
            description:
              "新增双语产品文档系统，帮助用户更好地了解产品功能。管理后台新增博客管理界面，支持内容创作和发布。About 页面增强，展示完整的产品功能和技术演进。",
          },
        ],
      },
    ],
  },
  {
    title: "v1.3.x: 智能记忆与意图理解",
    versions: [
      {
        version: "v1.3.0",
        date: "2026-01-08",
        items: [
          {
            icon: "brain",
            title:
              '重磅功能: <a href="https://atypica.ai/account/capabilities" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">用户记忆系统</a>',
            description:
              "为用户建立持久化记忆系统，AI 自动记住用户偏好、习惯和上下文信息，提供个性化服务。双层记忆架构（核心记忆 + 工作记忆），支持智能重组和压缩。新增用户能力页面，随时查看和编辑个人记忆。支持用户级和团队级记忆管理。随对话增多，AI 理解越深入，无需重复说明基本信息。",
          },
          {
            icon: "star",
            title: "重磅功能: 智能研究规划 (Plan Mode)",
            description:
              "全新研究启动体验：AI 自动理解你的需求，判断最适合的研究类型（产品测试/市场洞察/内容创作/战略规划等），并展示完整的研究计划。一键确认即可开始，无需反复沟通。新增 AI 生成的研究场景快捷方式，按你的角色（产品经理、营销人员、创业者、创作者、咨询师、博主）推荐研究方向，灵感即用。所有研究类型现在都支持参考已有研究、上传文件、MCP 工具集成等高级功能。升级到 Claude Sonnet 4.5 模型，理解更准确，响应更快。",
          },
          {
            icon: "palette",
            title: "设计与体验优化",
            description:
              '添加设计哲学文档："越不 AI 越 AI" 核心理念。优化报告和播客生成 prompts，强调研究发现而非方法论。封面生成从固定风格转向动态选择。Instagram 迁移到 v2 API。通知系统迁移到 Intercom 事件追踪。',
          },
        ],
      },
    ],
  },
  {
    title: "v1.2.x: 群体研究与讨论模式",
    versions: [
      {
        version: "v1.2.0",
        date: "2025-12-27",
        items: [
          {
            icon: "message-square",
            title: "重磅功能: discussionChat 讨论模式",
            description:
              "新增 discussionChat 作为 interviewChat 的替代方案，支持群体讨论场景。discussionChat 适用于观点碰撞、方案测试（3-8 人），interviewChat 适用于深度个人洞察（5-10 人）。AI 在 plan 阶段根据研究目标自动选择最合适的研究方法。完成 studyLog 架构迁移，从数据库字段迁移到消息驱动架构，所有研究内容通过消息流转，统一灵活。",
          },
        ],
      },
    ],
  },
  {
    title: "v1.1.x: AI 研究平台化与开发者工具",
    versions: [
      {
        version: "v1.1.3",
        date: "2025-12-11",
        items: [
          {
            icon: "rocket",
            title: "重磅功能: Fast Insight (快速洞察)",
            description:
              "全新的快速研究模式，专注于快速生成高质量播客内容。五阶段自动化工作流：主题理解 → 播客规划 → 深度研究 → 播客生成 → 完成。使用 Claude 3.7 Sonnet 和 Gemini 2.5 Pro 双模型协作。智能规划播客内容策略和搜索策略，自动生成观点导向的播客脚本和音频。",
          },
          {
            icon: "play",
            title: "体验优化: Replay 功能增强",
            description:
              "新增电影式开场动画效果，添加进度条显示研究进度。支持快速跳转到报告功能，优化视觉层次和控制台显示。",
          },
          {
            icon: "zap",
            title: "技术优化",
            description:
              "数据库性能优化（外键索引、N+1 查询修复、Token 死锁修复）。系统增强（访谈项目导入导出、移动端菜单、安全更新等）。代码重构和清理，提升系统稳定性和可维护性。",
          },
        ],
      },
      {
        version: "v1.1.2",
        date: "2025-12-05",
        items: [
          {
            icon: "microscope",
            title: "核心功能: Deep Research MCP 服务",
            description:
              "实现深度研究功能的 MCP (Model Context Protocol) 服务化。支持多种研究专家：Grok Expert、Trend Explorer 等。集成 Perplexity Sonar Pro 进行高质量网络搜索。提供标准 MCP API 接口，支持第三方集成和流式输出。",
          },
          {
            icon: "key",
            title:
              '开发者功能: <a href="https://atypica.ai/account" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">API Key 管理</a>',
            description:
              "用户可创建和管理个人 API Keys。团队支持多成员 API Key 管理，支持 API Key 权限验证和所有权控制。Deep Research MCP 端点支持 API Key 认证。",
          },
          {
            icon: "image",
            title: "内容增强: AI 生成封面图片",
            description:
              "报告和播客支持 AI 自动生成封面图片（集成 Gemini 2.5 Flash Image 模型）。支持自定义宽高比和布局控制，播客 RSS 支持平台特定的封面比例。",
          },
        ],
      },
      {
        version: "v1.1.1",
        date: "2025-12-03",
        items: [
          {
            icon: "star",
            title:
              '正式上线: <a href="https://atypica.ai/newstudy" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">产品研发流程 (Product R&D)</a>',
            description:
              '全新的"产品研发"研究模板，专注于市场趋势、用户需求和创意生成。针对产品创新场景优化的研究工作流和报告结构。帮助团队快速验证产品想法和市场机会。',
          },
        ],
      },
      {
        version: "v1.1.0",
        date: "2025-11-21",
        items: [
          {
            icon: "gem",
            title:
              '全新套餐: <a href="https://atypica.ai/pricing#unlimited" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Unlimited 无限套餐</a>',
            description:
              "推出 Super（个人）和 SuperTeam（团队）无限 token 套餐。无限 token 使用，满足高强度研究需求。支持灵活的团队成员管理和订阅管理。",
          },
          {
            icon: "building",
            title: "企业版功能升级",
            description:
              '全面升级 <a href="https://atypica.ai/pricing#organization" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Pricing 页面</a>，增加企业版功能展示。企业专属功能：定制化研发、专属客户成功团队、API 访问等。优化企业客户引导流程，增强信息收集。',
          },
          {
            icon: "shield",
            title: "SOC 2 认证",
            description:
              "平台通过 SOC 2 安全合规认证。在官网、定价页和企业页展示认证标识。提升企业级安全和合规保障。",
          },
          {
            icon: "megaphone",
            title: "推出 Affiliate Program (联盟推广计划)",
            description:
              '正式上线 <a href="https://friends.atypica.ai" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">friends.atypica.ai</a> 联盟推广平台。集成 Tolt 推广追踪系统，支持推广链接和佣金管理。用户注册和付费自动追踪推广来源。',
          },
        ],
      },
    ],
  },
  {
    title: "v1.0.x: 多模态研究与内容生成",
    versions: [
      {
        version: "v1.0.2",
        date: "2025-11-01",
        items: [
          {
            icon: "brain",
            title:
              '重磅功能: <a href="https://atypica.ai/sage" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">专家智能体 (Sage)</a>',
            description:
              "推出可进化的 AI 专家智能体系统。双层记忆架构（核心记忆 + 工作记忆），支持长期知识积累。智能识别知识空白，自动发起补充访谈。通过持续学习和知识补充，构建不断进化的领域专家。支持版本控制和知识源管理，确保专家知识的可追溯性。",
          },
        ],
      },
      {
        version: "v1.0.1",
        date: "2025-10-25",
        items: [
          {
            icon: "headphones",
            title:
              '正式上线: <a href="https://atypica.ai/insight-radio" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">研究播客自动生成</a>',
            description:
              '研究报告可一键转换为播客音频，支持在线收听和下载。支持多种播客风格：深度解析、观点讨论、辩论式对话。智能生成播客脚本，自动配置主持人对话。播客生成完成后邮件通知。<a href="https://atypica.ai/pricing" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Pro、Max 和 Team 套餐</a>用户可使用完整功能。',
          },
        ],
      },
      {
        version: "v1.0.0",
        date: "2025-10-15",
        items: [
          {
            icon: "mic",
            title:
              '重要升级: <a href="https://atypica.ai/interview" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">访谈系统</a>增强',
            description:
              "新增多选题支持，丰富访谈问题形式。访谈报告可生成、分享和下载 PDF。支持邀请链接分享访谈项目，可设置链接过期时间。访谈可设置受访者称呼偏好。支持多语言访谈（中英文）。访谈聊天支持附件上传。",
          },
          {
            icon: "users",
            title:
              '功能增强: <a href="https://atypica.ai/persona" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Persona 系统</a>',
            description:
              "Persona 可通过分享链接公开访问。Persona 聊天支持上传文件作为对话上下文。搜索和筛选功能增强，支持标签和预览。",
          },
          {
            icon: "sparkles",
            title: "体验优化: 研究工作流",
            description:
              "新增 AI 智能推荐研究下一步建议。可基于已有研究继续深入探索（参考上下文）。研究报告和播客统一管理，便于查找和分享。",
          },
          {
            icon: "rocket",
            title: "性能与稳定性",
            description:
              "AI 引擎升级，提升响应速度和稳定性。增强多模型支持，优化成本和性能平衡。系统架构优化，提升整体用户体验。",
          },
        ],
      },
    ],
  },
  {
    title: "v0.9.x: 引导式研究策略与透明度",
    versions: [
      {
        version: "v0.9.0",
        date: "2025-09-15",
        items: [
          {
            icon: "map",
            title: "AI 研究启动前的引导规划",
            description:
              "过去 AI 研究会直接进入访谈和搜索。现在每个研究都会先展示执行计划，说明会访谈谁、查哪些资料，以及每一步的目的。",
          },
          {
            icon: "brain",
            title: "AI 研究策略模板",
            description:
              "规划阶段会自动匹配最适合的商业分析框架（如 JTBD、STP、GE 矩阵等），帮助团队提前理解后续访谈与桌面研究的策略视角。",
          },
          {
            icon: "clipboard",
            title: "报告前的研究过程汇总",
            description:
              "在生成最终报告前，AI 会整理一份研究日志，记录收集到的信息与关键判断，让团队在看到结论的同时理解过程。",
          },
        ],
      },
    ],
  },
  {
    title: "v0.8.x: AI 访谈与 AI 人设全面上线",
    versions: [
      {
        version: "v0.8.0",
        date: "2025-09-04",
        items: [
          {
            icon: "rocket",
            title:
              '正式上线: <a href="https://atypica.ai/interview" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">访谈项目</a> & <a href="https://atypica.ai/persona" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">AI 人设导入</a>',
            description: "两大功能现已面向所有套餐用户开放（移除预览/测试状态）",
            subitems: [
              '<a href="https://atypica.ai/pricing" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Free/Pro 套餐</a>：可使用基础功能',
              '<a href="https://atypica.ai/pricing" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Max/Team 套餐</a>：可使用全部功能',
            ],
          },
          {
            icon: "sparkles",
            title: "重要功能: AI 访谈问题智能优化",
            subitems: [
              "AI 自动分析你的访谈项目简介，智能优化访谈问题以提升研究效果",
              "将复杂问题转化为清晰易答的细分问题，遵循研究最佳实践",
              "采用事实优先方法，生成细致问题深度挖掘洞察和真实回答",
              "无缝支持真人访谈和 AI 人设访谈两种模式",
            ],
          },
          {
            icon: "palette",
            title: "体验优化",
            subitems: ["语音输入速度和响应性优化", "重设计人设导入流程，状态显示更清晰"],
          },
        ],
      },
    ],
  },
  {
    title: "v0.7.x: 企业级协作与数据洞察",
    versions: [
      {
        version: "v0.7.1",
        date: "2025-08-08",
        items: [
          {
            icon: "sparkles",
            title:
              '新功能: <a href="https://atypica.ai/team" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">团队管理</a>',
            description:
              "新增团队协作空间，支持成员邀请、移除和角色管理。实现用户身份切换，方便在个人与团队空间中无缝工作。为团队版增加专属路由和导航菜单。",
          },
        ],
      },
      {
        version: "v0.7.0",
        date: "2025-08-01",
        items: [
          {
            icon: "sparkles",
            title:
              '核心功能: 构建私有 <a href="https://atypica.ai/persona" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">AI 人设 (AI Persona Import)</a> [Beta]',
            description:
              '上线核心功能 <code>AI 人设导入</code>，开启 <strong><a href="https://atypica.ai/pricing" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Max 套餐</a>用户公测</strong>。 用户可上传自己的访谈记录 (<code>PDF</code>, <code>JSON</code>, <code>CSV</code>)，构建出完全私有的 <code>真人 AI 人设 (私有)</code>。 AI 会对上传内容进行多维度分析与打分，生成可交互的 <code>AI 人设</code>，并以雷达图等可视化形式呈现分析结果。',
          },
        ],
      },
    ],
  },
  {
    title: "v0.6.x: 全球化与智能增强",
    versions: [
      {
        version: "v0.6.2",
        date: "2025-07-28",
        items: [
          {
            icon: "rocket",
            title: "体验: 语音识别升级",
            description:
              "集成 <code>Groq Whisper</code> API，实现近乎实时的流式语音转录，显著提升访谈流畅度 (2025-07-04)。",
          },
          {
            icon: "sprout",
            title: "功能开发: 新版访谈项目",
            description:
              "完成新版 <code>Interview Project</code> 的核心开发，并转入内部 Alpha 测试阶段。新流程旨在简化访谈创建和分享过程 (2025-07-24)。",
          },
          {
            icon: "wrench",
            title: "优化: 文件管理",
            description:
              "新增附件数据表，统一管理用户上传的文件，实现相同文件复用，优化存储效率 (2025-07-20)。",
          },
        ],
      },
      {
        version: "v0.6.1",
        date: "2025-06-30",
        items: [
          {
            icon: "rocket",
            title: "里程碑: Atypica 全球发布",
            description:
              "完成核心数据库从中国区到美国区的迁移，为全球化服务奠定基础 (2025-06-29)。上线全新的 <code>new-study-interview</code> 功能，通过 AI 对话明确用户研究意图。发布第一条全球推广推文，标志产品正式走向国际市场。",
          },
          {
            icon: "sprout",
            title:
              '功能开发: <a href="https://atypica.ai/newstudy" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">产品研发流程</a>',
            description:
              "完成 <code>Product R&D</code> 研究流程的核心开发，并转入内部 Alpha 测试阶段 (2025-06-27)。",
          },
          {
            icon: "palette",
            title: "界面与体验: 全新官网 (V3)",
            description:
              "发布全新设计的官网 (atypica.ai)，优化产品信息架构与视觉体验，并使用 AI 生成全部配图 (2025-06-27)。",
          },
        ],
      },
      {
        version: "v0.6.0",
        date: "2025-06-15",
        items: [
          {
            icon: "credit-card",
            title: "商业化: 定价与套餐升级",
            description:
              '上线 <a href="https://atypica.ai/pricing" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline"><code>MAX</code> 订阅套餐</a>，提供更多 Tokens 和高级功能 (2025-06-12)。 支持套餐升降级，并根据剩余 Tokens 比例自动折抵费用 (2025-06-26)。 全面转向美元定价，并集成 Stripe 的支付宝自动扣款功能，简化支付流程 (2025-06-19)。',
          },
          {
            icon: "sparkles",
            title: "新功能: 研究能力增强",
            description:
              '集成 <code>Tavily</code> 实现实时互联网搜索，在研究早期阶段提供更丰富的背景信息。 新增 <code>Twitter</code> 数据源，用于构建更全球化的用户画像。 引入"真人 Persona"概念，支持在研究中高亮显示基于真实访谈的画像。',
          },
          {
            icon: "wrench",
            title: "优化: 研究流程分类",
            description:
              "实现研究问题自动分类 (<code>Testing</code>, <code>Planning</code>, <code>Insights</code>, <code>Creation</code>)，匹配不同的研究流程和报告结构 (2025-06-09)。",
          },
        ],
      },
    ],
  },
  {
    title: "v0.5.x: 智能报告与体验飞跃",
    versions: [
      {
        version: "v0.5.1",
        date: "2025-05-31",
        items: [
          {
            icon: "sparkles",
            title: "新功能: 报告内图像生成",
            description:
              "集成 <code>Google Imagen 4.0</code> 与 <code>Midjourney</code> 模型，支持在研究报告中根据上下文动态生成高质量图像 (2025-05-25)。",
          },
          {
            icon: "zap",
            title: "性能: Prompt 缓存",
            description:
              "为 <code>Bedrock Claude</code> 启用 Prompt 缓存，对历史消息进行哈希计算，将重复请求的 Token 消耗降低 90% (2025-05-29)。",
          },
          {
            icon: "wrench",
            title: "优化: 语音输入",
            description:
              "优化语音识别功能，使用 <code>Groq Whisper</code> 模型，实现语音输入的即时转文本，大幅提升交互速度。 修复了因 Vercel AI SDK 导致 <code>prompt cache</code> 失效的问题。",
          },
        ],
      },
      {
        version: "v0.5.0",
        date: "2025-05-20",
        items: [
          {
            icon: "sparkles",
            title: "新功能: 研究附件",
            description:
              "用户可在发起研究时上传文档 (<code>PDF</code> 等) 作为上下文，AI 会在后续的访谈和报告生成中参考这些信息 (2025-05-18)。",
          },
          {
            icon: "sparkles",
            title: "新功能: Persona 向量搜索",
            description:
              "数据库集成 <code>pgvector</code> 扩展，为 Persona 增加 <code>Embedding</code> 向量，实现基于语义的模糊搜索 (2025-05-13)。",
          },
          {
            icon: "sparkles",
            title: "新功能: 报告下载 (PDF)",
            description:
              "部署独立的 <code>html-to-pdf</code> 服务，支持将研究报告一键下载为高质量的 PDF 文件 (2025-05-12)。",
          },
          {
            icon: "wrench",
            title: "优化: Agent 交互",
            description:
              "<code>Study Agent</code> 现在可以向 <code>Interview Agent</code> 传递更具体的指令和上下文，访谈反馈也更丰富，显著降低了整体 Token 消耗。",
          },
        ],
      },
    ],
  },
  {
    title: "v0.4.x: 平台架构升级",
    versions: [
      {
        version: "v0.4.1",
        date: "2025-04-30",
        items: [
          {
            icon: "wrench",
            title: "平台架构: 数据库迁移",
            description:
              "后端数据库由 <code>MySQL</code> 成功迁移至 <code>PostgreSQL</code>，为后续的向量搜索和复杂查询打下基础 (2025-04-29)。 通过增加索引解决了迁移初期 <code>nerd stats</code> 查询导致的性能问题。",
          },
          {
            icon: "wrench",
            title: "优化: 模型与成本",
            description:
              "引入 <code>gpt-4o</code> 模型并支持并行工具调用，有效降低了研究成本 (2025-04-16)。 引入 <code>Google Gemini 1.5 Flash</code> 模型，进一步降低特定任务成本 (2025-04-21)。 增加严格的 Tokens 和步骤数限制，避免研究任务意外超时或超支 (2025-04-28)。",
          },
        ],
      },
      {
        version: "v0.4.0",
        date: "2025-04-20",
        items: [
          {
            icon: "credit-card",
            title: "商业化: Tokens 计费模式上线",
            description:
              '计费模式从简单的"点数"切换为更精细的 <code>Tokens</code> 计费。 正式推出 <a href="https://atypica.ai/pricing" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline"><code>Pro</code> 订阅套餐</a>与新的 <a href="https://atypica.ai/pricing" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline"><code>Pricing</code> 定价页面</a> (2025-04-20)。 集成 <code>Stripe</code>，支持全球用户信用卡支付 (2025-04-09)。',
          },
          {
            icon: "wrench",
            title: "平台架构: 数据库核心重构",
            description:
              "将聊天消息 <code>ChatMessage</code> 从主表拆分到独立的表中，解决并发写入时的数据覆盖问题，提升了系统的稳定性和扩展性 (2025-04-12)。",
          },
          {
            icon: "sparkles",
            title: "新功能: 多平台数据接入",
            description:
              "接入 <code>TikTok</code> 和 <code>Instagram</code> 数据源，拓展了消费者洞察的渠道 (2025-04-17)。",
          },
        ],
      },
    ],
  },
  {
    title: "v0.3.x: 对话式研究助手",
    versions: [
      {
        version: "v0.3.1",
        date: "2025-04-03",
        items: [
          {
            icon: "credit-card",
            title: "商业化: 支付功能 MVP",
            description:
              '引入用户积分系统，并上线第一版支付功能（通过嘿店接口购买"咖啡"）。 引入 <code>Hello Agent</code>，通过对话进行企业用户留资。',
          },
          {
            icon: "sparkles",
            title: "新功能: 邀请码",
            description: "新增邀请码功能，允许早期用户邀请他人注册 (2025-03-31)。",
          },
        ],
      },
      {
        version: "v0.3.0",
        date: "2025-03-27",
        items: [
          {
            icon: "sparkles",
            title: "核心重构: 统一对话界面",
            description:
              '将分步式流程重构为统一的"研究型对话"界面，用户只需在输入框提问即可启动完整研究。引入 <code>Study Agent</code> 作为"指挥官"，负责规划任务、调度专业 Agents 并向用户汇报。',
          },
          {
            icon: "palette",
            title: "界面与体验: 全新交互范式",
            description:
              "采用左侧对话、右侧控制台 (<code>atypica llm console</code>) 的分屏设计，实时展示 AI 的思考和执行过程，提升信息透明度 (2025-03-19)。实现研究过程回放（Replay）功能，可生成分享链接 (2025-03-22)。 新增研究统计 (<code>Nerd Stats</code>)，追踪 <code>tokens</code> 和 <code>steps</code> 消耗 (2025-03-26)。 新增 <code>light/dark</code> 主题切换 (2025-03-25)。 基于 <code>git log</code> 自动生成第一版 <code>changelog</code> 页面。",
          },
        ],
      },
    ],
  },
  {
    title: "v0.2.x: 分步式研究流程",
    versions: [
      {
        version: "v0.2.0",
        date: "2025-03-15",
        items: [
          {
            icon: "sparkles",
            title: "核心重构: 引导式流程",
            description:
              "推出 <code>scout → personas → analyst → interview → report</code> 的多页面分步研究流程，规范了市场研究的基本框架。",
          },
          {
            icon: "sparkles",
            title: "新功能",
            subitems: [
              "<code>Analyst</code>: 创建和管理研究主题，并将其存储于数据库。",
              "<code>Interview</code>: 实现 AI 与 Persona 的自动访谈，模拟用户调研。",
              "<code>Report</code>: 自动生成 HTML 格式的研究报告，并支持网页分享。",
            ],
          },
          {
            icon: "wrench",
            title: "平台架构",
            description:
              "引入用户认证与权限管理，实现注册登录和研究历史的私有化 (2025-03-16)。项目首次部署至 <code>AWS</code> 集群，域名 <code>atypica.musedam.cc</code> 上线，并配置 <code>GitHub CI</code> 实现持续集成。",
          },
        ],
      },
    ],
  },
  {
    title: "v0.1.x: 用户发掘工具",
    versions: [
      {
        version: "v0.1.0",
        date: "2025-03-12",
        items: [
          {
            icon: "rocket",
            title: "项目启动: ArchitypeAI -> Atypica",
            description:
              "提出产品概念：利用社交网络数据构建可交互的用户画像 (Persona)，以测试产品创新方案 (2025-03-05)。",
          },
          {
            icon: "sparkles",
            title: "核心功能: AI 用户画像生成",
            description:
              '实现首个端到端流程：根据输入主题，从"小红书"数据中自动总结和归纳用户画像。<code>SavePersona</code> 工具首次成功将 AI 生成的画像存入数据库。',
          },
          {
            icon: "wrench",
            title: "技术栈",
            subitems: [
              "<code>Next.js</code> + <code>Vercel AI SDK</code> + <code>LLM Tools</code> 作为核心框架。",
              "<code>Claude 3.7 Sonnet</code> 作为核心推理模型。",
              "通过 <code>experimental</code> 方法改写 prompt，显著降低早期 Token 消耗 (2025-03-08)。",
            ],
          },
        ],
      },
    ],
  },
];

export const changelogFooterZH = "日志始于 2025年3月5日，项目启动。";
