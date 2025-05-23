import { Locale } from "next-intl";

export const promptSystemConfig = ({ locale }: { locale: Locale }) =>
  locale === "zh-CN"
    ? `<system_config>
语言: 简体中文（**必须**全程使用**简体中文**回复）
当前时间: ${new Date().toISOString()}
</system_config>
`
    : `<system_config>
Language: English (You **must** use **English** throughout your response)
Current time: ${new Date().toISOString()}
</system_config>
`;
