import HippyGhostAvatar from "@/components/HippyGhostAvatar";
import React from "react";

export const JoinUsZH: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 font-sans">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 font-mono">
          加入 <span className="text-green-600 dark:text-green-400">atypica</span>.AI
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          用「语言模型」为「主观世界」建模
        </p>
        <blockquote className="text-lg mt-6 border-l-4 border-green-600 dark:border-green-400 pl-6 italic">
          <p className="text-gray-700 dark:text-gray-300">
            &ldquo;一起构建理解人类决策的AI智能&rdquo;
          </p>
        </blockquote>
      </header>

      {/* 成果展示 */}
      <section className="bg-green-50 dark:bg-green-900/20 p-8 rounded-lg mb-16">
        <h2 className="text-xl font-bold mb-6 text-center">我们已经取得的成果</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-green-600 dark:text-green-400">
              300K+
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider">
              AI人设创建数量
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-green-600 dark:text-green-400">
              +1M
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider">
              模拟访谈完成数量
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold text-green-600 dark:text-green-400">
              &lt;30m
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium uppercase tracking-wider">
              平均研究时长
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-16">
        {/* 运营增长专员职位 */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3">
            运营增长专员
          </h2>
          <div className="space-y-6">
            <p className="text-gray-800 dark:text-gray-200">
              推动atypica.AI在专业研究者群体中的增长。通过精准的用户获取、深度内容营销和专业社区建设，让更多研究者、分析师和咨询师发现AI驱动的主观世界建模价值。
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-green-600 dark:text-green-400">
                  你将负责
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>• 付费广告投放：设计并执行Google Ads、LinkedIn Ads等精准投放</li>
                  <li>• KOL合作营销：与行业专家、研究者建立合作，扩大品牌影响力</li>
                  <li>• 社交媒体运营：在Twitter、LinkedIn等平台建立专业品牌形象</li>
                  <li>• 精细化运营：基于用户行为数据，设计个性化的用户体验和转化路径</li>
                  <li>• 内容营销：撰写AI研究方法论深度文章，制作专业产品演示</li>
                  <li>• 社区建设：运营研究者交流社群，组织AI研究方法论分享会</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-green-600 dark:text-green-400">
                  你需要具备
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>• 英文流畅：能撰写英文营销材料，理解全球市场用户需求</li>
                  <li>• 营销敏感度：能快速捕捉市场趋势，发现新的增长机会</li>
                  <li>• 沟通协调能力：善于与KOL、合作伙伴建立长期关系</li>
                  <li>• 执行力强：能独立完成从策略制定到落地执行的完整流程</li>
                  <li>• 学习能力：对新兴营销渠道和工具保持好奇和快速学习</li>
                  <li>• 结果导向：关注ROI和转化数据，持续优化营销效果</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 研发工程师职位 */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3">
            研发工程师
          </h2>
          <div className="space-y-6">
            <p className="text-gray-800 dark:text-gray-200">
              构建核心AI研究引擎，实现从问题到洞察的全流程自动化。你将设计7步骤研究流程、AI人设生成系统、专家访谈引擎和长推理分析链，让商业研究变得智能化和高效化。
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-green-600 dark:text-green-400">
                  你将构建
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>• AI研究引擎：构建完整的从问题到洞察的自动化流程</li>
                  <li>• 人设生成系统：基于真实行为数据的多维度AI角色建模</li>
                  <li>• 对话模拟平台：专家与AI人设的深度访谈引擎</li>
                  <li>• 多模态界面：支持文本、语音、图像的研究交互体验</li>
                  <li>• 高性能架构：处理复杂AI推理和大规模并发的技术栈</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-green-600 dark:text-green-400">
                  你需要具备
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>• 全栈开发能力：熟练掌握TypeScript、React和现代Web技术栈</li>
                  <li>• LLM集成经验：有API调用优化、提示词工程的实际项目经验</li>
                  <li>• 系统设计思维：能构建高性能、可扩展的AI应用架构</li>
                  <li>• 多模态技术：在语音、图像、文本AI任一领域有开发经验</li>
                  <li>• 产品意识：关注用户体验，理解专业工具的设计哲学</li>
                  <li>• 技术敏感度：对新兴AI技术保持关注，快速学习应用</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 产品设计师职位 */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3">
            产品设计师
          </h2>
          <div className="space-y-6">
            <p className="text-gray-800 dark:text-gray-200">
              设计直观易用的AI研究工作流。将复杂的人设建模、多智能体访谈、长推理分析等过程，转化为研究者可以轻松掌握的产品体验，让AI驱动的商业洞察触手可及。
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-green-600 dark:text-green-400">
                  你将设计
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>• 复杂工作流设计：将7步骤研究流程可视化，让专业用户高效操作</li>
                  <li>• AI交互界面：设计自然流畅的人机对话体验</li>
                  <li>• 专业工具界面：满足研究者、分析师的专业使用需求</li>
                  <li>• 产品商业化设计：通过设计驱动用户价值感知和付费转化</li>
                  <li>• 用户体验叙事：将复杂的AI能力包装成用户容易理解的产品故事</li>
                  <li>• 响应式体验：跨设备的一致性设计和交互优化</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-green-600 dark:text-green-400">
                  你需要具备
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>• 用户洞察敏锐：能深度理解专业用户的真实需求和使用场景</li>
                  <li>• 商业思维：理解产品设计对商业目标的驱动作用，关注转化和留存</li>
                  <li>• 故事化思维：善于将复杂功能包装成用户容易理解和传播的产品概念</li>
                  <li>• 设计执行力：熟练使用设计工具，能独立完成从概念到落地的全流程</li>
                  <li>• 英文流畅：能为全球用户设计优秀的产品体验</li>
                  <li>• 持续学习：对AI产品设计趋势保持敏感，快速适应新技术</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 团队成员 */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3">
            认识我们的构建者
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-8 text-center">
            想了解更多关于atypica.AI的信息？直接与我们的构建者聊天，一起探索我们正在创造的未来。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg flex items-center space-x-4">
              <HippyGhostAvatar tokenId={524} className="size-16 rounded-full" />
              <div>
                <h3 className="font-semibold text-lg">@web3nomad</h3>
                <a
                  href="https://github.com/web3nomad"
                  className="text-green-600 dark:text-green-400 hover:underline text-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  github.com/web3nomad
                </a>
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg flex items-center space-x-4">
              <HippyGhostAvatar tokenId={1018} className="size-16 rounded-full" />
              <div>
                <h3 className="font-semibold text-lg">Ling Fan</h3>
                <a
                  href="https://www.linkedin.com/in/ling-fan/"
                  className="text-green-600 dark:text-green-400 hover:underline text-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  linkedin.com/in/ling-fan
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* 联系方式 */}
        <section className="text-center bg-green-50 dark:bg-green-900/20 p-8 rounded-lg">
          <h2 className="text-2xl font-bold mb-4">准备好塑造未来了吗？</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            加入我们为主观世界建模的使命，构建理解人类决策的AI系统。
          </p>
          <div className="space-y-4">
            <a
              href="mailto:xd@atypica.ai"
              className="inline-block bg-green-600 dark:bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 dark:hover:bg-green-600 transition-colors mr-4"
            >
              xd@atypica.ai
            </a>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              邮件请包含：简历、作品集或GitHub链接、感兴趣的职位
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
