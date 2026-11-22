"use client";

import { useState, useTransition } from "react";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { useClientReady } from "@/lib/use-client-ready";
import { api } from "@/lib/client-api";

export function AccountMenu({ email }: { email: string }) {
  const ready = useClientReady();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  return (
    <div className="account-wrapper">
      <Menu.Root>
        <Menu.Trigger
          className="account-trigger"
          aria-label="Account menu"
          disabled={pending || !ready}
        >
          <span className="avatar">
            <UserRound size={17} aria-hidden="true" />
          </span>
          <span className="account-name" title={email}>
            {pending ? "Signing out…" : email}
          </span>
          <ChevronDown
            className="account-chevron"
            size={14}
            aria-hidden="true"
          />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner
            sideOffset={8}
            align="end"
            className="menu-positioner"
          >
            <Menu.Popup className="menu-popup">
              <div className="menu-email">{email}</div>
              <Menu.Item
                className="menu-item"
                onClick={() =>
                  startTransition(async () => {
                    try {
                      await api("/api/auth/logout", { method: "POST" });
                      window.location.replace("/sign-in");
                    } catch (error) {
                      setError(
                        error instanceof Error
                          ? error.message
                          : "Couldn’t sign out.",
                      );
                    }
                  })
                }
              >
                <LogOut size={16} aria-hidden="true" />
                Sign out
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {error && (
        <p className="error-message account-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
