import { getToolName } from "ai";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Package,
  Search,
} from "lucide-react";
import type { GetMyOrdersResult } from "@/lib/ai/tools/get-my-orders";
import type { SearchProductsResult } from "@/lib/ai/types";
import { OrderCardWidget } from "./OrderCardWidget";
import { ProductCardWidget } from "./ProductCardWidget";
import type { ToolCallPart } from "./types";
import { getToolDisplayName } from "./utils";

interface ToolCallUIProps {
  toolPart: ToolCallPart;
  closeChat: () => void;
}

function getInputValue(input: unknown, key: string): string | undefined {
  if (typeof input !== "object" || input === null) {
    return undefined;
  }

  const value = (input as Record<string, unknown>)[key];
  return value === undefined || value === null || value === ""
    ? undefined
    : String(value);
}

export function ToolCallUI({ toolPart, closeChat }: ToolCallUIProps) {
  const toolName = getToolName(toolPart);
  const displayName = getToolDisplayName(toolName);

  const toolStatus = (() => {
    switch (toolPart.state) {
      case "output-available":
        return {
          label: `${displayName} complete`,
          tone: "success" as const,
        };
      case "output-error":
        return {
          detail: toolPart.errorText,
          label: `${displayName} failed`,
          tone: "error" as const,
        };
      case "output-denied":
        return {
          detail: "This tool call was denied.",
          label: `${displayName} denied`,
          tone: "error" as const,
        };
      case "approval-requested":
        return {
          label: `${displayName} needs approval`,
          tone: "loading" as const,
        };
      case "approval-responded":
      case "input-available":
      case "input-streaming":
        return {
          label: `${displayName}...`,
          tone: "loading" as const,
        };
    }
  })();

  const isComplete = toolStatus.tone === "success";
  const isError = toolStatus.tone === "error";

  const searchQuery =
    toolName === "searchProducts"
      ? getInputValue(toolPart.input, "query")
      : undefined;

  const orderStatus =
    toolName === "getMyOrders"
      ? getInputValue(toolPart.input, "status")
      : undefined;

  // Get results based on tool type
  const result =
    toolPart.state === "output-available" ? toolPart.output : undefined;
  const productResult = result as SearchProductsResult | undefined;
  const orderResult = result as GetMyOrdersResult | undefined;

  const hasProducts =
    toolName === "searchProducts" &&
    productResult?.found &&
    productResult.products &&
    productResult.products.length > 0;

  const hasOrders =
    toolName === "getMyOrders" &&
    orderResult?.found &&
    orderResult.orders &&
    orderResult.orders.length > 0;

  // Determine icon based on tool type
  const ToolIcon = toolName === "getMyOrders" ? Package : Search;

  return (
    <div className="space-y-2">
      {/* Tool status indicator */}
      <div className="flex gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <ToolIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div
          className={`flex items-center gap-3 rounded-xl px-4 py-2 text-sm ${
            isComplete
              ? "bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
              : isError
                ? "bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900/50"
                : "bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
          }`}
        >
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : isError ? (
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          ) : (
            <Loader2 className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
          )}
          <div className="flex flex-col">
            <span
              className={`font-medium ${
                isComplete
                  ? "text-emerald-700 dark:text-emerald-300"
                  : isError
                    ? "text-red-700 dark:text-red-300"
                    : "text-amber-700 dark:text-amber-300"
              }`}
            >
              {toolStatus.label}
            </span>
            {toolStatus.detail && (
              <span className="text-xs text-red-600 dark:text-red-300">
                {toolStatus.detail}
              </span>
            )}
            {searchQuery && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Query: &quot;{searchQuery}&quot;
              </span>
            )}
            {orderStatus && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Filter: {orderStatus}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Product results */}
      {hasProducts && productResult?.products && (
        <div className="ml-11 mt-2">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            {productResult.products.length} product
            {productResult.products.length !== 1 ? "s" : ""} found
          </p>
          <div className="space-y-2">
            {productResult.products.map((product) => (
              <ProductCardWidget
                key={product.id}
                product={product}
                onClose={closeChat}
              />
            ))}
          </div>
        </div>
      )}

      {/* Order results */}
      {hasOrders && orderResult?.orders && (
        <div className="ml-11 mt-2">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            {orderResult.orders.length} order
            {orderResult.orders.length !== 1 ? "s" : ""} found
          </p>
          <div className="space-y-2">
            {orderResult.orders.map((order) => (
              <OrderCardWidget
                key={order.id}
                order={order}
                onClose={closeChat}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
