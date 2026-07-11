import { auth } from "@clerk/nextjs/server";
import { createAgentUIStreamResponse } from "ai";
import { createShoppingAgent } from "@/lib/ai/shopping-agent";

export const runtime = "nodejs";
export const maxDuration = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  if (!process.env.AI_GATEWAY_API_KEY) {
    console.error("[Chat] Missing AI_GATEWAY_API_KEY");
    return Response.json(
      { error: "AI provider is not configured." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    console.error("[Chat] Invalid JSON body:", error);
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isRecord(body) || !Array.isArray(body.messages)) {
    return Response.json(
      { error: "Request body must include a messages array." },
      { status: 400 },
    );
  }

  const { userId } = await auth();
  const agent = createShoppingAgent({ userId });

  try {
    return await createAgentUIStreamResponse({
      agent,
      uiMessages: body.messages,
      onError: (error) => {
        console.error("[Chat] Stream error:", error);
        return "The shopping assistant had trouble responding. Please try again.";
      },
    });
  } catch (error) {
    console.error("[Chat] Failed to create response:", error);
    return Response.json(
      { error: "Failed to start the chat response." },
      { status: 500 },
    );
  }
}
