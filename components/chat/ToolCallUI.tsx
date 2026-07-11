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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getToolName(toolPart: ToolCallPart): string {
  if (toolPart.type === "dynamic-tool") {
    return toolPart.toolName;
  }

  return toolPart.type.replace("tool-", "");
}

function getToolInput(toolPart: ToolCallPart): unknown {
  return "input" in toolPart ? toolPart.input : undefined;
}

function getToolOutput(toolPart: ToolCallPart): unknown {
  return "output" in toolPart ? toolPart.output : undefined;
}

function getToolErrorText(toolPart: ToolCallPart): string | undefined {
  if (!("errorText" in toolPart)) {
    return undefined;
  }

  return typeof toolPart.errorText === "string"
    ? toolPart.errorText
    : undefined;
}

function getStringField(value: unknown, field: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const fieldValue = value[field];
  return typeof fieldValue === "string" && fieldValue.length > 0
    ? fieldValue
    : undefined;
}

function isSearchProductsResult(value: unknown): value is SearchProductsResult {
  return (
    isRecord(value) &&
    typeof value.found === "boolean" &&
    Array.isArray(value.products)
  );
}

function isGetMyOrdersResult(value: unknown): value is GetMyOrdersResult {
  return (
    isRecord(value) &&
    typeof value.found === "boolean" &&
    Array.isArray(value.orders) &&
    typeof value.isAuthenticated === "boolean"
  );
}

export function ToolCallUI({ toolPart, closeChat }: ToolCallUIProps) {
  const toolName = getToolName(toolPart);
  const displayName = getToolDisplayName(toolName);
  const input = getToolInput(toolPart);
  const output = getToolOutput(toolPart);
  const errorText = getToolErrorText(toolPart);

  const isComplete =
    toolPart.state === "output-available" ||
    toolPart.state === "output-error" ||
    output !== undefined;
  const hasError = toolPart.state === "output-error" || errorText !== undefined;

  const searchQuery =
    toolName === "searchProducts" ? getStringField(input, "query") : undefined;

  const orderStatus =
    toolName === "getMyOrders" ? getStringField(input, "status") : undefined;

  const productResult = isSearchProductsResult(output) ? output : undefined;
  const orderResult = isGetMyOrdersResult(output) ? output : undefined;

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
            hasError
              ? "bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-800"
              : isComplete
                ? "bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                : "bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
          }`}
        >
          {hasError ? (
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          ) : isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <Loader2 className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-spin shrink-0" />
          )}
          <div className="flex flex-col">
            <span
              className={`font-medium ${
                hasError
                  ? "text-red-700 dark:text-red-300"
                  : isComplete
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-amber-700 dark:text-amber-300"
              }`}
            >
              {hasError
                ? `${displayName} failed`
                : isComplete
                  ? `${displayName} complete`
                  : `${displayName}...`}
            </span>
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
            {errorText && (
              <span className="text-xs text-red-600 dark:text-red-400">
                {errorText}
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
