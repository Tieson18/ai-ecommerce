import {
  isDynamicToolUIPart,
  isToolUIPart,
  type TextUIPart,
  type UIMessage,
} from "ai";
import type { ToolCallPart } from "./types";

export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is TextUIPart => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

export function getToolParts(message: UIMessage): ToolCallPart[] {
  return message.parts.filter(
    (part): part is ToolCallPart =>
      isToolUIPart(part) || isDynamicToolUIPart(part),
  );
}

export function getToolDisplayName(toolName: string): string {
  const toolNames: Record<string, string> = {
    searchProducts: "Searching products",
    getMyOrders: "Getting your orders",
  };
  return toolNames[toolName] || toolName;
}
