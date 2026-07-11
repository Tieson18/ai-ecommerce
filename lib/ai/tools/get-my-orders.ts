import "server-only";

import { tool } from "ai";
import { z } from "zod";
import {
  getOrderStatusEmoji,
  ORDER_STATUS_VALUES,
} from "@/lib/constants/orderStatus";
import { formatPrice } from "@/lib/utils";
import { sanityFetch } from "@/sanity/lib/live";
import { ORDERS_BY_USER_QUERY } from "@/sanity/queries/orders";
import type { ORDERS_BY_USER_QUERY_RESULT } from "@/sanity.types";

export interface OrderSummary {
  id: string;
  orderNumber: string | null;
  total: number | null;
  totalFormatted: string | null;
  status: string | null;
  statusDisplay: string;
  itemCount: number;
  itemNames: string[];
  itemImages: string[];
  createdAt: string | null;
  orderUrl: string;
}

export interface GetMyOrdersResult {
  found: boolean;
  message: string;
  orders: OrderSummary[];
  totalOrders: number;
  isAuthenticated: boolean;
  error?: string;
}

const getMyOrdersSchema = z.object({
  status: z
    .enum(["", ...ORDER_STATUS_VALUES])
    .optional()
    .default("")
    .describe("Filter orders by status (leave empty for all orders)"),
});

/**
 * Creates a getMyOrders tool bound to the current Clerk user.
 * Anonymous users receive a typed tool result instead of removing the tool from
 * the agent, which keeps the AI SDK UI stream schema stable.
 */
export function createGetMyOrdersTool(userId: string | null) {
  return tool({
    description:
      "Get the current user's orders. Can optionally filter by order status. Only works for authenticated users.",
    inputSchema: getMyOrdersSchema,
    execute: async ({ status }) => {
      if (!userId) {
        return {
          found: false,
          message:
            "To check your orders, you'll need to sign in first. Click the user icon in the top right to sign in or create an account.",
          orders: [],
          totalOrders: 0,
          isAuthenticated: false,
        } satisfies GetMyOrdersResult;
      }

      console.log("[GetMyOrders] Fetching orders for user:", userId, {
        status,
      });

      try {
        const { data: orders } = await sanityFetch({
          query: ORDERS_BY_USER_QUERY,
          params: { clerkUserId: userId },
        });

        console.log("[GetMyOrders] Orders found:", orders.length);

        // Filter by status if provided
        let filteredOrders = orders as ORDERS_BY_USER_QUERY_RESULT;
        if (status) {
          filteredOrders = filteredOrders.filter(
            (order) => order.status === status,
          );
        }

        if (filteredOrders.length === 0) {
          return {
            found: false,
            message: status
              ? `No orders found with status "${status}".`
              : "You don't have any orders yet.",
            orders: [],
            totalOrders: 0,
            isAuthenticated: true,
          } satisfies GetMyOrdersResult;
        }

        const formattedOrders: OrderSummary[] = filteredOrders.map((order) => ({
          id: order._id,
          orderNumber: order.orderNumber,
          total: order.total,
          totalFormatted: order.total ? formatPrice(order.total) : null,
          status: order.status,
          statusDisplay: getOrderStatusEmoji(order.status),
          itemCount: order.itemCount ?? 0,
          itemNames: (order.itemNames ?? []).filter(
            (name): name is string => name !== null,
          ),
          itemImages: (order.itemImages ?? []).filter(
            (url): url is string => url !== null,
          ),
          createdAt: order.createdAt,
          orderUrl: `/orders/${order._id}`,
        }));

        return {
          found: true,
          message: `Found ${filteredOrders.length} order${filteredOrders.length === 1 ? "" : "s"}.`,
          orders: formattedOrders,
          totalOrders: filteredOrders.length,
          isAuthenticated: true,
        } satisfies GetMyOrdersResult;
      } catch (error) {
        console.error("[GetMyOrders] Error:", error);
        return {
          found: false,
          message: "An error occurred while fetching your orders.",
          orders: [],
          totalOrders: 0,
          isAuthenticated: true,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  });
}
