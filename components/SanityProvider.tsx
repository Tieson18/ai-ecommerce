"use client";
import { SanityApp } from "@sanity/sdk-react";
import React from "react";

const SanityProvider = ({ children }: { children: React.ReactNode }) => {
  const config = {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION,
    useCdn: true,
  };
  return (
    <SanityApp config={config} fallback={<div>Loading</div>}>
      {children}
    </SanityApp>
  );
};

export default SanityProvider;
