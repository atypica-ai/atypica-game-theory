"use client";

import { Persona } from "@/prisma/client";
import { BrainIcon } from "lucide-react";

export function PersonaSummary({ personas }: { personas: Persona[] }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold flex items-center gap-3 text-gray-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <BrainIcon className="size-4 text-white" />
          </div>
          生成的用户画像
        </h2>
        <p className="text-gray-600 ml-11">
          基于PDF内容生成的具体用户画像，每个都有独特的特征和AI代理提示词
        </p>
      </div>
      <div className="grid gap-4">
        {personas.map((persona, index) => (
          <div
            key={persona.id}
            className="p-5 bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl border border-gray-200/50"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{persona.name}</h4>
                    <p className="text-sm text-gray-600">{persona.source}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(persona.tags as string[]).map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-white/70 p-4 rounded-lg">
                {persona.prompt}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          共生成 {personas.length} 个用户画像，可用于对话模拟和用户研究
        </p>
      </div>
    </div>
  );
}
