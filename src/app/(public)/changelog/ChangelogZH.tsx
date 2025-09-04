import React from "react";

export const ChangelogZH: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 font-sans">
      <header className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">atypica.AI 更新日志</h1>
      </header>

      <div className="space-y-16">
        {/* Future Updates */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3">
            未来更新预览
          </h2>
          <div className="space-y-6 text-gray-800 dark:text-gray-200">
            <article>
              <ul className="space-y-4">
                <li>
                  <h4 className="font-semibold text-lg">
                    🧪 Alpha 测试中: 产品研发流程 (Product R&D Flow)
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 mt-1 pl-1">
                    全新的&quot;产品创新&quot;研究模板，专注于市场趋势、用户需求和创意生成。
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
              <ul className="space-y-4 text-gray-800 dark:text-gray-200">
                <li>
                  <h4 className="font-semibold text-lg">🚀 正式上线: 访谈项目 & AI 人设导入</h4>
                  <p className="text-gray-700 dark:text-gray-300 mt-1 pl-1">
                    两大功能现已面向所有套餐用户开放（移除预览/测试状态）
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mt-1 pl-1">
                    Free/Pro 套餐：可使用基础功能<br />
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
