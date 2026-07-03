import { ClerkProvider } from "@clerk/nextjs";
import type React from "react";
import { CartSheet } from "@/components/CartSheet";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import { CartStoreProvider } from "@/lib/store/cart-store-provider";
import { ChatStoreProvider } from "@/lib/store/chat-store-provider";
import { SanityLive } from "@/sanity/lib/live";

const layout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <CartStoreProvider>
      <ChatStoreProvider>
        <Header />
        <main>{children}</main>
        <CartSheet />
        <Toaster position="bottom-center" />
        <SanityLive />
      </ChatStoreProvider>
    </CartStoreProvider>
  );
};

export default layout;
