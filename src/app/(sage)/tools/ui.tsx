import { TSageMessageWithTool } from "@/app/(sage)/types";

export function SageToolUIPartDisplay({}: { toolUIPart: TSageMessageWithTool["parts"][number] }) {
  // Currently no special tools for sage chat
  // If we add tools in the future, handle them here
  return null;
}
