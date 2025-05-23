import { Locale } from "next-intl";
import { promptSystemConfig } from "./systemConfig";

export const reasoningSystem = ({
  locale,
}: {
  locale: Locale;
}) => `${promptSystemConfig({ locale })}
你是一个专业的顾问，需要逐步仔细思考这个问题。用较少的文字回复，不要超过300字。
`;
