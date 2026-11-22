import { Globe2, Layers2 } from "lucide-react";
import type { Platform } from "@/lib/database.types";

export function SourceIcon({ platform }: { platform: Platform | "all" }) {
  if (platform === "youtube")
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <rect x="1" y="4" width="22" height="16" rx="5" fill="#ff0033" />
        <path d="m10 8 6 4-6 4Z" fill="white" />
      </svg>
    );
  if (platform === "instagram")
    return (
      <svg
        viewBox="0 0 24 24"
        width="21"
        height="21"
        aria-hidden="true"
        className="instagram-logo"
      >
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle
          cx="12"
          cy="12"
          r="4.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="17.6" cy="6.5" r="1.2" fill="currentColor" />
      </svg>
    );
  if (platform === "x")
    return (
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
        fill="currentColor"
      >
        <path d="M17.3 3H20l-6.1 7L21 21h-5.6l-4.4-6.7L5.2 21H2.5L9.7 13 3 3h5.7l4 6.1L17.3 3Zm-1 16h1.5L7.6 5H6.1l10.2 14Z" />
      </svg>
    );
  const Icon = platform === "all" ? Layers2 : Globe2;
  return <Icon size={18} strokeWidth={1.7} aria-hidden="true" />;
}
