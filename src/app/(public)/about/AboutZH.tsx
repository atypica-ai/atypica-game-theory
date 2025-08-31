import React from "react";

export const AboutZH: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12 font-sans">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 font-mono">
          <span className="text-green-600 dark:text-green-400">atypica</span>.AI
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          用「语言模型」为「主观世界」建模
        </p>
        <blockquote className="text-lg mt-6 border-l-4 border-green-600 dark:border-green-400 pl-6 italic">
          <p className="text-gray-700 dark:text-gray-300">
            &ldquo;人们不是在处理概率，而是在处理故事。&rdquo;
            <span className="opacity-70 block text-sm mt-1">— 丹尼尔·卡尼曼</span>
          </p>
          <p className="text-sm mt-2 opacity-70 text-gray-600 dark:text-gray-400">
            People don&apos;t choose between things, they choose between descriptions of things. —
            Daniel Kahneman
          </p>
        </blockquote>
      </header>

      <div className="space-y-16">
        {/* 商业研究的本质 */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3">
            商业研究的本质
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <p className="text-gray-800 dark:text-gray-200">
                商业研究是一门理解人类决策的学问。人并不只是根据纯粹理性做决策，而是受到叙事、情感和认知偏见的影响。所以，理解影响决策的机制是商业研究的核心。
              </p>
              <p className="text-gray-800 dark:text-gray-200">
                如果，「物理」为「客观世界」建模；那么，「语言模型」则有机会为「主观世界」建模。atypica.AI能够捕捉到通过数据分析处理的不够好的人类决策机制，为个人和商业决策问题提供深度洞察。
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-4 text-green-600 dark:text-green-400">
                我们的方法
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">→</span>
                  通过构建「AI 人设」来「模拟」消费者的个性和认知
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">→</span>
                  通过「访谈员 AI」与「AI 人设」的「访谈」来分析消费者的行为和决策
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">→</span>
                  自动生成详尽的研究报告，提供可视化洞察
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 研究流程 */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3">
            研究流程
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-8">
            使用atypica.AI，你只需要提出一个具体商业研究问题，系统会通过10-20分钟的「长推理」给出一份详尽的调研报告。
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              { step: 1, title: "明确问题" },
              { step: 2, title: "设计任务" },
              { step: 3, title: "浏览社媒" },
              { step: 4, title: "建立 AI 人设" },
              { step: 5, title: "访谈模拟" },
              { step: 6, title: "总结结果" },
              { step: 7, title: "生成报告" },
            ].map((item) => (
              <div
                key={item.step}
                className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="text-lg font-semibold text-green-600 dark:text-green-400 mb-2">
                  {item.step}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{item.title}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              「Nerd Stats」会记录工作过程中耗费多少时间、步骤、有多少个 AI
              人设角色、耗费多少token等，这也是一种 AI 的「工作证明」（Proof of Work）。
            </p>
          </div>
        </section>

        {/* 使用场景 */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3">
            使用场景
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="border border-gray-300 dark:border-gray-700 p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white mr-4">
                  测
                </div>
                <h3 className="text-xl font-semibold">测试 / Testing</h3>
              </div>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                评估营销内容选题与效果，预测受众反应
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>示例：</strong>罗技鼠标在小红书上选题，哪个会更受欢迎？
              </p>
            </div>

            <div className="border border-gray-300 dark:border-gray-700 p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white mr-4">
                  察
                </div>
                <h3 className="text-xl font-semibold">洞察 / Insight</h3>
              </div>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                发现用户体验痛点，了解客户评价和体验
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>示例：</strong>我是LV上海区总经理，客户对我们上海门店的购物体验有什么反馈？
              </p>
            </div>

            <div className="border border-gray-300 dark:border-gray-700 p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white mr-4">
                  创
                </div>
                <h3 className="text-xl font-semibold">共创 / Co-create</h3>
              </div>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                与模拟用户共同创意，开发新产品和服务
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>示例：</strong>
                和一线城市的年轻父母，一起共创Mars的&ldquo;脆香米&rdquo;的新产品想法？
              </p>
            </div>

            <div className="border border-gray-300 dark:border-gray-700 p-6 rounded-lg hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full bg-yellow-600 flex items-center justify-center text-white mr-4">
                  划
                </div>
                <h3 className="text-xl font-semibold">规划 / Planning</h3>
              </div>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                制定市场营销策略，开发产品路线图
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>示例：</strong>INAH 银那无醇葡萄饮市场营销策划书
              </p>
            </div>
          </div>

          <div className="mt-8 bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">
              个人决策辅助
            </h3>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              虽然atypica.AI是以商业研究分析的工具，但是也可以进行一些个人决策研究，比如为生日晚餐选合适的中餐餐馆，便携式显示器该怎么选，游泳特长生该怎么规划去美国或英国读高中等。
            </p>
          </div>
        </section>

        {/* 技术起源与发展 */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3">
            技术起源与发展
          </h2>
          <div className="space-y-6">
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">
                atypica.AI的缘起
              </h3>
              <div className="space-y-4">
                <div className="border-l-4 border-gray-400 pl-4">
                  <div className="flex items-center mb-2">
                    <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded mr-2">
                      2023
                    </span>
                    <h4 className="font-medium">多 AI 人设互动</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    斯坦福小镇的论文《Generative Agents: Interactive Simulacra of Human
                    Behavior》让我们第一次见识了多 AI
                    人设互动的概念，但是这篇文章并没有真正的展示这些模拟的人设如何进行交互的。
                  </p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="flex items-center mb-2">
                    <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded mr-2">
                      2023.12
                    </span>
                    <h4 className="font-medium">模型工具调用</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    OpenAI发布了GPT-4的Function
                    Calling功能，让模型能够调用外部工具；2024年11月，Claude的MCP协议，让我们看到了模型操作工具的可能性。这种技术进步开创了全新的应用场景，使模型不再局限于对话框内的交互，而是能够主动与外部世界建立连接。
                  </p>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <div className="flex items-center mb-2">
                    <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded mr-2">
                      2024.11
                    </span>
                    <h4 className="font-medium">语言模型为主观世界建模</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    斯坦福小镇研究团队发表了题为《Generative Agent Simulations of 1,000
                    People》的开创性论文，该研究成功模拟了1000个随机美国人的行为模式。研究人员通过AI对真实人类进行深入采访，构建了能够准确反映个体行为和决策模式的
                    AI 人设。令人瞩目的是，这些 AI
                    人设与真人的行为一致性高达85%以上，展现出前所未有的模拟精度。
                  </p>
                </div>
                <div className="border-l-4 border-yellow-500 pl-4">
                  <div className="flex items-center mb-2">
                    <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded mr-2">
                      2025.02
                    </span>
                    <h4 className="font-medium">发散优先的长推理</h4>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Deepseek
                    R1让我们看到透明的推理过程，因此知道了怎么来设计在基座模型基础上的推理架构。与针对客观世界/科学问题的推理方法强调&ldquo;收敛&rdquo;不同，主观世界/商业问题的推理需要强调&ldquo;发散&rdquo;。我们定义为四个维度：1）学习过去的案例、2）灵光乍现、3）反馈的质量、4）迭代的数量。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 技术局限与展望 */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3">
            技术局限与展望
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
                atypica.AI的局限性
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <span className="text-gray-500 mr-2">1.</span>
                  <div>
                    <strong>输入问题的质量：</strong>输入问题的准确度，很大程度上决定了报告的质量
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-gray-500 mr-2">2.</span>
                  <div>
                    <strong>模型精确度局限：</strong>
                    斯坦福的研究中表明这种方法可以80%准确模拟消费者的复杂决策过程，对高度情感化或情境依赖的决策预测有局限，对新兴小众消费群体的模拟不够准确
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-gray-500 mr-2">3.</span>
                  <div>
                    <strong>数据整合复杂性：</strong>
                    数据质量和结构差异大，整合难度高，数据干净度问题可能导致模型扭曲；这种方法更善于模拟用户的正向和负向反馈，但是不擅长模拟用户的偏见和局限
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-gray-500 mr-2">4.</span>
                  <div>
                    <strong>创新性预测困难：</strong>难以预测真正突破性的创新反应
                  </div>
                </li>
              </ul>
            </div>

            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-green-600 dark:text-green-400">
                方法类比与展望
              </h3>
              <div className="mb-4">
                <blockquote className="border-l-4 border-gray-500 pl-4 italic text-gray-700 dark:text-gray-300">
                  这种方法相当于将橙汁提炼为精华粉末，再通过语言模型作为&ldquo;水&rdquo;将其重新冲调成橙汁。
                  虽然这种「合成橙汁」并非完全天然，但它尽量模拟了真实橙汁的口感、色彩和营养特性。
                </blockquote>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                随着语言模型的持续发展和多模态能力的增强，atypica.AI将在以下方面持续改进：
              </p>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                  更精准的用户画像和行为模型
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                  更深入的心理模型整合
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                  更细致的群体差异建模
                </li>
                <li className="flex items-start">
                  <span className="text-green-600 dark:text-green-400 mr-2">•</span>
                  更透明的AI推理和解释系统
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* HippyGhosts */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3">
            HippyGhosts 社区
          </h2>
          <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="md:w-1/3 flex justify-center">
                <div className="w-32 h-32 bg-green-600 rounded-lg flex items-center justify-center text-white text-4xl font-bold">
                  👻
                </div>
              </div>
              <div className="md:w-2/3">
                <h3 className="text-xl font-bold mb-4 text-green-600 dark:text-green-400">
                  HippyGhosts
                </h3>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                  atypica.AI的皮肤来自于代表极客精神的快乐嬉皮鬼社区{" "}
                  <a
                    href="https://hippyghosts.io"
                    className="text-green-600 dark:text-green-400 hover:underline"
                  >
                    HippyGhosts.io
                  </a>
                  。
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  在atypica.AI的世界中，每一个「AI 人设」的物理化身都是一枚「Hippy
                  Ghost」，代表着技术与创意的融合，也象征着我们对构建有个性、有温度的AI人设的追求。
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="text-center text-gray-500 dark:text-gray-400 pt-8 border-t border-gray-300 dark:border-gray-700">
          <div className="mb-4">
            <a
              href="/deck"
              className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            >
              查看我们的项目介绍 →
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
};
