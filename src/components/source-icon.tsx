import { Globe2, Layers2, MessageCircle, Play, Camera } from "lucide-react";
import type { Platform } from "@/lib/database.types";

export function SourceIcon({ platform }: { platform: Platform | "all" }) {
  if (platform === "x") return <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M17.3 3H20l-6.1 7L21 21h-5.6l-4.4-6.7L5.2 21H2.5L9.7 13 3 3h5.7l4 6.1L17.3 3Zm-1 16h1.5L7.6 5H6.1l10.2 14Z" /></svg>;
  const Icon = { all: Layers2, youtube: Play, instagram: Camera, whatsapp: MessageCircle, website: Globe2 }[platform];
  return <Icon size={18} strokeWidth={1.7} aria-hidden="true" />;
}
