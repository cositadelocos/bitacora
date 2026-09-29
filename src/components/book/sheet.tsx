import { useMemo } from "react";
import type { ReactNode } from "react";
import type { Tone } from "@/lib/logbook/model";

function stains(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return [0, 1, 2].map((i) => {
    const n = (h >>> (i * 5)) >>> 0;
    return {
      left: 8 + (n % 72),
      top: 6 + ((n >> 3) % 74),
      size: 18 + (n % 22),
      opacity: 0.035 + (n % 4) * 0.012,
    };
  });
}

export function Sheet({
  tone = "ivory",
  seed = "page",
  quiet = false,
  className,
  children,
}: {
  tone?: Tone;
  seed?: string;
  quiet?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const spots = useMemo(() => (quiet ? [] : stains(seed)), [quiet, seed]);
  return (
    <div className={`sheet tone-${tone}${className ? ` ${className}` : ""}`}>
      <div className="sheet-fiber" aria-hidden="true" />
      {spots.map((spot, index) => (
        <span
          key={index}
          className="sheet-spot"
          style={{
            left: `${spot.left}%`,
            top: `${spot.top}%`,
            width: `${spot.size}%`,
            height: `${spot.size * 0.72}%`,
            opacity: spot.opacity,
          }}
        />
      ))}
      <div className="sheet-content">{children}</div>
    </div>
  );
}
