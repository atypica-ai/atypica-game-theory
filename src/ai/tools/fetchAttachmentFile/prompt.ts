import { Locale } from "next-intl";

export const attachmentRulesPrompt = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `<附件使用规则>
【识别附件】当用户消息中出现 [#N 文件名] 标记时（如 [#1 报告.pdf]），表示用户上传了参考文件。
【读取方式】使用 fetchAttachmentFile 工具按需读取附件内容：首次遇到建议用 head_tail 模式快速预览，如需完整内容再用 full 模式读取。
【避免重复读取】已 full 读取过的文件无需再次读取。用户明确要求时遵循指令。
【研究整合】附件内容应作为研究背景参考，整合到后续工具的 instruction 中。
</附件使用规则>`
    : `<ATTACHMENT_RULES>
【Identify】When user messages contain [#N filename] markers (e.g., [#1 report.pdf]), the user has uploaded reference files.
【Read】Use the fetchAttachmentFile tool to read content on demand: use head_tail mode to preview first, then full mode for complete content.
【No redundant reads】Don't re-read files already read in full. Follow user instructions when they explicitly request a re-read.
【Integrate】Use attachment content as research background and integrate into subsequent tool instructions.
</ATTACHMENT_RULES>`;
