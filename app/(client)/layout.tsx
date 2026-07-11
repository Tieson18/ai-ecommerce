import { ClerkProvider } from "@clerk/nextjs";
import type React from "react";
import { CartSheet } from "@/components/CartSheet";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import { CartStoreProvider } from "@/lib/store/cart-store-provider";
import { ChatStoreProvider } from "@/lib/store/chat-store-provider";
import { SanityLive } from "@/sanity/lib/live";
import { ChatSheet } from "../../components/chat/ChatSheet";
import { AppShell } from "@/components/AppShell";

const layout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <CartStoreProvider>
      <ChatStoreProvider>
        <AppShell>
          <Header />
          <main>{children}</main>
        </AppShell>
        <CartSheet />
        <ChatSheet />
        <Toaster position="bottom-center" />
        <SanityLive />
      </ChatStoreProvider>
    </CartStoreProvider>
  );
};

export default layout;
