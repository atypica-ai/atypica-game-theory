import messages from "../../messages/zh-CN.json";
import { VALID_LOCALES } from "./routing";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof VALID_LOCALES)[number];
    Messages: typeof messages;
  }
}
