import type { DecoKind, InkName } from "@/lib/logbook/model";
import { inkVar } from "@/lib/logbook/model";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function DecoGraphic({ kind, color }: { kind: DecoKind; color?: InkName }) {
  const style = { color: inkVar(color) };
  if (kind === "stain") {
    return (
      <div
        className="deco-stain"
        style={{
          background: `radial-gradient(ellipse at 45% 45%, color-mix(in srgb, ${inkVar(color)} 42%, transparent), transparent 70%)`,
        }}
      />
    );
  }
  if (kind === "postit") {
    return (
      <div className="deco-postit">
        <span />
      </div>
    );
  }
  if (kind === "swatches") {
    return (
      <div className="deco-swatches" aria-hidden="true">
        <i style={{ background: "var(--color-paper)" }} />
        <i style={{ background: "var(--color-olive)" }} />
        <i style={{ background: "var(--color-mustard)" }} />
        <i style={{ background: "var(--color-brick)" }} />
        <i style={{ background: "var(--color-brown)" }} />
        <i style={{ background: "var(--color-slate)" }} />
        <i style={{ background: "var(--color-ink)" }} />
      </div>
    );
  }
  return (
    <svg viewBox="0 0 80 80" className="deco-svg" style={style} aria-hidden="true">
      {kind === "arrow" && (
        <path {...stroke} d="M6 40 H62 M48 24 L66 40 L48 56" />
      )}
      {kind === "arrow-curve" && (
        <>
          <path {...stroke} d="M10 58 C18 58 16 18 46 22" />
          <path {...stroke} d="M34 12 L50 22 L36 32" />
        </>
      )}
      {kind === "circle" && (
        <path {...stroke} d="M40 10 C62 12 72 28 68 46 C64 66 46 74 28 68 C10 62 8 36 18 22 C24 14 32 9 40 10 Z" />
      )}
      {kind === "underline" && (
        <path {...stroke} d="M6 46 C18 38 22 54 34 46 C46 38 50 56 62 46 C70 40 74 44 76 42" />
      )}
      {kind === "scribble" && (
        <path {...stroke} d="M10 46 C18 20 28 64 40 36 C50 14 52 62 68 34" />
      )}
      {kind === "brush" && (
        <path
          d="M8 50 C22 18 30 62 48 28 C58 12 62 48 74 26"
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          opacity="0.8"
        />
      )}
      {kind === "leaf" && (
        <>
          <path {...stroke} d="M40 70 C40 70 18 48 22 28 C34 14 58 22 62 40 C52 58 40 70 40 70 Z" />
          <path {...stroke} d="M40 66 C40 48 46 36 58 28" />
        </>
      )}
      {kind === "sprig" && (
        <>
          <path {...stroke} d="M40 74 C38 52 36 36 28 14" />
          <path {...stroke} d="M36 58 C24 52 16 56 12 50 C22 46 32 50 36 58 Z" />
          <path {...stroke} d="M34 42 C22 32 20 24 26 16 C34 24 36 34 34 42 Z" />
          <path {...stroke} d="M32 28 C40 18 52 16 58 22 C48 28 38 30 32 28 Z" />
        </>
      )}
      {kind === "flower" && (
        <>
          <circle cx="40" cy="40" r="5" fill="currentColor" />
          <ellipse cx="40" cy="18" rx="7" ry="12" {...stroke} />
          <ellipse cx="40" cy="62" rx="7" ry="12" {...stroke} />
          <ellipse cx="18" cy="40" rx="12" ry="7" {...stroke} />
          <ellipse cx="62" cy="40" rx="12" ry="7" {...stroke} />
        </>
      )}
      {kind === "clip" && (
        <path
          {...stroke}
          d="M30 18 H46 C54 18 58 24 58 32 V52 C58 64 50 70 40 70 C30 70 24 64 24 54 V28 C24 22 28 18 34 18 C40 18 44 22 44 28 V52"
        />
      )}
      {kind === "dots" && (
        <>
          <circle cx="18" cy="40" r="3.2" fill="currentColor" />
          <circle cx="40" cy="40" r="3.2" fill="currentColor" />
          <circle cx="62" cy="40" r="3.2" fill="currentColor" />
        </>
      )}
      {kind === "loop" && (
        <>
          <path {...stroke} d="M24 46 A16 16 0 1 1 40 56" />
          <path {...stroke} d="M34 48 L40 58 L48 50" />
        </>
      )}
    </svg>
  );
}
