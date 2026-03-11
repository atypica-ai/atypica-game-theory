import "server-only";

import { prisma } from "@/prisma/prisma";
import type { Locale } from "next-intl";
import path from "path";

export interface BuiltinUniversalSkill {
  name: string;
  description: string;
  sourcePath: string;
}

export interface UniversalSkillCatalogEntry {
  name: string;
  description: string;
  location: string;
  source: "builtin" | "user";
}

export interface UniversalSkillCatalog {
  skills: UniversalSkillCatalogEntry[];
  uploadedSkills: Array<{ id: number; name: string }>;
  builtinSkills: BuiltinUniversalSkill[];
}

export function buildBuiltinSkills(): BuiltinUniversalSkill[] {
  return [
    {
      name: "atypica-study-executor",
      description:
        "Executes research and analysis tasks with atypica study tools. Use for persona discovery, interviews, discussions, synthesis, and optional report delivery.",
      sourcePath: path.join(
        process.cwd(),
        "src/app/(universal)/skills/builtins/atypica-study-executor",
      ),
    },
  ];
}

export async function buildUniversalSkillCatalog({
  userId,
}: {
  userId: number;
}): Promise<UniversalSkillCatalog> {
  const uploadedSkills = await prisma.agentSkill.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      description: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const builtinSkills = buildBuiltinSkills();
  const skills: UniversalSkillCatalogEntry[] = [
    ...builtinSkills.map((skill) => ({
      name: skill.name,
      description: skill.description,
      location: `/skills/${skill.name}/SKILL.md`,
      source: "builtin" as const,
    })),
    ...uploadedSkills.map((skill) => ({
      name: skill.name,
      description: skill.description,
      location: `/skills/${skill.name}/SKILL.md`,
      source: "user" as const,
    })),
  ];

  return {
    skills,
    uploadedSkills: uploadedSkills.map((skill) => ({ id: skill.id, name: skill.name })),
    builtinSkills,
  };
}

export function buildAvailableSkillsXml(skills: UniversalSkillCatalogEntry[]): string {
  if (skills.length === 0) return "";

  return `<available_skills>
${skills
  .map(
    (skill) => `<skill>
<name>${skill.name}</name>
<description>${skill.description}</description>
<location>${skill.location}</location>
</skill>`,
  )
  .join("\n")}
</available_skills>`;
}

export function buildUniversalSkillsSection({
  locale,
  skills,
}: {
  locale: Locale;
  skills: UniversalSkillCatalogEntry[];
}): string {
  const skillsXml = buildAvailableSkillsXml(skills);

  return locale === "zh-CN"
    ? `
## 可用的 Skills

${
  skills.length > 0
    ? `
${skillsXml}

**如何使用 Skills：**
- 查看所有 skills：\`ls -la /skills/\`
- 查看详情：\`for dir in /skills/*/; do echo "=== \${dir} ==="; head -10 "\$dir/SKILL.md" 2>/dev/null; echo; done\`
- 加载特定 skill：\`readFile({ path: "/skills/skill-name/SKILL.md" })\` 或 \`cat /skills/skill-name/SKILL.md\`
- 读取参考资料：\`cat /skills/skill-name/references/core-memory.md\`

**重要提示：**
- Skill 的 description 是判断何时使用的关键
- 加载 skill 后，你需要完全进入该角色
- Skill 中的指示是自包含的，优先遵循 skill 的执行方法
`
    : `
你目前没有可用的 skills。使用 listSkills 工具检查技能库状态。
`
}`
    : `
## Available Skills

${
  skills.length > 0
    ? `
${skillsXml}

**How to Use Skills:**
- View all skills: \`ls -la /skills/\`
- View details: \`for dir in /skills/*/; do echo "=== \${dir} ==="; head -10 "\$dir/SKILL.md" 2>/dev/null; echo; done\`
- Load a specific skill: \`readFile({ path: "/skills/skill-name/SKILL.md" })\` or \`cat /skills/skill-name/SKILL.md\`
- Read reference materials: \`cat /skills/skill-name/references/core-memory.md\`

**Important Notes:**
- The skill description is the first signal for when to use it
- After loading a skill, fully embody that role
- Skill instructions are self-contained, so prefer the skill's method once loaded
`
    : `
You currently have no skills available. Use the listSkills tool to inspect the skill library.
`
}`;
}
