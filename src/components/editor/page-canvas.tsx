import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { LogElement, LogPage, Cover, BackCover, Guide } from "@/lib/logbook/model";
import { elementStyle, fontStack, inkVar, RATIO } from "@/lib/logbook/model";
import { Sheet } from "@/components/book/sheet";
import { ElementBody } from "@/components/book/element-body";
import { CoverFace, BackFace } from "@/components/book/cover-face";

type Drag =
  | { kind: "move"; ids: string[]; origins: Record<string, { x: number; y: number }>; start: { x: number; y: number } }
  | { kind: "resize"; id: string }
  | { kind: "rotate"; id: string; offset: number };

type CoverDrag =
  | { kind: "move"; dx: number; dy: number }
  | { kind: "text"; dx: number; dy: number }
  | { kind: "resize" }
  | { kind: "rotate"; offset: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function PageCanvas({
  page,
  assets,
  selectedIds,
  onSelect,
  onPatch,
  onPatchGroup,
  onGestureStart,
  onDropFiles,
  dropHot,
  onDragState,
  selectedGuide,
  onSelectGuide,
  onMoveGuide,
}: {
  page: LogPage;
  assets: Record<string, string>;
  selectedIds: string[];
  onSelect: (id: string | null, toggle?: boolean) => void;
  onPatch: (id: string, partial: Partial<LogElement>) => void;
  onPatchGroup: (patches: { id: string; partial: Partial<LogElement> }[]) => void;
  onGestureStart: () => void;
  onDropFiles: (files: File[]) => void;
  dropHot: boolean;
  onDragState: (hot: boolean) => void;
  selectedGuide: string | null;
  onSelectGuide: (id: string | null) => void;
  onMoveGuide: (id: string, at: number) => void;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const guideDrag = useRef<{ id: string; axis: Guide["axis"] } | null>(null);
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
      const guiding = guideDrag.current;
      if (guiding && pageRef.current) {
        const point = units(event);
        begin();
        onMoveGuide(guiding.id, clamp(guiding.axis === "v" ? point.x : point.y, 2, guiding.axis === "v" ? 98 : 150));
        return;
      }
      const current = drag.current;
      if (!current || !pageRef.current) return;
      const point = units(event);
      begin();
      if (current.kind === "move") {
        const dx = point.x - current.start.x;
        const dy = point.y - current.start.y;
        onPatchGroup(
          current.ids.map((id) => {
            const origin = current.origins[id];
            return {
              id,
              partial: {
                x: clamp((origin?.x ?? 0) + dx, -15, 115),
                y: clamp((origin?.y ?? 0) + dy, -15, 165),
              },
            };
          }),
        );
        return;
      }
      const el = page.elements.find((item) => item.id === current.id);
      if (!el) return;
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
      if (el.type === "shape" && (el.shape === "circle" || el.shape === "square")) h = w;
      onPatch(el.id, { w, h });
    };
    const up = () => {
      drag.current = null;
      guideDrag.current = null;
      recording.current = false;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [page.elements, onPatch, onPatchGroup, onMoveGuide, onGestureStart]);

  function startMove(event: ReactPointerEvent, el: LogElement) {
    event.stopPropagation();
    const toggle = event.shiftKey || event.metaKey || event.ctrlKey;
    if (toggle) {
      onSelect(el.id, true);
      return;
    }
    const group = selectedIds.includes(el.id) && selectedIds.length > 1 ? selectedIds : [el.id];
    if (group.length === 1) onSelect(el.id, false);
    const point = units(event);
    const origins: Record<string, { x: number; y: number }> = {};
    for (const id of group) {
      const item = page.elements.find((entry) => entry.id === id);
      if (item) origins[id] = { x: item.x, y: item.y };
    }
    drag.current = { kind: "move", ids: group, origins, start: point };
  }

  const ordered = page.elements.slice().sort((a, b) => a.z - b.z);

  return (
    <div
      ref={pageRef}
      className={`canvas-page ${dropHot ? "is-drop" : ""}`}
      onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest(".placed, .guide")) return;
        onSelect(null);
        onSelectGuide(null);
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
          const selected = selectedIds.includes(el.id);
          const alone = selected && selectedIds.length === 1;
          return (
            <div
              key={el.id}
              className={`placed ${selected ? "is-selected" : ""}`}
              style={elementStyle(el)}
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).closest("textarea, button")) return;
                const toggle = event.shiftKey || event.metaKey || event.ctrlKey;
                if (toggle) {
                  event.stopPropagation();
                  onSelect(el.id, true);
                  return;
                }
                const inGroup = selectedIds.includes(el.id) && selectedIds.length > 1;
                if (el.type === "text" && !inGroup) {
                  onSelect(el.id, false);
                  return;
                }
                startMove(event, el);
              }}
            >
              {el.type === "text" && alone ? (
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
              {selected ? <span className="sel-frame" /> : null}
              {alone ? (
                <>
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
        {(page.guides ?? []).map((guide) => (
          <button
            key={guide.id}
            type="button"
            className={`guide guide-${guide.axis} ${guide.id === selectedGuide ? "is-on" : ""}`}
            style={guide.axis === "v" ? { left: `${guide.at}%` } : { top: `${guide.at / RATIO}%` }}
            aria-label={guide.axis === "v" ? "Guía vertical" : "Guía horizontal"}
            onPointerDown={(event) => {
              event.stopPropagation();
              onSelect(null);
              onSelectGuide(guide.id);
              guideDrag.current = { id: guide.id, axis: guide.axis };
            }}
          />
        ))}
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
  const drag = useRef<CoverDrag | null>(null);
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
      if (current.kind === "text") {
        onChange({
          textX: clamp(point.x - current.dx, -10, 70),
          textY: clamp(point.y - current.dy, -10, 150),
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
            drag.current = { kind: "move", dx: point.x - cover.imgX, dy: point.y - cover.imgY };
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
                  drag.current = { kind: "move", dx: point.x - cover.imgX, dy: point.y - cover.imgY };
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
                  drag.current = { kind: "rotate", offset: angle - cover.imgRot };
                }}
              />
              <button
                type="button"
                className="handle handle-se"
                aria-label="Escalar ilustración"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  drag.current = { kind: "resize" };
                }}
              />
            </>
          ) : null}
        </div>
      ) : null}
      {cover.showText ? (
        <div
          className={`cover-text-hit ${
            cover.textX != null && cover.textY != null ? "is-placed" : imageUrl ? "is-bottom" : "is-top"
          }`}
          style={
            cover.textX != null && cover.textY != null
              ? { left: `${cover.textX}%`, top: `${cover.textY / RATIO}%` }
              : undefined
          }
          onPointerDown={(event) => {
            event.stopPropagation();
            setSelected(false);
            const page = pageRef.current!.getBoundingClientRect();
            const box = event.currentTarget.getBoundingClientRect();
            const originX = ((box.left - page.left) / page.width) * 100;
            const originY = ((box.top - page.top) / page.width) * 100;
            const point = units(event);
            drag.current = { kind: "text", dx: point.x - originX, dy: point.y - originY };
            if (cover.textX == null || cover.textY == null) onChange({ textX: originX, textY: originY });
          }}
        />
      ) : null}
      {dropHot ? <p className="drop-label">Soltar en la portada</p> : null}
    </div>
  );
}

export function BackCanvas({
  cover,
  back,
  imageUrl,
  onChange,
  onGestureStart,
  onDropFiles,
  dropHot,
  onDragState,
}: {
  cover: Cover;
  back: BackCover;
  imageUrl?: string;
  onChange: (partial: Partial<BackCover>) => void;
  onGestureStart: () => void;
  onDropFiles: (files: File[]) => void;
  dropHot: boolean;
  onDragState: (hot: boolean) => void;
}) {
  const pageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<CoverDrag | null>(null);
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
      if (current.kind === "text") {
        onChange({
          textX: clamp(point.x - current.dx, -10, 70),
          textY: clamp(point.y - current.dy, -10, 150),
        });
        return;
      }
      if (current.kind === "move") {
        onChange({
          imgX: clamp(point.x - current.dx, -20, 120),
          imgY: clamp(point.y - current.dy, -20, 180),
        });
        return;
      }
      if (current.kind === "rotate") {
        const angle = (Math.atan2(point.y - back.imgY, point.x - back.imgX) * 180) / Math.PI;
        onChange({ imgRot: Math.round((angle - current.offset) * 10) / 10 });
        return;
      }
      const dx = point.x - back.imgX;
      const dy = point.y - back.imgY;
      const rad = (-back.imgRot * Math.PI) / 180;
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const w = clamp(Math.abs(lx) * 2, 12, 150);
      const aspect = back.imgW > 0 ? back.imgH / back.imgW : 1;
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
  }, [back.imgX, back.imgY, back.imgW, back.imgH, back.imgRot, onChange, onGestureStart]);

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
      <BackFace cover={cover} back={back} imageUrl={imageUrl} />
      {imageUrl ? (
        <div
          className="cover-art-wrap is-hit"
          style={{
            left: `${back.imgX}%`,
            top: `${back.imgY / RATIO}%`,
            width: `${back.imgW}%`,
            height: `${back.imgH / RATIO}%`,
            transform: `translate(-50%, -50%) rotate(${back.imgRot}deg)`,
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
            setSelected(true);
            const point = units(event);
            drag.current = { kind: "move", dx: point.x - back.imgX, dy: point.y - back.imgY };
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
                  drag.current = { kind: "move", dx: point.x - back.imgX, dy: point.y - back.imgY };
                }}
              />
              <button
                type="button"
                className="handle handle-rot"
                aria-label="Rotar ilustración"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  const point = units(event);
                  const angle = (Math.atan2(point.y - back.imgY, point.x - back.imgX) * 180) / Math.PI;
                  drag.current = { kind: "rotate", offset: angle - back.imgRot };
                }}
              />
              <button
                type="button"
                className="handle handle-se"
                aria-label="Escalar ilustración"
                onPointerDown={(event) => {
                  event.stopPropagation();
                  drag.current = { kind: "resize" };
                }}
              />
            </>
          ) : null}
        </div>
      ) : null}
      {back.note.trim() ? (
        <div
          className={`cover-text-hit ${back.textX != null && back.textY != null ? "is-placed" : "is-top"}`}
          style={
            back.textX != null && back.textY != null
              ? { left: `${back.textX}%`, top: `${back.textY / RATIO}%`, width: "68%", height: "22%" }
              : { left: "16%", right: "14%", top: "22%", bottom: "auto", height: "28%" }
          }
          onPointerDown={(event) => {
            event.stopPropagation();
            setSelected(false);
            const page = pageRef.current!.getBoundingClientRect();
            const box = event.currentTarget.getBoundingClientRect();
            const originX = ((box.left - page.left) / page.width) * 100;
            const originY = ((box.top - page.top) / page.width) * 100;
            const point = units(event);
            drag.current = { kind: "text", dx: point.x - originX, dy: point.y - originY };
            if (back.textX == null || back.textY == null) onChange({ textX: originX, textY: originY });
          }}
        />
      ) : null}
      {dropHot ? <p className="drop-label">Soltar en la contraportada</p> : null}
    </div>
  );
}
