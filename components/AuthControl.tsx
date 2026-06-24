"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export default function AuthControl() {
  return (
    <div className="flex min-h-10 items-center gap-3">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            className="h-10 rounded-full border border-black/8 px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:text-zinc-50 dark:hover:bg-[#1a1a1a]"
          >
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="h-10 rounded-full bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Sign up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </div>
  );
}
