"use client";

import { Button } from "@/components/ui/button";
import { Persona } from "@/prisma/client";
import { BrainIcon, MessageCircleIcon } from "lucide-react";
import Link from "next/link";

export function PersonaSummary({ personas }: { personas: Persona[] }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold flex items-center gap-3 text-slate-900">
          <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center">
            <BrainIcon className="size-3 text-white" />
          </div>
          生成的用户画像
        </h2>
        <p className="text-slate-600 ml-9 text-sm">
          基于内容生成的AI对话角色，共 {personas.length} 个
        </p>
      </div>

      <div className="grid gap-3">
        {personas.map((persona, index) => (
          <div
            key={persona.id}
            className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">{persona.name}</h4>
                  <div className="text-sm text-slate-600">{persona.source}</div>
                </div>
                <Button asChild size="sm" variant="default">
                  <Link
                    href={`/personas/${persona.id}`}
                    target="_blank"
                    className="flex items-center gap-2"
                  >
                    <MessageCircleIcon className="size-3" />
                    开始对话
                  </Link>
                </Button>
              </div>

              <div className="flex flex-wrap gap-1">
                {(persona.tags as string[]).map((tag, tagIndex) => (
                  <span
                    key={tagIndex}
                    className="px-2 py-1 bg-white text-slate-700 text-xs rounded border"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
