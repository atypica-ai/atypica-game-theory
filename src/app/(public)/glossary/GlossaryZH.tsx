import React from "react";

export const GlossaryZH: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 font-sans">
      <header className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2 font-mono tracking-tighter">
          [ Atypica.AI 词汇表 ]
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          用于同步所有智能体 (无论人类或 AI) 通讯协议的词典。
        </p>
      </header>

      <div className="space-y-16">
        {/* Section 1: 核心概念 */}
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b border-gray-300 dark:border-gray-700 pb-3 font-mono">
            {/* 1. 核心概念 */}
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-700">
                    术语 / Term
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-300 dark:border-gray-700">
                    描述 / Description
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-800 dark:text-gray-200">
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-top">
                    <code className="font-semibold text-base">AI Persona / AI 人设</code>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <strong>（核心术语）</strong> 指由 AI
                    模拟的、具有特定人口统计学特征、行为模式和心理动机的虚拟用户。是系统的主要
                    <strong>被访谈对象</strong>。
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-top">
                    <code className="font-semibold text-base">Interviewer AI / 访谈员 AI</code>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    指在“访谈项目”等功能中，负责<strong>执行访谈、提出问题</strong>的 AI 角色。
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-top">
                    <code className="font-semibold text-base">Study Expert / 研究专家</code>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    在某些对话场景中，与 `Interviewer AI` 角色类似，指代负责主导研究和访谈的 AI。
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-top">
                    <code className="font-semibold text-base">AI Persona Import / AI 人设导入</code>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    指通过上传访谈记录等文件，自动分析并生成 `AI 人设` 的核心功能模块。
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-top">
                    <code className="font-semibold text-base">Interview Project / 访谈项目</code>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    指用户可以创建和管理的研究项目，在项目中可以与 `AI 人设` 或真实用户进行访谈。
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 align-top">
                    <code className="font-semibold text-base">
                      High-Precision AI Persona / 高精度 AI 人设
                    </code>
                  </td>
                  <td className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    特指由 Atypica 团队通过专业方法构建的、具有更高真实性和行为一致性的 `AI
                    人设`（详见 Tier 2）。
                  </td>
                </tr>
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 align-top">
                    <code className="font-semibold text-base">Human Persona / 真人 AI 人设</code>
                  </td>
                  <td className="px-4 py-3">
                    特指用户通过 `AI 人设导入` 功能生成的、基于真实访谈数据的、私有的 `AI
                    人设`（详见 Tier 3）。
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 2: AI 人设层级 */}
        <section>
          <h2 className="text-2xl font-bold mb-8 font-mono border-b border-gray-300 dark:border-gray-700 pb-3">
            {/* 2. AI 人设层级 */}
          </h2>
          <p className="mb-8 text-gray-700 dark:text-gray-300">
            `AI 人设` 根据其数据来源、构建方式和精度被划分为不同的层级
            (Tier)。层级越高，代表其行为模拟的真实性和复杂度越高。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold mb-2 font-mono">Tier 0: (标准) AI 人设</h3>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">
                来源: 通用数据
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                能够满足基础的研究和访谈需求，是构成 AI 人设生态的基础。
              </p>
            </div>
            <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-bold mb-2 font-mono">Tier 1: 合成 AI 人设</h3>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4">
                来源: 公开数据合成
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                相比 Tier 0，具有更明确的行为模式和特征，质量更高，能够用于更具体的市场分析。
              </p>
            </div>
            <div className="border border-teal-500/50 dark:border-teal-400/60 rounded-lg p-6 hover:shadow-lg transition-shadow bg-teal-50/20 dark:bg-teal-900/10">
              <h3 className="text-xl font-bold mb-2 font-mono text-teal-700 dark:text-teal-300">
                Tier 2: 高精度 AI 人设
              </h3>
              <p className="text-sm font-semibold text-teal-600 dark:text-teal-400 mb-4">
                来源: 专业认知建模
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                高质量、高精度的 AI
                人设。它们在认知模式、情感反应和决策逻辑上保持高度一致性，能够模拟真实消费者的复杂行为，是进行深度商业研究的核心。
              </p>
            </div>
            <div className="border border-indigo-500/50 dark:border-indigo-400/60 rounded-lg p-6 hover:shadow-lg transition-shadow bg-indigo-50/20 dark:bg-indigo-900/10">
              <h3 className="text-xl font-bold mb-2 font-mono text-indigo-700 dark:text-indigo-300">
                Tier 3: 真人 AI 人设
              </h3>
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-4">
                来源: 用户私有数据
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                <strong>私有性</strong>
                是其最大特点。这类人设完全基于用户提供的私有数据构建，不会被其他用户搜索或使用，确保了商业信息的安全。其真实性直接取决于用户提供的访谈数据质量。
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: 智能体角色区分 */}
        <section>
          <h2 className="text-2xl font-bold mb-8 font-mono border-b border-gray-300 dark:border-gray-700 pb-3">
            {/* 3. 智能体角色区分 */}
          </h2>
          <p className="mb-8 text-gray-700 dark:text-gray-300">
            为了避免混淆，项目中涉及的 &quot;Agent&quot; (智能体) 角色必须严格区分其职能。
          </p>
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1 border-l-4 border-blue-500 pl-6 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-r-lg">
              <h3 className="text-xl font-semibold mb-3">被访谈者 (Interviewee)</h3>
              <p className="mb-4">
                <span className="font-semibold text-gray-600 dark:text-gray-400">标准叫法:</span>
                <br />
                <code className="text-lg text-blue-700 dark:text-blue-400">
                  AI Persona / AI 人设
                </code>
              </p>
              <p>
                <span className="font-semibold text-gray-600 dark:text-gray-400">职责:</span>
                <br />
                <span className="text-gray-800 dark:text-gray-200">
                  作为访谈对象，回答问题，提供数据和洞察。
                </span>
              </p>
            </div>

            <div className="flex-1 border-l-4 border-green-500 pl-6 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-r-lg">
              <h3 className="text-xl font-semibold mb-3">访谈者 (Interviewer)</h3>
              <p className="mb-4">
                <span className="font-semibold text-gray-600 dark:text-gray-400">标准叫法:</span>
                <br />
                <code className="text-lg text-green-700 dark:text-green-400">
                  Interviewer AI / 访谈员 AI
                </code>
              </p>
              <p>
                <span className="font-semibold text-gray-600 dark:text-gray-400">职责:</span>
                <br />
                <span className="text-gray-800 dark:text-gray-200">
                  作为访谈的发起者和引导者，根据研究目标提出问题，并进行追问。
                </span>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
