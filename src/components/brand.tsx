import { Layers2 } from "lucide-react";

export function Brand({ large = false }: { large?: boolean }) {
  return (
    <span className={`brand ${large ? "brand-large" : ""}`} aria-label="Stash">
      <Layers2 aria-hidden="true" strokeWidth={1.8} />
      <span>
        stash<span className="brand-dot">.</span>
      </span>
    </span>
  );
}
