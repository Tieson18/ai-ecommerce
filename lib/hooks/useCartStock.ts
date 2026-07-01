"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isOutOfStock as checkIsOutOfStock } from "@/lib/constants/stock";
import type { CartItem } from "@/lib/store/cart-store";
import { client } from "@/sanity/lib/client";
import { PRODUCTS_BY_IDS_QUERY } from "@/sanity/queries/products";
import type { PRODUCTS_BY_IDS_QUERY_RESULT } from "@/sanity.types";

export interface StockInfo {
  productId: string;
  currentStock: number;
  isOutOfStock: boolean;
  exceedsStock: boolean;
  availableQuantity: number;
}

export type StockMap = Map<string, StockInfo>;

interface UseCartStockReturn {
  stockMap: StockMap;
  isLoading: boolean;
  hasStockIssues: boolean;
  refetch: () => void;
}

/**
 * Fetches current stock levels for cart items
 * Returns stock info map and loading state
 */
export function useCartStock(items: CartItem[]): UseCartStockReturn {
  const [products, setProducts] = useState<PRODUCTS_BY_IDS_QUERY_RESULT>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [loadedProductIdsKey, setLoadedProductIdsKey] = useState("");
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(false);

  const productIdsKey = useMemo(
    () =>
      JSON.stringify(
        Array.from(new Set(items.map((item) => item.productId))).sort(),
      ),
    [items],
  );
  const productIds = useMemo(
    () => JSON.parse(productIdsKey) as string[],
    [productIdsKey],
  );

  const fetchStock = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (productIds.length === 0) {
      setProducts([]);
      setLoadedProductIdsKey(productIdsKey);
      setIsFetching(false);
      return;
    }

    setIsFetching(true);

    try {
      const latestProducts = await client.fetch<PRODUCTS_BY_IDS_QUERY_RESULT>(
        PRODUCTS_BY_IDS_QUERY,
        { ids: productIds },
        { useCdn: false },
      );

      if (isMountedRef.current && requestIdRef.current === requestId) {
        setProducts(latestProducts);
        setLoadedProductIdsKey(productIdsKey);
      }
    } catch (error) {
      console.error("Failed to fetch stock:", error);
      if (isMountedRef.current && requestIdRef.current === requestId) {
        setProducts([]);
        setLoadedProductIdsKey(productIdsKey);
      }
    } finally {
      if (isMountedRef.current && requestIdRef.current === requestId) {
        setIsFetching(false);
      }
    }
  }, [productIds, productIdsKey]);

  useEffect(() => {
    isMountedRef.current = true;
    void fetchStock();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchStock]);

  const isLoading =
    productIds.length > 0 &&
    (isFetching || loadedProductIdsKey !== productIdsKey);

  const stockMap = useMemo<StockMap>(() => {
    const productsById = new Map(
      products.map((product) => [product._id, product]),
    );

    return new Map(
      items.map((item) => {
        const product = productsById.get(item.productId);
        const currentStock = Math.max(product?.stock ?? 0, 0);

        return [
          item.productId,
          {
            productId: item.productId,
            currentStock,
            isOutOfStock: checkIsOutOfStock(currentStock),
            exceedsStock: item.quantity > currentStock,
            availableQuantity: Math.min(item.quantity, currentStock),
          },
        ];
      }),
    );
  }, [items, products]);

  const hasStockIssues = useMemo(
    () =>
      Array.from(stockMap.values()).some(
        (info) => info.isOutOfStock || info.exceedsStock,
      ),
    [stockMap],
  );

  return {
    stockMap,
    isLoading,
    hasStockIssues,
    refetch: fetchStock,
  };
}
