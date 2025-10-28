import messages from "../../messages/zh-CN.json";
import authMessages from "../app/(auth)/messages/zh-CN.json";
import interviewProjectMessages from "../app/(interviewProject)/messages/zh-CN.json";
import personaMessages from "../app/(persona)/messages/zh-CN.json";
import publicMessages from "../app/(public)/messages/zh-CN.json";
import sageMessages from "../app/(sage)/messages/zh-CN.json";
import studyMessages from "../app/(study)/messages/zh-CN.json";
import accountMessages from "../app/account/messages/zh-CN.json";
import teamMessages from "../app/team/messages/zh-CN.json";
import { VALID_LOCALES } from "./routing";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof VALID_LOCALES)[number];
    // https://next-intl.dev/docs/workflows/typescript#messages
    Messages: typeof messages &
      typeof authMessages &
      typeof interviewProjectMessages &
      typeof personaMessages &
      typeof sageMessages &
      typeof studyMessages &
      typeof publicMessages &
      typeof accountMessages &
      typeof teamMessages;
  }
}
