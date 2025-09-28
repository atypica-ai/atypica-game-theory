import { Locale } from "next-intl";

/**
 * 为了使用 prompt cache，需要在 1h 内固定 system prompt，这里当前时间只精确到日期
 */
export const promptSystemConfig = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `<system_config>
语言: 简体中文（**必须**全程使用**简体中文**回复）
当前时间: ${new Date().toISOString().slice(0, 10)}
</system_config>
`
    : `<system_config>
Language: English (You **must** use **English** throughout your response)
Current time: ${new Date().toISOString().slice(0, 10)}
</system_config>
`;
