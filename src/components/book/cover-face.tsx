import type { CSSProperties } from "react";
import type { BackCover, Cover } from "@/lib/logbook/model";
import { RATIO, inkVar } from "@/lib/logbook/model";

export function coverImageStyle(cover: {
  imgX?: number;
  imgY?: number;
  imgW?: number;
  imgH?: number;
  imgRot?: number;
}): CSSProperties {
  const x = cover.imgX ?? 50;
  const y = cover.imgY ?? 46;
  const w = cover.imgW ?? 68;
  const h = cover.imgH ?? 78;
  const rot = cover.imgRot ?? -1.2;
  return {
    left: `${x}%`,
    top: `${y / RATIO}%`,
    width: `${w}%`,
    height: `${h / RATIO}%`,
    transform: `translate(-50%, -50%) rotate(${rot}deg)`,
  };
}

export function CoverFace({ cover, imageUrl }: { cover: Cover; imageUrl?: string }) {
  const placed = cover.textX != null && cover.textY != null;
  const band = cover.band ?? "cord";
  const text = cover.showText ? (
    <div
      className={`cover-type ${imageUrl ? "has-image" : "no-image"} ${placed ? "is-placed" : ""}`}
      style={{
        ["--ts" as string]: cover.textScale ?? 1,
        color: cover.textInk ? inkVar(cover.textInk) : undefined,
        ...(placed
          ? {
              left: `${cover.textX}%`,
              top: `${(cover.textY ?? 0) / RATIO}%`,
              right: "auto",
              bottom: "auto",
              width: band === "plain" ? "82%" : "72%",
            }
          : null),
      }}
    >
      {cover.note ? <p className="cover-kicker">{cover.note}</p> : null}
      <h1>{cover.title}</h1>
      {cover.subtitle ? <p className="cover-sub">{cover.subtitle}</p> : null}
      <div className="cover-foot">
        {cover.author ? <span>{cover.author}</span> : <span />}
        {cover.date ? <span>{cover.date}</span> : null}
      </div>
    </div>
  ) : null;

  return (
    <div className={`cover-board cloth-${cover.cloth} ${band === "plain" ? "" : "has-band"}`}>
      <div className="cover-weave" aria-hidden="true" />
      {imageUrl ? (
        <img
          className={`cover-art ${cover.imageFit === "plate" ? "is-plate" : "is-full"}`}
          src={imageUrl}
          alt=""
          draggable={false}
          style={coverImageStyle(cover)}
        />
      ) : null}
      {text}
      {band !== "plain" ? <span className={`band band-${band}`} aria-hidden="true" /> : null}
      <span className="cover-spine-shade" aria-hidden="true" />
    </div>
  );
}

export function BackFace({ cover, back, imageUrl }: { cover: Cover; back?: BackCover; imageUrl?: string }) {
  const cloth = !back || back.cloth === "same" ? cover.cloth : back.cloth;
  const note = back?.note?.trim() ?? "";
  const band = cover.band ?? "cord";
  const placed = back?.textX != null && back?.textY != null;
  return (
    <div className={`cover-board cloth-${cloth} is-back ${band === "plain" ? "" : "has-band"}`}>
      <div className="cover-weave" aria-hidden="true" />
      {imageUrl && back ? (
        <img className="cover-art is-plate" src={imageUrl} alt="" draggable={false} style={coverImageStyle(back)} />
      ) : null}
      {note ? (
        <p
          className={`back-note ${placed ? "is-placed" : ""}`}
          style={{
            ["--ts" as string]: back?.textScale ?? 1,
            color: back?.textInk ? inkVar(back.textInk) : undefined,
            ...(placed
              ? {
                  left: `${back?.textX}%`,
                  top: `${(back?.textY ?? 0) / RATIO}%`,
                  right: "auto",
                  width: "68%",
                }
              : null),
          }}
        >
          {note}
        </p>
      ) : null}
      {band !== "plain" ? <span className={`band band-${band}`} aria-hidden="true" /> : null}
      <span className="cover-spine-shade" aria-hidden="true" />
    </div>
  );
}