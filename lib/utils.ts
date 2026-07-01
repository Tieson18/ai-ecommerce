import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function formatPrice(
  amount: number | null | undefined,
  currency = "$",
): string {
  return `${currency}${(amount ?? 0).toFixed(2)}`;
}
