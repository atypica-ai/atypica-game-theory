"use client";

import { Persona } from "@/prisma/client";
import { BrainIcon } from "lucide-react";

export function PersonaSummary({ personas }: { personas: Persona[] }) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold flex items-center gap-3 text-slate-900">
          <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center">
            <BrainIcon className="size-3 text-white" />
          </div>
          生成的用户画像
        </h2>
        <p className="text-slate-600 ml-9 text-sm">
          基于PDF内容生成的具体用户画像，每个都有独特的特征和AI代理提示词
        </p>
      </div>

      <div className="grid gap-4">
        {personas.map((persona, index) => (
          <div key={persona.id} className="p-4 bg-white rounded-lg border border-slate-200">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center text-white text-xs font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">{persona.name}</h4>
                    <p className="text-sm text-slate-600">{persona.source}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(persona.tags as string[]).map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3 rounded border">
                {persona.prompt}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-4 border-t border-slate-200">
        <p className="text-sm text-slate-500">
          共生成 {personas.length} 个用户画像，可用于对话模拟和用户研究
        </p>
      </div>
    </div>
  );
}
