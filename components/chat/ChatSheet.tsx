"use client";

import { useChat } from "@ai-sdk/react";
import { useAuth } from "@clerk/nextjs";
import { DefaultChatTransport } from "ai";
import {
  AlertCircle,
  Bot,
  CircleStop,
  RefreshCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ShoppingUIMessage } from "@/lib/ai/shopping-agent";
import {
  useChatActions,
  useIsChatOpen,
  usePendingMessage,
} from "@/lib/store/chat-store-provider";

import {
  getMessageText,
  getToolParts,
  MessageBubble,
  ToolCallUI,
  WelcomeScreen,
} from "../chat";

export function ChatSheet() {
  const isOpen = useIsChatOpen();
  const { closeChat, clearPendingMessage } = useChatActions();
  const pendingMessage = usePendingMessage();
  const { isSignedIn } = useAuth();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatTransport = useMemo(
    () =>
      new DefaultChatTransport<ShoppingUIMessage>({
        api: "/api/chat",
        credentials: "same-origin",
      }),
    [],
  );

  const { messages, sendMessage, status, error, regenerate, stop, clearError } =
    useChat<ShoppingUIMessage>({
      transport: chatTransport,
      throttle: 50,
      onError: (error) => {
        console.error("[ChatSheet] Chat request failed:", error);
      },
    });
  const isBusy = status === "streaming" || status === "submitted";

  const sendPrompt = useCallback(
    (message: { text: string }) => {
      const text = message.text.trim();
      if (!text || isBusy) return;

      if (status === "error") {
        clearError();
      }

      void sendMessage({ text });
    },
    [clearError, isBusy, sendMessage, status],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when messages or busy state update during streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBusy]);

  useEffect(() => {
    if (isOpen && pendingMessage && !isBusy) {
      sendPrompt({ text: pendingMessage });
      clearPendingMessage();
    }
  }, [isOpen, pendingMessage, isBusy, sendPrompt, clearPendingMessage]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || isBusy) return;

      sendPrompt({ text });
      setInput("");
    },
    [input, isBusy, sendPrompt],
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - only visible on mobile/tablet (< xl) */}
      <div
        className="fixed inset-0 z-40 bg-black/50 xl:hidden"
        onClick={closeChat}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 z-50 flex h-full w-full flex-col border-l border-zinc-200 bg-white overscroll-contain dark:border-zinc-800 dark:bg-zinc-950 sm:w-[448px] animate-in slide-in-from-right duration-300">
        {/* Header */}
        <header className="shrink-0 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Shopping Assistant
            </div>
            <Button variant="ghost" size="icon" onClick={closeChat}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {messages.length === 0 ? (
            <WelcomeScreen
              onSuggestionClick={sendPrompt}
              isSignedIn={isSignedIn ?? false}
            />
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const content = getMessageText(message);
                const toolParts = getToolParts(message);
                const hasContent = content.length > 0;
                const hasTools = toolParts.length > 0;

                if (!hasContent && !hasTools) return null;

                return (
                  <div key={message.id} className="space-y-3">
                    {/* Tool call indicators */}
                    {hasTools &&
                      toolParts.map((toolPart) => (
                        <ToolCallUI
                          key={`tool-${message.id}-${toolPart.toolCallId}`}
                          toolPart={toolPart}
                          closeChat={closeChat}
                        />
                      ))}

                    {/* Message content */}
                    {hasContent && (
                      <MessageBubble
                        role={message.role}
                        content={content}
                        closeChat={closeChat}
                      />
                    )}
                  </div>
                );
              })}

              {/* Loading indicator */}
              {isBusy && messages[messages.length - 1]?.role === "user" && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <Bot className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-zinc-100 px-4 py-2 dark:bg-zinc-800">
                    <div className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="min-w-0 flex-1">
                Something went wrong. Please retry or send a new message.
              </p>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => void regenerate()}
                  aria-label="Retry response"
                >
                  <RefreshCcw className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={clearError}
                  aria-label="Dismiss error"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about our furniture..."
              disabled={isBusy}
              aria-invalid={error ? true : undefined}
              className="flex-1"
            />
            <Button
              type={isBusy ? "button" : "submit"}
              size="icon"
              onClick={isBusy ? () => void stop() : undefined}
              disabled={!isBusy && !input.trim()}
              aria-label={isBusy ? "Stop response" : "Send message"}
            >
              {isBusy ? (
                <CircleStop className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
