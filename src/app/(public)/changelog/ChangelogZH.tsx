import React from "react";

export const ChangelogZH: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 font-sans">
      <header className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">atypica.AI 更新日志</h1>
      </header>

      <div className="space-y-16">
        {/* v11.x */}
        <section>
          <h2 className="text-2xl font-bold mb-8">v11.x: AI 研究平台化与开发者工具</h2>
          <div className="space-y-10">
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v11.3.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-12-11</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-4 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🚀 重磅功能: Fast Insight (快速洞察)
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    全新的快速研究模式，专注于快速生成高质量播客内容。五阶段自动化工作流：主题理解
                    → 播客规划 → 深度研究 → 播客生成 →
                    完成。使用 Claude 3.7 Sonnet 和 Gemini 2.5 Pro
                    双模型协作。智能规划播客内容策略和搜索策略，自动生成观点导向的播客脚本和音频。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    📽️ 体验优化: Replay 功能增强
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    新增电影式开场动画效果，添加进度条显示研究进度。支持快速跳转到报告功能，优化视觉层次和控制台显示。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ⚡ 技术优化
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    数据库性能优化（外键索引、N+1 查询修复、Token 死锁修复）。系统增强（访谈项目导入导出、移动端菜单、安全更新等）。代码重构和清理，提升系统稳定性和可维护性。
                  </p>
                </li>
              </ul>
            </article>
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v11.2.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-12-05</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-4 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔬 核心功能: Deep Research MCP 服务
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    实现深度研究功能的 MCP (Model Context Protocol)
                    服务化。支持多种研究专家：Grok Expert、Trend Explorer
                    等。集成 Perplexity Sonar Pro 进行高质量网络搜索。提供标准 MCP API 接口，支持第三方集成和流式输出。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔑 开发者功能: API Key 管理
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    用户可创建和管理个人 API Keys。团队支持多成员 API Key 管理，支持 API Key 权限验证和所有权控制。Deep
                    Research MCP 端点支持 API Key 认证。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🎨 内容增强: AI 生成封面图片
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    报告和播客支持 AI 自动生成封面图片（集成 Gemini 2.5 Flash Image
                    模型）。支持自定义宽高比和布局控制，播客 RSS 支持平台特定的封面比例。
                  </p>
                </li>
              </ul>
            </article>
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v11.1.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-12-03</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-4 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🎯 正式上线: 产品研发流程 (Product R&D)
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    全新的"产品研发"研究模板，专注于市场趋势、用户需求和创意生成。针对产品创新场景优化的研究工作流和报告结构。帮助团队快速验证产品想法和市场机会。
                  </p>
                </li>
              </ul>
            </article>
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v11.0.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-11-21</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-4 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    💎 全新套餐: Unlimited 无限套餐
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    推出 Super（个人）和 SuperTeam（团队）无限 token
                    套餐。无限 token 使用，满足高强度研究需求。支持灵活的团队成员管理和订阅管理。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🏢 企业版功能升级
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    全面升级 Pricing
                    页面，增加企业版功能展示。企业专属功能：定制化研发、专属客户成功团队、API
                    访问等。优化企业客户引导流程，增强信息收集。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔒 SOC 2 认证
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    平台通过 SOC 2
                    安全合规认证。在官网、定价页和企业页展示认证标识。提升企业级安全和合规保障。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🤝 推出 Affiliate Program (联盟推广计划)
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    正式上线 friends.atypica.ai
                    联盟推广平台。集成 Tolt 推广追踪系统，支持推广链接和佣金管理。用户注册和付费自动追踪推广来源。
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* v10.x */}
        <section>
          <h2 className="text-2xl font-bold mb-8">v10.x: 多模态研究与内容生成</h2>
          <div className="space-y-10">
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v10.1.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-10-25</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-4 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🎧 正式上线: 研究播客自动生成
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    研究报告可一键转换为播客音频，支持在线收听和下载。支持多种播客风格：深度解析、观点讨论、辩论式对话。智能生成播客脚本，自动配置主持人对话。播客生成完成后邮件通知。Pro、Max
                    和 Team 套餐用户可使用完整功能。
                  </p>
                </li>
              </ul>
            </article>
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v10.0.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-10-15</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-4 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🎤 重要升级: 访谈系统增强
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    新增多选题支持，丰富访谈问题形式。访谈报告可生成、分享和下载
                    PDF。支持邀请链接分享访谈项目，可设置链接过期时间。访谈可设置受访者称呼偏好。支持多语言访谈（中英文）。访谈聊天支持附件上传。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🧑‍💼 功能增强: Persona 系统
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Persona 可通过分享链接公开访问。Persona
                    聊天支持上传文件作为对话上下文。搜索和筛选功能增强，支持标签和预览。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ 体验优化: 研究工作流
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    新增 AI
                    智能推荐研究下一步建议。可基于已有研究继续深入探索（参考上下文）。研究报告和播客统一管理，便于查找和分享。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🚀 性能与稳定性
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    AI
                    引擎升级，提升响应速度和稳定性。增强多模型支持，优化成本和性能平衡。系统架构优化，提升整体用户体验。
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* v9.x */}
        <section>
          <h2 className="text-2xl font-bold mb-8">v9.x: 引导式研究策略与透明度</h2>
          <div className="space-y-10">
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v9.0.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-09-15</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-4 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🗺️ AI 研究启动前的引导规划
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    过去 AI
                    研究会直接进入访谈和搜索。现在每个研究都会先展示执行计划，说明会访谈谁、查哪些资料，以及每一步的目的。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🧠 AI 研究策略模板
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    规划阶段会自动匹配最适合的商业分析框架（如 JTBD、STP、GE
                    矩阵等），帮助团队提前理解后续访谈与桌面研究的策略视角。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    📝 报告前的研究过程汇总
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    在生成最终报告前，AI
                    会整理一份研究日志，记录收集到的信息与关键判断，让团队在看到结论的同时理解过程。
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* v8.x */}
        <section>
          <h2 className="text-2xl font-bold mb-8">v8.x: AI 访谈与 AI 人设全面上线</h2>
          <div className="space-y-10">
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v8.0.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-09-04</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-4 text-gray-800 dark:text-gray-200">
                <li>
                  <h4 className="font-semibold text-lg">🚀 正式上线: 访谈项目 & AI 人设导入</h4>
                  <p className="text-gray-700 dark:text-gray-300 mt-1 pl-1">
                    两大功能现已面向所有套餐用户开放（移除预览/测试状态）
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mt-1 pl-1">
                    Free/Pro 套餐：可使用基础功能
                    <br />
                    Max/Team 套餐：可使用全部功能
                  </p>
                </li>
                <li>
                  <h4 className="font-semibold text-lg">✨ 重要功能: AI 访谈问题智能优化</h4>
                  <p className="text-gray-700 dark:text-gray-300 mt-1 pl-1">
                    AI 自动分析你的访谈项目简介，智能优化访谈问题以提升研究效果
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mt-1 pl-1">
                    将复杂问题转化为清晰易答的细分问题，遵循研究最佳实践
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mt-1 pl-1">
                    采用事实优先方法，生成细致问题深度挖掘洞察和真实回答
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mt-1 pl-1">
                    无缝支持真人访谈和 AI 人设访谈两种模式
                  </p>
                </li>
                <li>
                  <h4 className="font-semibold text-lg">🎨 体验优化</h4>
                  <p className="text-gray-700 dark:text-gray-300 mt-1 pl-1">
                    语音输入速度和响应性优化
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mt-1 pl-1">
                    重设计人设导入流程，状态显示更清晰
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* v7.x */}
        <section>
          <h2 className="text-2xl font-bold mb-8">v7.x: 企业级协作与数据洞察</h2>
          <div className="space-y-10">
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v7.1.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-08-08</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ 新功能: 团队管理
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    新增团队协作空间，支持成员邀请、移除和角色管理。
                    实现用户身份切换，方便在个人与团队空间中无缝工作。
                    为团队版增加专属路由和导航菜单。
                  </p>
                </li>
              </ul>
            </article>
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v7.0.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-08-01</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ 核心功能: 构建私有 AI 人设 (AI Persona Import) [Beta]
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    上线核心功能 <code>AI 人设导入</code>，开启 <strong>Max 套餐用户公测</strong>。
                    用户可上传自己的访谈记录 (<code>PDF</code>, <code>JSON</code>, <code>CSV</code>
                    )，构建出完全私有的 <code>真人 AI 人设 (私有)</code>。 AI
                    会对上传内容进行多维度分析与打分，生成可交互的 <code>AI 人设</code>
                    ，并以雷达图等可视化形式呈现分析结果。
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* v6.x */}
        <section>
          <h2 className="text-2xl font-bold mb-8">v6.x: 全球化与智能增强</h2>
          <div className="space-y-10">
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v6.2.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-07-28</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🚀 体验: 语音识别升级
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    集成 <code>Groq Whisper</code>{" "}
                    API，实现近乎实时的流式语音转录，显著提升访谈流畅度 (2025-07-04)。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🌱 功能开发: 新版访谈项目
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    完成新版 <code>Interview Project</code> 的核心开发，并转入内部 Alpha
                    测试阶段。新流程旨在简化访谈创建和分享过程 (2025-07-24)。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔧 优化: 文件管理
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    新增附件数据表，统一管理用户上传的文件，实现相同文件复用，优化存储效率
                    (2025-07-20)。
                  </p>
                </li>
              </ul>
            </article>
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v6.1.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-06-30</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🚀 里程碑: Atypica 全球发布
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    完成核心数据库从中国区到美国区的迁移，为全球化服务奠定基础 (2025-06-29)。
                    上线全新的 <code>new-study-interview</code> 功能，通过 AI 对话明确用户研究意图。
                    发布第一条全球推广推文，标志产品正式走向国际市场。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🌱 功能开发: 产品研发流程
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    完成 <code>Product R&D</code> 研究流程的核心开发，并转入内部 Alpha 测试阶段
                    (2025-06-27)。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🎨 界面与体验: 全新官网 (V3)
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    发布全新设计的官网 (atypica.ai)，优化产品信息架构与视觉体验，并使用 AI
                    生成全部配图 (2025-06-27)。
                  </p>
                </li>
              </ul>
            </article>
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v6.0.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-06-15</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    💰 商业化: 定价与套餐升级
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    上线 <code>MAX</code> 订阅套餐，提供更多 Tokens 和高级功能 (2025-06-12)。
                    支持套餐升降级，并根据剩余 Tokens 比例自动折抵费用 (2025-06-26)。
                    全面转向美元定价，并集成 Stripe 的支付宝自动扣款功能，简化支付流程
                    (2025-06-19)。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ 新功能: 研究能力增强
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    集成 <code>Tavily</code>{" "}
                    实现实时互联网搜索，在研究早期阶段提供更丰富的背景信息。 新增{" "}
                    <code>Twitter</code> 数据源，用于构建更全球化的用户画像。 引入“真人
                    Persona”概念，支持在研究中高亮显示基于真实访谈的画像。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔧 优化: 研究流程分类
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    实现研究问题自动分类 (<code>Testing</code>, <code>Planning</code>,{" "}
                    <code>Insights</code>, <code>Creation</code>
                    )，匹配不同的研究流程和报告结构 (2025-06-09)。
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* v5.x */}
        <section>
          <h2 className="text-2xl font-bold mb-8">v5.x: 智能报告与体验飞跃</h2>
          <div className="space-y-10">
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v5.1.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-05-31</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ 新功能: 报告内图像生成
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    集成 <code>Google Imagen 4.0</code> 与 <code>Midjourney</code>{" "}
                    模型，支持在研究报告中根据上下文动态生成高质量图像 (2025-05-25)。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🚀 性能: Prompt 缓存
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    为 <code>Bedrock Claude</code> 启用 Prompt
                    缓存，对历史消息进行哈希计算，将重复请求的 Token 消耗降低 90% (2025-05-29)。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔧 优化: 语音输入
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    优化语音识别功能，使用 <code>Groq Whisper</code>{" "}
                    模型，实现语音输入的即时转文本，大幅提升交互速度。 修复了因 Vercel AI SDK 导致{" "}
                    <code>prompt cache</code> 失效的问题。
                  </p>
                </li>
              </ul>
            </article>
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v5.0.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-05-20</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ 新功能: 研究附件
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    用户可在发起研究时上传文档 (<code>PDF</code>
                    等) 作为上下文，AI 会在后续的访谈和报告生成中参考这些信息 (2025-05-18)。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ 新功能: Persona 向量搜索
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    数据库集成 <code>pgvector</code> 扩展，为 Persona 增加 <code>Embedding</code>{" "}
                    向量，实现基于语义的模糊搜索 (2025-05-13)。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ 新功能: 报告下载 (PDF)
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    部署独立的 <code>html-to-pdf</code> 服务，支持将研究报告一键下载为高质量的 PDF
                    文件 (2025-05-12)。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔧 优化: Agent 交互
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    <code>Study Agent</code> 现在可以向 <code>Interview Agent</code>{" "}
                    传递更具体的指令和上下文，访谈反馈也更丰富，显著降低了整体 Token 消耗。
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* v4.x */}
        <section>
          <h2 className="text-2xl font-bold mb-8">v4.x: 平台架构升级</h2>
          <div className="space-y-10">
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v4.1.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-04-30</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔧 平台架构: 数据库迁移
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    后端数据库由 <code>MySQL</code> 成功迁移至 <code>PostgreSQL</code>
                    ，为后续的向量搜索和复杂查询打下基础 (2025-04-29)。 通过增加索引解决了迁移初期{" "}
                    <code>nerd stats</code> 查询导致的性能问题。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔧 优化: 模型与成本
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    引入 <code>gpt-4o</code> 模型并支持并行工具调用，有效降低了研究成本
                    (2025-04-16)。 引入 <code>Google Gemini 1.5 Flash</code>{" "}
                    模型，进一步降低特定任务成本 (2025-04-21)。 增加严格的 Tokens
                    和步骤数限制，避免研究任务意外超时或超支 (2025-04-28)。
                  </p>
                </li>
              </ul>
            </article>
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v4.0.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-04-20</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    💰 商业化: Tokens 计费模式上线
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    计费模式从简单的“点数”切换为更精细的 <code>Tokens</code> 计费。 正式推出{" "}
                    <code>Pro</code> 订阅套餐与新的 <code>Pricing</code> 定价页面 (2025-04-20)。
                    集成 <code>Stripe</code>，支持全球用户信用卡支付 (2025-04-09)。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔧 平台架构: 数据库核心重构
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    将聊天消息 <code>ChatMessage</code>{" "}
                    从主表拆分到独立的表中，解决并发写入时的数据覆盖问题，提升了系统的稳定性和扩展性
                    (2025-04-12)。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ 新功能: 多平台数据接入
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    接入 <code>TikTok</code> 和 <code>Instagram</code>{" "}
                    数据源，拓展了消费者洞察的渠道 (2025-04-17)。
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* v3.x */}
        <section>
          <h2 className="text-2xl font-bold mb-8">v3.x: 对话式研究助手</h2>
          <div className="space-y-10">
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v3.1.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-04-03</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    💰 商业化: 支付功能 MVP
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    引入用户积分系统，并上线第一版支付功能（通过嘿店接口购买“咖啡”）。 引入{" "}
                    <code>Hello Agent</code>，通过对话进行企业用户留资。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ 新功能: 邀请码
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    新增邀请码功能，允许早期用户邀请他人注册 (2025-03-31)。
                  </p>
                </li>
              </ul>
            </article>
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v3.0.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-03-27</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ 核心重构: 统一对话界面
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    将分步式流程重构为统一的“研究型对话”界面，用户只需在输入框提问即可启动完整研究。
                    引入 <code>Study Agent</code> 作为“指挥官”，负责规划任务、调度专业 Agents
                    并向用户汇报。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🎨 界面与体验: 全新交互范式
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    采用左侧对话、右侧控制台 (<code>atypica llm console</code>) 的分屏设计，实时展示
                    AI 的思考和执行过程，提升信息透明度 (2025-03-19)。
                    实现研究过程回放（Replay）功能，可生成分享链接 (2025-03-22)。 新增研究统计 (
                    <code>Nerd Stats</code>)，追踪 <code>tokens</code> 和 <code>steps</code> 消耗
                    (2025-03-26)。 新增 <code>light/dark</code> 主题切换 (2025-03-25)。 基于{" "}
                    <code>git log</code> 自动生成第一版 <code>changelog</code> 页面。
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* v2.x */}
        <section>
          <h2 className="text-2xl font-bold mb-8">v2.x: 分步式研究流程</h2>
          <div className="space-y-10">
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v2.0.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-03-15</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ 核心重构: 引导式流程
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    推出 <code>scout → personas → analyst → interview → report</code>{" "}
                    的多页面分步研究流程，规范了市场研究的基本框架。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ 新功能
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    <code>Analyst</code>: 创建和管理研究主题，并将其存储于数据库。
                    <br />
                    <code>Interview</code>: 实现 AI 与 Persona 的自动访谈，模拟用户调研。
                    <br />
                    <code>Report</code>: 自动生成 HTML 格式的研究报告，并支持网页分享。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔧 平台架构
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    引入用户认证与权限管理，实现注册登录和研究历史的私有化 (2025-03-16)。
                    <br />
                    项目首次部署至 <code>AWS</code> 集群，域名 <code>atypica.musedam.cc</code>{" "}
                    上线，并配置 <code>GitHub CI</code> 实现持续集成。
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* v1.x */}
        <section>
          <h2 className="text-2xl font-bold mb-8">v1.x: 用户发掘工具</h2>
          <div className="space-y-10">
            <article>
              <h3 className="font-semibold text-xl mb-4">
                <code>v1.0.0</code> —{" "}
                <em className="text-gray-600 dark:text-gray-400 font-normal">2025-03-12</em>
              </h3>
              <ul className="list-disc list-outside pl-6 space-y-3 text-gray-800 dark:text-gray-200">
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🚀 项目启动: ArchitypeAI -&gt; Atypica
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    提出产品概念：利用社交网络数据构建可交互的用户画像 (Persona)，以测试产品创新方案
                    (2025-03-05)。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    ✨ 核心功能: AI 用户画像生成
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    实现首个端到端流程：根据输入主题，从“小红书”数据中自动总结和归纳用户画像。
                    <code>SavePersona</code> 工具首次成功将 AI 生成的画像存入数据库。
                  </p>
                </li>
                <li>
                  <strong className="font-semibold text-gray-900 dark:text-gray-100">
                    🔧 技术栈
                  </strong>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    <code>Next.js</code> + <code>Vercel AI SDK</code> + <code>LLM Tools</code>{" "}
                    作为核心框架。
                    <br />
                    <code>Claude 3.7 Sonnet</code> 作为核心推理模型。
                    <br />
                    通过 <code>experimental</code> 方法改写 prompt，显著降低早期 Token 消耗
                    (2025-03-08)。
                  </p>
                </li>
              </ul>
            </article>
          </div>
        </section>

        <footer className="text-center text-gray-500 dark:text-gray-400 pt-8 border-t border-gray-300 dark:border-gray-700">
          <p>日志始于 2025年3月5日，项目启动。</p>
        </footer>
      </div>
    </div>
  );
};
