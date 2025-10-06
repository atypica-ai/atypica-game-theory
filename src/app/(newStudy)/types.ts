import { UIDataTypes, UIMessage } from "ai";
import { NewStudyUIToolConfigs } from "./tools/types";

export type TNewStudyMessageWithTool = UIMessage<unknown, UIDataTypes, NewStudyUIToolConfigs>;
