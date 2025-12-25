import { Button } from "@/components/ui/button";
import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import React from "react";

export const AffiliateZH: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-6 py-24 md:py-40 font-sans">
      {/* Hero Section */}
      <header className="text-center mb-20 md:mb-24">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-EuclidCircularA font-medium tracking-tight mb-6">
          加入 Atypica 联盟计划
        </h1>
        <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto mb-8">
          与 Atypica 合作，为您推荐到 atypica.AI 的付费客户在前 3 个月内的前 3 次付款获得
          30% 的佣金
        </p>
        <Button
          size="lg"
          className="rounded-full has-[>svg]:px-8 px-8 h-12"
          asChild
        >
          <Link
            href="https://friends.atypica.ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            成为联盟伙伴
            <ExternalLinkIcon className="h-4 w-4" />
          </Link>
        </Button>
      </header>

      {/* How it Works Section */}
      <section className="mb-16 md:mb-20">
        <h2 className="text-3xl md:text-4xl font-EuclidCircularA font-medium mb-12 text-center text-zinc-900 dark:text-zinc-100">
          如何运作
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 1: Sign up */}
          <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:-translate-y-1 transition-all duration-300">
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-semibold text-base mb-4 mx-auto">
              1
            </div>
            <h3 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-zinc-100 text-center">
              注册
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
              加入我们的联盟计划，获得您的专属推荐链接
            </p>
          </div>

          {/* Step 2: Share Atypica */}
          <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:-translate-y-1 transition-all duration-300">
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-semibold text-base mb-4 mx-auto">
              2
            </div>
            <h3 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-zinc-100 text-center">
              分享 Atypica
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
              通过链接向您的网络和社区推广 Atypica
            </p>
          </div>

          {/* Step 3: Track Performance */}
          <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:-translate-y-1 transition-all duration-300">
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-semibold text-base mb-4 mx-auto">
              3
            </div>
            <h3 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-zinc-100 text-center">
              跟踪表现
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
              在个人仪表板中监控您的推荐和转化情况
            </p>
          </div>

          {/* Step 4: Earn Commission */}
          <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:-translate-y-1 transition-all duration-300">
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-semibold text-base mb-4 mx-auto">
              4
            </div>
            <h3 className="text-xl font-semibold mb-3 text-zinc-900 dark:text-zinc-100 text-center">
              获得佣金
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
              前 3 个月内前 3 次成功付款可获得 30% 佣金
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mb-16 md:mb-20 text-center bg-zinc-50 dark:bg-zinc-900 p-12 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow duration-300">
        <h2 className="text-2xl md:text-3xl font-EuclidCircularA font-medium mb-4 text-zinc-900 dark:text-zinc-100">
          准备开始了吗？
        </h2>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
          加入我们的联盟计划，在赚取佣金的同时，帮助塑造 AI 驱动的市场和消费者研究的未来。
        </p>
        <Button
          size="lg"
          className="rounded-full has-[>svg]:px-8 px-8 h-12"
          asChild
        >
          <Link
            href="https://friends.atypica.ai"
            target="_blank"
            rel="noopener noreferrer"
          >
            成为联盟伙伴
            <ExternalLinkIcon className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      {/* Help Section */}
      <section className="text-center">
        <h2 className="text-2xl md:text-3xl font-EuclidCircularA font-medium mb-4 text-zinc-900 dark:text-zinc-100">
          需要帮助？
        </h2>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
          如果您对联盟计划有任何疑问，请点击下方与我们的专家智能体对话，获取答案和支持。
        </p>
        <Button
          variant="outline"
          size="lg"
          className="rounded-full has-[>svg]:px-8 px-8 h-12"
          asChild
        >
          <Link
            href="https://atypica.ai/sage/profile/TbbLWdttgRyhqgvU"
            target="_blank"
            rel="noopener noreferrer"
          >
            咨询专家智能体
            <ExternalLinkIcon className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </div>
  );
};

