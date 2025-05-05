import { getDeployRegion } from "@/lib/deployRegion";

export const promptSystemConfig = () => `<system_config>
DefaultLanguage: ${getDeployRegion() === "mainland" ? "简体中文" : "English"}
CurrentTime: ${new Date().toISOString()}
</system_config>
`;
