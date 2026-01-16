"use server";

import { uploadToS3 } from "@/lib/attachments/s3";
import { withAuth } from "@/lib/request/withAuth";
import { ServerActionResult } from "@/lib/serverAction";
import type { AgentSkillExtra } from "@/prisma/client";
import { prisma } from "@/prisma/prisma";
import JSZip from "jszip";

/**
 * Parse YAML frontmatter from markdown content
 * Format: ---\nkey: value\n---\ncontent
 */
function parseFrontmatter(content: string): { data: Record<string, string>; content: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { data: {}, content };
  }

  const [, yamlString, mainContent] = match;
  const data: Record<string, string> = {};

  // Simple YAML parser for key: value pairs
  yamlString.split("\n").forEach((line) => {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      data[key] = value;
    }
  });

  return { data, content: mainContent };
}

export async function uploadSkillAction(
  base64Content: string,
  filename: string,
): Promise<ServerActionResult<{ skillId: number; skillName: string }>> {
  return withAuth(async (user) => {
    const buffer = Buffer.from(base64Content, "base64");
    const zip = await JSZip.loadAsync(buffer);

    // 1. 解析 SKILL.md 获取元数据（支持子目录）
    const files = Object.keys(zip.files);
    const skillMdFileName = files.find(
      (name) => name.endsWith("SKILL.md") && !zip.files[name].dir,
    );

    if (!skillMdFileName) {
      return {
        success: false,
        message: `Invalid .skill file: SKILL.md not found. Files: ${files.join(", ")}`,
        code: "internal_server_error",
      };
    }

    const skillMdFile = zip.file(skillMdFileName);
    if (!skillMdFile) {
      return {
        success: false,
        message: "Invalid .skill file: Cannot read SKILL.md",
        code: "internal_server_error",
      };
    }

    const skillMdContent = await skillMdFile.async("string");
    const { data: frontmatter } = parseFrontmatter(skillMdContent);

    if (!frontmatter.name || !frontmatter.description) {
      return {
        success: false,
        message: "Invalid SKILL.md: missing name or description in frontmatter",
        code: "internal_server_error",
      };
    }

    const skillName = frontmatter.name as string;

    // 2. 上传到 S3（持久化）
    const { objectUrl } = await uploadToS3({
      keySuffix: `skills/${user.id}/${Date.now()}-${filename}` as `${string}/${string}.${string}`,
      fileBody: new Uint8Array(buffer),
      mimeType: "application/zip",
    });

    // 3. 保存到数据库
    const extra: AgentSkillExtra = {
      source: "upload",
    };

    const skill = await prisma.agentSkill.upsert({
      where: {
        userId_name: { userId: user.id, name: skillName },
      },
      create: {
        userId: user.id,
        name: skillName,
        description: frontmatter.description as string,
        objectUrl,
        extra,
      },
      update: {
        description: frontmatter.description as string,
        objectUrl,
        extra,
      },
    });

    return {
      success: true,
      data: {
        skillId: skill.id,
        skillName: skill.name,
      },
    };
  });
}

/**
 * 列出用户的所有 skills
 */
export async function listSkillsAction(): Promise<
  ServerActionResult<
    Array<{
      id: number;
      name: string;
      description: string;
      source: string;
      createdAt: Date;
    }>
  >
> {
  return withAuth(async (user) => {
    const skills = await prisma.agentSkill.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        description: true,
        extra: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const skillsWithSource = skills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      description: skill.description,
      source: (skill.extra as AgentSkillExtra).source || "upload",
      createdAt: skill.createdAt,
    }));

    return {
      success: true,
      data: skillsWithSource,
    };
  });
}

/**
 * 删除 skill
 */
export async function deleteSkillAction(skillId: number): Promise<ServerActionResult<void>> {
  return withAuth(async (user) => {
    const skill = await prisma.agentSkill.findUnique({
      where: { id: skillId },
      select: { userId: true, name: true },
    });

    if (!skill) {
      return {
        success: false,
        message: "Skill not found",
        code: "not_found",
      };
    }

    if (skill.userId !== user.id) {
      return {
        success: false,
        message: "Unauthorized",
        code: "forbidden",
      };
    }

    // 删除数据库记录
    await prisma.agentSkill.delete({
      where: { id: skillId },
    });

    // 注意：不删除 S3 文件（保留备份）
    // 本地缓存会在下次重启时自动清理

    return {
      success: true,
      data: undefined,
    };
  });
}
