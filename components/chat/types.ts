import type { DynamicToolUIPart, UIMessage } from "ai";

export type ToolCallPart =
  | Extract<UIMessage["parts"][number], { type: `tool-${string}` }>
  | DynamicToolUIPart;
