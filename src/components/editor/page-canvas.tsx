import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { LogElement, LogPage, Cover } from "@/lib/logbook/model";
import { elementStyle, fontStack, inkVar, RATIO } from "@/lib/logbook/model";
import { Sheet } from "@/components/book/sheet";
import { ElementBody } from "@/components/book/element-body";
import { CoverFace } from "@/components/book/cover-face";

type Drag =
  | { kind: "move"; id: string; dx: number; dy: number }
  | { kind: "resize"; id: string }
  | { kind: "rotate"; id: string; offset: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function PageCanvas({
  page,
  assets,
  selectedId,
  onSelect,
  onPatch,
  onGestureStart,
  onDropFiles,
  dropHot,
  onDragState,
}: {
  page: LogPage;
  assets: Record<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onPatch: (id: string, partial: Partial<LogElement>) => void;
  onGestureStart: () => void;
  onDropFiles: (files: File[]) => void;
  dropHot: boolean;
  onDragState: (hot: boolean) => void;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const recording = useRef(false);

  function units(event: { clientX: number; clientY: number }) {
    const rect = pageRef.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.width) * 100,
    };
  }

  function begin() {
    if (recording.current) return;
    recording.current = true;
    onGestureStart();
  }

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const current = drag.current;
      if (!current || !pageRef.current) return;
      const point = units(event);
      const el = page.elements.find((item) => item.id === current.id);
      if (!el) return;
      begin();
      if (current.kind === "move") {
        onPatch(el.id, {
          x: clamp(point.x - current.dx, -15, 115),
          y: clamp(point.y - current.dy, -15, 165),
        });
        return;
      }
      if (current.kind === "rotate") {
        const angle = (Math.atan2(point.y - el.y, point.x - el.x) * 180) / Math.PI;
        onPatch(el.id, { rotation: Math.round((angle - current.offset) * 10) / 10 });
        return;
      }
      const dx = point.x - el.x;
      const dy = point.y - el.y;
      const rad = (-el.rotation * Math.PI) / 180;
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
      let w = clamp(Math.abs(lx) * 2, 6, 130);
      let h = clamp(Math.abs(ly) * 2, 4, 160);
      if (el.type === "image" && el.naturalW && el.naturalH) {
        h = (w * el.naturalH) / el.naturalW;
      }
      onPatch(el.id, { w, h });
    };
    const up = () => {
      drag.current = null;
      recording.current = false;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [page.elements, onPatch, onGestureStart]);

  function startMove(event: ReactPointerEvent, el: LogElement) {
    event.stopPropagation();
    onSelect(el.id);
    const point = units(event);
    drag.current = { kind: "move", id: el.id, dx: point.x - el.x, dy: point.y - el.y };
  }

  const ordered = page.elements.slice().sort((a, b) => a.z - b.z);

  return (
    <div
      ref={pageRef}
      className={`canvas-page ${dropHot ? "is-drop" : ""}`}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest(".placed")) return;
        onSelect(null);
      }}
      onDragEnter={(event) => {
        if (![...event.dataTransfer.types].includes("Files")) return;
        event.preventDefault();
        onDragState(true);
      }}
      onDragOver={(event) => {
        if (![...event.dataTransfer.types].includes("Files")) return;
        event.preventDefault();
        onDragState(true);
      }}
      onDragLeave={() => onDragState(false)}
      onDrop={(event) => {
        event.preventDefault();
        onDragState(false);
        const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith("image/"));
        if (files.length) onDropFiles(files);
      }}
    >
      <Sheet tone={page.tone} seed={page.id}>
        {ordered.map((el) => {
          const selected = el.id === selectedId;
          return (
            <div
              key={el.id}
              className={`placed ${selected ? "is-selected" : ""}`}
              style={elementStyle(el)}
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).closest("textarea, button")) return;
                if (el.type === "text") {
                  onSelect(el.id);
                  return;
                }
                startMove(event, el);
              }}
            >
              {el.type === "text" && selected ? (
                <textarea
                  className={`page-text align-${el.align ?? "left"} ${el.bold ? "is-bold" : ""}`}
                  style={{
                    color: inkVar(el.color),
                    fontSize: `${el.fontSize ?? 5}cqw`,
                    fontFamily: fontStack(el.font),
                  }}
                  value={el.text ?? ""}
                  onFocus={() => {
                    if (!recording.current) {
                      recording.current = true;
                      onGestureStart();
                    }
                  }}
                  onBlur={() => {
                    recording.current = false;
                  }}
                  onChange={(event) => onPatch(el.id, { text: event.target.value.slice(0, 2000) })}
                  onPointerDown={(event) => event.stopPropagation()}
                />
              ) : (
                <ElementBody el={el} url={el.assetId ? assets[el.assetId] : undefined} pending />
              )}
              {selected ? (
                <>
                  <span className="sel-frame" />
                  <button
                    type="button"
                    className="grip"
                    aria-label="Mover"
                    onPointerDown={(event) => startMove(event, el)}
                  />
                  <button
                    type="button"
                    className="handle handle-rot"
                    aria-label="Rotar"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      const point = units(event);
                      const angle = (Math.atan2(point.y - el.y, point.x - el.x) * 180) / Math.PI;
                      drag.current = { kind: "rotate", id: el.id, offset: angle - el.rotation };
                    }}
                  />
                  <button
                    type="button"
                    className="handle handle-se"
                    aria-label="Escalar"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      drag.current = { kind: "resize", id: el.id };
                    }}
                  />
                </>
              ) : null}
            </div>
          );
        })}
      </Sheet>
      {dropHot ? <p className="drop-label">Soltar en la página</p> : null}
    </div>
  );
}

export function CoverCanvas({
  cover,
  imageUrl,
  onChange,
  onGestureStart,
  onDropFiles,
  dropHot,
  onDragState,
}: {
  cover: Cover;
  imageUrl?: string;
  onChange: (partial: Partial<Cover>) => void;
  onGestureStart: () => void;
  onDropFiles: (files: File[]) => void;
  dropHot: boolean;
  onDragState: (hot: boolean) => void;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const recording = useRef(false);
  const [selected, setSelected] = useState(Boolean(imageUrl));

  function units(event: { clientX: number; clientY: number }) {
    const rect = pageRef.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.width) * 100,
    };
  }

  function begin() {
    if (recording.current) return;
    recording.current = true;
    onGestureStart();
  }

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const current = drag.current;
      if (!current) return;
      const point = units(event);
      begin();
      if (current.kind === "move") {
        onChange({
          imgX: clamp(point.x - current.dx, -20, 120),
          imgY: clamp(point.y - current.dy, -20, 180),
        });
        return;
      }
      if (current.kind === "rotate") {
        const angle = (Math.atan2(point.y - cover.imgY, point.x - cover.imgX) * 180) / Math.PI;
        onChange({ imgRot: Math.round((angle - current.offset) * 10) / 10 });
        return;
      }
      const dx = point.x - cover.imgX;
      const dy = point.y - cover.imgY;
      const rad = (-cover.imgRot * Math.PI) / 180;
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const w = clamp(Math.abs(lx) * 2, 12, 150);
      const aspect = cover.imgW > 0 ? cover.imgH / cover.imgW : 1;
      onChange({ imgW: w, imgH: w * aspect });
    };
    const up = () => {
      drag.current = null;
      recording.current = false;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [cover.imgX, cover.imgY, cover.imgW, cover.imgH, cover.imgRot, onChange, onGestureStart]);

  return (
    <div
      ref={pageRef}
      className={`canvas-page is-cover is-editing ${dropHot ? "is-drop" : ""}`}
      style={{ aspectRatio: `1 / ${RATIO}` }}
      onPointerDown={() => setSelected(false)}
      onDragEnter={(event) => {
        if (![...event.dataTransfer.types].includes("Files")) return;
        event.preventDefault();
        onDragState(true);
      }}
      onDragOver={(event) => {
        if (![...event.dataTransfer.types].includes("Files")) return;
        event.preventDefault();
        onDragState(true);
      }}
      onDragLeave={() => onDragState(false)}
      onDrop={(event) => {
        event.preventDefault();
        onDragState(false);
        const files = [...event.dataTransfer.files].filter((file) => file.type.startsWith("image/"));
        if (files.length) onDropFiles(files);
      }}
    >
      <CoverFace cover={cover} imageUrl={imageUrl} />
      {imageUrl ? (
        <div
          className="cover-art-wrap is-hit"
          style={{
            left: `${cover.imgX}%`,
            top: `${cover.imgY / RATIO}%`,
            width: `${cover.imgW}%`,
            height: `${cover.imgH / RATIO}%`,
            transform: `translate(-50%, -50%) rotate(${cover.imgRot}deg)`,
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
            setSelected(true);
            const point = units(event);
            drag.current = { kind: "move", id: "cover", dx: point.x - cover.imgX, dy: point.y - cover.imgY };
          }}
        >
          {selected ? (
            <>
              <span className="sel-frame" />
              <button
                type="button"
                className="grip"
                aria-label="Mover ilustración"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  const point = units(event);
                  drag.current = { kind: "move", id: "cover", dx: point.x - cover.imgX, dy: point.y - cover.imgY };
                }}
              />
              <button
                type="button"
                className="handle handle-rot"
                aria-label="Rotar ilustración"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  const point = units(event);
                  const angle = (Math.atan2(point.y - cover.imgY, point.x - cover.imgX) * 180) / Math.PI;
                  drag.current = { kind: "rotate", id: "cover", offset: angle - cover.imgRot };
                }}
              />
              <button
                type="button"
                className="handle handle-se"
                aria-label="Escalar ilustración"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  drag.current = { kind: "resize", id: "cover" };
                }}
              />
            </>
          ) : null}
        </div>
      ) : null}
      {dropHot ? <p className="drop-label">Soltar en la portada</p> : null}
    </div>
  );
}
