import { SanityLive } from "@/sanity/lib/live";
import { ClerkProvider } from "@clerk/nextjs";
import React from "react";

const layout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <main>
      <ClerkProvider>{children}</ClerkProvider>
      <SanityLive />
    </main>
  );
};

export default layout;
