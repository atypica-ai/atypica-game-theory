import { UIDataTypes, UIMessage } from "ai";
import { TNewStudyUITools } from "./tools/types";

export type TNewStudyMessageWithTool<
  TOOLS extends TNewStudyUITools = TNewStudyUITools,
  METADATA = unknown,
> = UIMessage<METADATA, UIDataTypes, TOOLS>;
