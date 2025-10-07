import { UIDataTypes, UIMessage } from "ai";
import { TNewStudyUITools } from "./tools/types";

export type TNewStudyMessageWithTool = UIMessage<unknown, UIDataTypes, TNewStudyUITools>;
