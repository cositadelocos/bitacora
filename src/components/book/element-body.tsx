import type { LogElement } from "@/lib/logbook/model";
import { fontStack, inkVar } from "@/lib/logbook/model";
import { DecoGraphic } from "@/components/book/decorations";

export function ElementBody({
  el,
  url,
  pending = false,
}: {
  el: LogElement;
  url?: string;
  pending?: boolean;
}) {
  if (el.type === "image") {
    const look = el.look;
    const fade = look?.fade ?? 0;
    const filter = [
      fade > 0 ? `grayscale(${fade})` : "",
      look?.scan ? "contrast(1.06) saturate(0.88)" : "",
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <div
        className={[
          "img-plate",
          look?.shadow ? "look-shadow" : "",
          look?.frame ? "look-frame" : "",
          look?.torn ? "look-torn" : "",
          look?.scan ? "look-scan" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {url ? (
          <img src={url} alt="" draggable={false} style={filter ? { filter } : undefined} />
        ) : pending ? (
          <span className="img-pending">cargando</span>
        ) : null}
      </div>
    );
  }
  if (el.type === "text") {
    return (
      <p
        className={`page-text align-${el.align ?? "left"} ${el.bold ? "is-bold" : ""}`}
        style={{
          color: inkVar(el.color),
          fontSize: `${el.fontSize ?? 5}cqw`,
          fontFamily: fontStack(el.font),
          fontWeight: el.bold ? 600 : 500,
          lineHeight: el.font === "fraunces" || el.font === "libre" || el.font === "cormorant" ? 1.3 : 1.15,
        }}
      >
        {el.text}
      </p>
    );
  }
  if (el.type === "tape") {
    return <div className={`tape tape-${el.tape ?? "masking"}`} />;
  }
  return <DecoGraphic kind={el.deco ?? "arrow"} color={el.color} />;
}
