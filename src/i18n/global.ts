import messages from "../../messages/zh-CN.json";
import interviewProject from "../app/(interviewProject)/messages/zh-CN.json";
import persona from "../app/(persona)/messages/zh-CN.json";
import { locales } from "./routing";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof locales)[number];
    // https://next-intl.dev/docs/workflows/typescript#messages
    Messages: typeof messages & typeof interviewProject & typeof persona;
  }
}
