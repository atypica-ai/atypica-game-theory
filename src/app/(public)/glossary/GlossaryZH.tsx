import React from "react";

const coreConcepts = [
  [
    "AI 人设",
    "<strong>（核心术语）</strong> 指由 AI 模拟的、具有特定人口统计学特征、行为模式和心理动机的虚拟用户。是系统的主要<strong>研究对象</strong>。",
  ],
  [
    "AI 人设 (社交媒体)",
    "基于对社交媒体等公开数据的深度分析和模式提取而合成的 `AI 人设`（详见 Tier 1）。",
  ],
  [
    "AI 人设 (深度访谈)",
    "特指由 atypica.AI 团队通过<strong>深度访谈</strong>真人合成的、具有更高真实性和行为一致性的 `AI 人设`（详见 Tier 2）。",
  ],
  [
    "真人 AI 人设 (私有)",
    "特指用户通过 `AI 人设导入` 功能生成的、基于<strong>企业</strong>真实访谈数据的、私有的 `AI 人设`（详见 Tier 3）。",
  ],
  [
    "访谈",
    "一对一深度访谈形式，由访谈员 AI 与单个 AI 人设进行深入对话，用于获取个人洞察、情感理解和行为动机分析。",
  ],
  ["访谈员 AI", '指在"访谈项目"等功能中，负责<strong>执行访谈、提出问题</strong>的 AI 角色。'],
  [
    "讨论",
    "多人群体讨论形式，由主持人引导多个 AI 人设进行互动，用于观察观点碰撞、模拟群体决策场景。包括三种子类型：<strong>焦点小组 (Focus Group)</strong>、<strong>圆桌讨论 (Roundtable)</strong>、<strong>辩论 (Debate)</strong>。",
  ],
  [
    "研究专家",
    "<strong>（核心技术）</strong> atypica.AI 的核心 AI 技术之一，与 `AI 人设` 同等重要。基于 atypica.AI 团队研发的 reasoning model，负责主导研究规划、执行访谈和深度分析。",
  ],
  [
    "专家",
    "可进化的领域专家智能体，通过记忆文档、知识空白追踪和补充访谈机制实现持续学习和知识演进。",
  ],
  ["AI 人设导入", "指通过上传访谈记录等文件，自动分析并生成 `AI 人设` 的核心功能模块。"],
  ["访谈项目", "指用户可以创建和管理的研究项目，在项目中可以与 `AI 人设` 或真实用户进行访谈。"],
];

const tiers = [
  {
    title: "Tier 1: AI 人设 (社交媒体)",
    source: "来源: 基于社交媒体等公开数据合成",
    desc: "具有更明确的行为模式和特征，质量更高，能够用于更具体的市场分析。",
  },
  {
    title: "Tier 2: AI 人设 (深度访谈)",
    source: "来源: 由 atypica.AI 团队专业构建",
    desc: "由 atypica.AI 团队通过深度访谈和专业认知建模构建的高质量、高精度的 AI 人设。它们在认知模式、情感反应和决策逻辑上保持高度一致性，能够模拟真实消费者的复杂行为，是进行深度商业研究的核心。",
  },
  {
    title: "Tier 3: 真人 AI 人设 (私有)",
    source: "来源: 用户上传的<strong>企业</strong>私有访谈数据",
    desc: "用户通过 `AI 人设导入` 功能，上传真实的<strong>企业</strong>访谈记录生成的 AI 人设。<strong>私有性</strong>是其最大特点。这类人设完全基于用户提供的私有数据构建，不会被其他用户搜索或使用，确保了商业信息的安全。其真实性直接取决于用户提供的访谈数据质量。",
  },
];

const roles = [
  {
    title: "AI Persona / AI 人设",
    position: "被研究对象、受访者、讨论参与者",
    capability: "真实性模拟、多样化来源、分层体系",
    usage: "访谈回答、讨论互动",
  },
  {
    title: "Interviewer AI / 访谈员 AI",
    position: "访谈执行者、提问者",
    capability: "深度追问、对话引导、结构化访谈",
    usage: "一对一深度访谈、洞察挖掘",
  },
  {
    title: "Moderator AI / 主持人 AI",
    position: "讨论主持者、协调者",
    capability: "多类型主持、互动促进、节奏控制",
    usage: "焦点小组、圆桌讨论、辩论",
  },
  {
    title: "Sage / 专家",
    position: "可进化的领域专家智能体",
    capability: "记忆即专家、持续进化、可追溯性",
    usage: "记忆文档、知识空白追踪、补充访谈",
    isCore: true,
  },
];

export const GlossaryZH: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12 font-sans">
      <header className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2 font-mono tracking-tighter">
          [ atypica.AI 词汇表 ]
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          用于同步所有智能体 (无论人类或 AI) 通讯协议的词典。
        </p>
      </header>

      <div className="space-y-16">
        <section>
          <h2 className="text-2xl font-bold mb-6 border-b pb-3 font-mono">
            &#123;/* 1. 核心概念 */&#125;
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse border">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold border-b w-1/4">术语</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold border-b">描述</th>
                </tr>
              </thead>
              <tbody>
                {coreConcepts.map(([term, desc], i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 border-b align-top">
                      <code className="font-semibold text-base">{term}</code>
                    </td>
                    <td className="px-4 py-3 border-b" dangerouslySetInnerHTML={{ __html: desc }} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-8 font-mono border-b pb-3">
            &#123;/* 2. AI 人设层级 */&#125;
          </h2>
          <p className="mb-8 text-gray-600 dark:text-gray-400">
            `AI 人设` 根据其数据来源、构建方式和精度被划分为不同的层级
            (Tier)。层级越高，代表其行为模拟的真实性和复杂度越高。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tiers.map((tier, i) => (
              <div key={i} className="border rounded-lg p-6">
                <h3 className="text-xl font-bold mb-2 font-mono">{tier.title}</h3>
                <p
                  className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-4"
                  dangerouslySetInnerHTML={{ __html: tier.source }}
                />
                <p
                  className="text-gray-600 dark:text-gray-400"
                  dangerouslySetInnerHTML={{ __html: tier.desc }}
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-8 font-mono border-b pb-3">
            &#123;/* 3. 模拟人的智能体角色 */&#125;
          </h2>
          <p className="mb-8 text-gray-600 dark:text-gray-400">
            系统中有多种模拟人类行为的智能体角色，它们各自承担不同的职能：
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roles.map((role, i) => (
              <div key={i} className="border rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-3">{role.title}</h3>
                <p className="mb-2">
                  <span className="font-semibold text-gray-600 dark:text-gray-400">角色定位:</span>
                  <span className="ml-2">{role.position}</span>
                </p>
                <p className="mb-2">
                  <span className="font-semibold text-gray-600 dark:text-gray-400">核心能力:</span>
                  <span className="ml-2">{role.capability}</span>
                </p>
                <p className="mb-2">
                  <span className="font-semibold text-gray-600 dark:text-gray-400">
                    {role.isCore ? "核心技术" : "使用场景"}:
                  </span>
                  <span className="ml-2">{role.usage}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
