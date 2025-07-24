import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function InterviewProjectHomePage() {
  return (
    <div className="container mx-auto px-6 py-16 max-w-4xl">
      <div className="space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-medium text-gray-900 dark:text-gray-100 tracking-tight">
            AI 访谈研究平台
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
            创建研究项目，设定访谈问题，邀请真人参与或选择 AI
            智能体进行自动化访谈，获得专业的分析报告
          </p>
        </div>

        {/* Timeline Process */}
        <div className="relative max-w-3xl mx-auto">
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700"></div>

          <div className="space-y-12">
            {/* Step 1 */}
            <div className="relative flex items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-sm text-gray-600 dark:text-gray-400">01</span>
              </div>
              <div className="ml-8 flex-1 pt-2">
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    研究简报 + 预设问题
                  </h3>
                  <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    上传您的研究简报，明确访谈目标。系统会根据研究需求，帮助您构建结构化的访谈问题框架，确保每次访谈都能获得有价值的信息。
                  </p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative flex items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-sm text-gray-600 dark:text-gray-400">02</span>
              </div>
              <div className="ml-8 flex-1 pt-2">
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    真人访谈 + AI 智能体访谈
                  </h3>
                  <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    灵活选择访谈对象：生成安全分享链接邀请真实用户参与，或从丰富的人物库中选择符合目标画像的
                    AI 智能体进行深度模拟访谈。
                  </p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-sm text-gray-600 dark:text-gray-400">03</span>
              </div>
              <div className="ml-8 flex-1 pt-2">
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    AI 专家主导访谈过程
                  </h3>
                  <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    专业的 AI
                    访谈员根据研究目标自动进行深度对话，智能追问关键信息，确保访谈质量和深度，全程无需人工干预。
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative flex items-start">
              <div className="flex-shrink-0 w-12 h-12 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-sm text-gray-600 dark:text-gray-400">04</span>
              </div>
              <div className="ml-8 flex-1 pt-2">
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    智能笔录 + 深度分析报告
                  </h3>
                  <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                    系统自动生成详细的访谈笔录，提取关键洞察，并为每个访谈生成独立分析。最终整合所有访谈数据，生成综合研究报告。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center pt-12 space-y-4">
          <Link href="/interview/projects">
            <Button
              size="lg"
              className="px-8 py-3 bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900"
            >
              开始创建项目
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
