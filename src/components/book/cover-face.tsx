import type { CSSProperties } from "react";
import type { BackCover, Cover } from "@/lib/logbook/model";
import { RATIO } from "@/lib/logbook/model";

export function coverImageStyle(cover: Cover): CSSProperties {
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
  const text = cover.showText ? (
    <div className={`cover-type ${imageUrl ? "has-image" : "no-image"}`}>
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
    <div className={`cover-board cloth-${cover.cloth}`}>
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
      <span className="elastic" aria-hidden="true" />
      <span className="cover-spine-shade" aria-hidden="true" />
    </div>
  );
}

export function BackFace({ cover, back }: { cover: Cover; back?: BackCover }) {
  const cloth = !back || back.cloth === "same" ? cover.cloth : back.cloth;
  return (
    <div className={`cover-board cloth-${cloth} is-back`}>
      <div className="cover-weave" aria-hidden="true" />
      <div className="cover-type no-image back-type">
        <p className="cover-kicker">contraportada</p>
        <h1>{cover.title}</h1>
        {back?.note ? <p className="cover-sub">{back.note}</p> : null}
        <div className="cover-foot">
          {cover.author ? <span>{cover.author}</span> : <span />}
          {cover.date ? <span>{cover.date}</span> : null}
        </div>
      </div>
      <span className="elastic" aria-hidden="true" />
      <span className="cover-spine-shade" aria-hidden="true" />
    </div>
  );
}