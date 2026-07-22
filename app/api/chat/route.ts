import { auth } from "@clerk/nextjs/server";
import { createAgentUIStreamResponse, type UIMessage } from "ai";
import { createShoppingAgent } from "@/lib/ai/shopping-agent";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Malformed JSON request body." },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !Array.isArray((body as { messages?: unknown }).messages)
  ) {
    return Response.json(
      { error: "Request body must include a messages array." },
      { status: 400 },
    );
  }

  const { messages } = body as { messages: UIMessage[] };

  // Get the user's session - userId will be null if not authenticated
  const { userId } = await auth();

  // Create agent with user context (orders tool only available if authenticated)
  const agent = createShoppingAgent({ userId });

  return createAgentUIStreamResponse({
    agent,
    uiMessages: messages,
  });
}
