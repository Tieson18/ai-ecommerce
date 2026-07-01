"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Package, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthControl() {
  return (
    <div className="flex min-h-9 items-center gap-2">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <Button variant="ghost" size="icon" className="sm:hidden">
            <User className="h-5 w-5" />
            <span className="sr-only">Sign in</span>
          </Button>
        </SignInButton>
        <SignInButton mode="modal">
          <Button variant="ghost" size="lg" className="hidden sm:inline-flex">
            Sign in
          </Button>
        </SignInButton>
        <SignUpButton mode="modal">
          <Button size="lg" className="hidden px-3 sm:inline-flex sm:px-4">
            Sign up
          </Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton
          afterSwitchSessionUrl="/"
          appearance={{
            elements: {
              avatarBox: "h-9 w-9",
            },
          }}
        >
          <UserButton.MenuItems>
            <UserButton.Link
              label="My Orders"
              labelIcon={<Package className="h-4 w-4" />}
              href="/orders"
            />
          </UserButton.MenuItems>
        </UserButton>
      </Show>
    </div>
  );
}
