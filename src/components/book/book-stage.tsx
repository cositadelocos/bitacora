import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Maximize2, Search, Share2, X } from "lucide-react";
import type { LogbookDoc, LogPage } from "@/lib/logbook/model";
import { backIndex, elementStyle, evenCursor, maxCursor, pad2, pageAssetIds, viewCount } from "@/lib/logbook/model";
import type { AssetMode } from "@/lib/logbook/assets";
import { loadAssets } from "@/lib/logbook/assets";
import { Sheet } from "@/components/book/sheet";
import { ElementBody } from "@/components/book/element-body";
import { BackFace, CoverFace } from "@/components/book/cover-face";
import { ShareDialog } from "@/components/chrome/share-dialog";

type Phase = "shut" | "opening" | "open" | "closing";
type Flip = { dir: "next" | "prev"; from: number } | null;

function ease(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function useMedia(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const apply = () => setMatch(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [query]);
  return match;
}

function useReduced() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return reduced;
}

function useAssetMap(ids: string[], mode: AssetMode) {
  const [map, setMap] = useState<Record<string, string>>({});
  const signature = ids.join("|");
  useEffect(() => {
    let cancel = false;
    const list = signature ? signature.split("|") : [];
    void loadAssets(mode, "full", list, (id, url) => {
      if (!cancel) setMap((prev) => (prev[id] === url ? prev : { ...prev, [id]: url }));
    });
    return () => {
      cancel = true;
    };
  }, [signature, mode]);
  return map;
}

function PageSheet({
  page,
  assets,
  quiet = false,
}: {
  page?: LogPage;
  assets: Record<string, string>;
  quiet?: boolean;
}) {
  return (
    <Sheet tone={page?.tone ?? "ivory"} seed={page?.id ?? "blank"} quiet={quiet}>
      {page?.elements
        .slice()
        .sort((a, b) => a.z - b.z)
        .map((el) => (
          <div key={el.id} className="placed" style={elementStyle(el)}>
            <ElementBody el={el} url={el.assetId ? assets[el.assetId] : undefined} />
          </div>
        ))}
    </Sheet>
  );
}

function SlotSheet({
  index,
  doc,
  assets,
  single,
}: {
  index: number;
  doc: LogbookDoc;
  assets: Record<string, string>;
  single: boolean;
}) {
  if (index === backIndex(doc.pages.length, single)) {
    return <BackFace cover={doc.cover} back={doc.back} />;
  }
  const page = doc.pages[index];
  if (!page) return <Sheet tone="ivory" seed={`blank-${index}`} quiet />;
  return <PageSheet page={page} assets={assets} />;
}

export function BookStage({
  doc,
  assetMode,
  canEdit = false,
  previewing = false,
  onClosePreview,
}: {
  doc: LogbookDoc;
  assetMode: AssetMode;
  canEdit?: boolean;
  previewing?: boolean;
  onClosePreview?: () => void;
}) {
  const portraitPhone = useMedia("(orientation: portrait) and (max-width: 900px)");
  const compact = useMedia("(max-width: 1100px)");
  const [pair, setPair] = useState<boolean | null>(null);
  const narrow = pair === null ? portraitPhone : !pair;
  const reduced = useReduced();
  const pageCount = doc.pages.length;
  const total = viewCount(pageCount, narrow);
  const rear = backIndex(pageCount, narrow);
  const sceneRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const [phase, setPhase] = useState<Phase>("shut");
  const [cursor, setCursor] = useState(0);
  const [flip, setFlip] = useState<Flip>(null);
  const [hot, setHot] = useState(true);
  const [present, setPresent] = useState(false);
  const [lens, setLens] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panDrag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [autoplay, setAutoplay] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const swipe = useRef({ x: 0, y: 0, moved: false });

  const spreadCursor = narrow ? cursor : evenCursor(cursor, total);
  const priority = useMemo(() => {
    const ids = new Set<string>();
    if (doc.cover.assetId) ids.add(doc.cover.assetId);
    const indexes = narrow
      ? [cursor, cursor + 1, cursor - 1]
      : [spreadCursor, spreadCursor + 1, spreadCursor + 2, spreadCursor + 3, spreadCursor - 1, spreadCursor - 2];
    for (const index of indexes) {
      for (const id of pageAssetIds(doc.pages[index])) ids.add(id);
    }
    return [...ids];
  }, [doc, cursor, narrow, spreadCursor]);
  const assets = useAssetMap(priority, assetMode);
  const coverUrl = doc.cover.assetId ? assets[doc.cover.assetId] : undefined;

  const setVar = useCallback((name: string, value: number) => {
    sceneRef.current?.style.setProperty(name, value.toFixed(4));
  }, []);

  const animateVar = useCallback(
    (name: string, from: number, to: number, ms: number, done: () => void) => {
      const node = sceneRef.current;
      if (!node || reduced || ms <= 0) {
        setVar(name, to);
        done();
        return () => {};
      }
      node.style.setProperty(name, from.toFixed(4));
      const t0 = performance.now();
      let raf = 0;
      let dead = false;
      const step = (now: number) => {
        if (dead) return;
        const t = Math.min(1, (now - t0) / ms);
        node.style.setProperty(name, (from + (to - from) * ease(t)).toFixed(4));
        if (name === "--p") {
          // Sombra solo a mitad del giro. En 0 y en 1 vale 0, así al soltar
          // la hoja no hay un flash ni un salto de luz.
          node.style.setProperty("--shade", Math.sin(t * Math.PI).toFixed(4));
        }
        if (t < 1) raf = requestAnimationFrame(step);
        else done();
      };
      raf = requestAnimationFrame(step);
      return () => {
        dead = true;
        cancelAnimationFrame(raf);
      };
    },
    [reduced, setVar],
  );

  useEffect(() => {
    if (flip || phase !== "open") return;
    setCursor((c) => {
      const slots = viewCount(doc.pages.length, narrow);
      const limit = maxCursor(slots, narrow);
      const next = narrow ? Math.min(c, limit) : evenCursor(Math.min(c, limit), slots);
      return next === c ? c : next;
    });
  }, [narrow, flip, phase, doc.pages.length]);

  useEffect(() => {
    if (phase !== "opening" && phase !== "closing") return;
    const from = phase === "opening" ? 0 : 1;
    const to = phase === "opening" ? 1 : 0;
    busy.current = true;
    const cancel = animateVar("--cover", from, to, 980, () => {
      busy.current = false;
      setPhase(phase === "opening" ? "open" : "shut");
    });
    return cancel;
  }, [phase, animateVar]);

  useEffect(() => {
    if (!flip) return;
    busy.current = true;
    const cancel = animateVar("--p", 0, 1, narrow ? 740 : 820, () => {
      const step = narrow ? 1 : 2;
      setCursor((c) => {
        const base = narrow ? c : evenCursor(c, total);
        const from = flip.from;
        const next = flip.dir === "next" ? from + step : from - step;
        return Math.max(0, Math.min(maxCursor(total, narrow), next));
      });
      // No pongas --p en 0 aquí: la hoja sigue montada hasta el siguiente
      // render y, si el ángulo vuelve a cero antes de quitarse, se ve un
      // tirón al final. El siguiente paso lo deja en 0 antes de montar otra.
      setFlip(null);
      busy.current = false;
    });
    return cancel;
  }, [flip, animateVar, narrow, total]);

  useEffect(() => {
    let timer = 0;
    const poke = () => {
      setHot(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setHot(false), 2400);
    };
    poke();
    window.addEventListener("pointermove", poke);
    window.addEventListener("pointerdown", poke);
    return () => {
      window.removeEventListener("pointermove", poke);
      window.removeEventListener("pointerdown", poke);
      window.clearTimeout(timer);
    };
  }, []);

  const go = useCallback(
    (dir: "next" | "prev") => {
      if (phase === "shut") {
        if (dir === "next") {
          setVar("--cover", 0);
          setPhase("opening");
        }
        return;
      }
      if (phase !== "open" || busy.current || flip) return;
      const from = narrow ? cursor : evenCursor(cursor, total);
      const limit = maxCursor(total, narrow);
      if (dir === "next" && from >= limit) {
        setAutoplay(false);
        return;
      }
      if (dir === "prev" && from <= 0) return;
      if (reduced) {
        const step = narrow ? 1 : 2;
        setCursor(dir === "next" ? Math.min(limit, from + step) : Math.max(0, from - step));
        return;
      }
      setVar("--p", 0);
      setVar("--shade", 0);
      setFlip({ dir, from });
    },
    [phase, flip, narrow, cursor, total, reduced, setVar],
  );

  useEffect(() => {
    if (!present || !autoplay || phase !== "open") return;
    const id = window.setInterval(() => go("next"), 4600);
    return () => window.clearInterval(id);
  }, [present, autoplay, phase, go]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "Escape") {
        if (shareOpen) {
          setShareOpen(false);
          return;
        }
        if (lens || scale !== 1) {
          setLens(false);
          setScale(1);
          setPan({ x: 0, y: 0 });
          return;
        }
        if (present) {
          setPresent(false);
          setAutoplay(false);
          if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        }
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        go("next");
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        go("prev");
      } else if ((event.key === "Enter" || event.key === " ") && phase === "shut") {
        event.preventDefault();
        go("next");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, phase, present, shareOpen, lens, scale]);

  function leavePresent() {
    setPresent(false);
    setAutoplay(false);
    setLens(false);
    setScale(1);
    setPan({ x: 0, y: 0 });
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }

  function toggleLens() {
    if (lens) {
      setLens(false);
      setScale(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    setLens(true);
    setScale(1.8);
  }

  useEffect(() => {
    const node = sceneRef.current;
    if (!node || !present || !lens) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setScale((current) => {
        const next = Math.min(3, Math.max(1, current + (event.deltaY < 0 ? 0.16 : -0.16)));
        if (next === 1) setPan({ x: 0, y: 0 });
        return next;
      });
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [present, lens]);

  function openPresent() {
    setPresent(true);
    const node = rootRef.current;
    if (node?.requestFullscreen) void node.requestFullscreen().catch(() => {});
  }

  function closeBook() {
    if (phase !== "open" || busy.current) return;
    setFlip(null);
    setCursor(0);
    setVar("--cover", 1);
    setPhase("closing");
  }

  const open = phase === "open" || phase === "closing";
  const showCoverLeaf = phase !== "open";
  const from = flip?.from ?? (narrow ? cursor : spreadCursor);

  let leftIndex = spreadCursor;
  let rightIndex = spreadCursor + 1;
  let leaf: { dir: "next" | "prev"; front: number; back: number } | null = null;
  if (flip && !narrow) {
    if (flip.dir === "next") {
      leftIndex = flip.from;
      rightIndex = flip.from + 3;
      leaf = { dir: "next", front: flip.from + 1, back: flip.from + 2 };
    } else {
      leftIndex = flip.from - 2;
      rightIndex = flip.from + 1;
      leaf = { dir: "prev", front: flip.from, back: flip.from - 1 };
    }
  }

  const singleUnder = flip ? (flip.dir === "next" ? flip.from + 1 : flip.from - 1) : cursor;

  const label = (() => {
    if (phase === "shut" || phase === "opening") return "portada";
    if (narrow && cursor === rear) return "contraportada";
    if (!narrow && (leftIndex === rear || rightIndex === rear)) return "contraportada";
    if (narrow) {
      const n = Math.min(pageCount, cursor + 1);
      return `${pad2(n)}  /  ${pad2(pageCount)}`;
    }
    const a = spreadCursor + 1;
    const b = spreadCursor + 2;
    const left = a <= pageCount ? pad2(a) : null;
    const right = b <= pageCount ? pad2(b) : null;
    const pair = [left, right].filter(Boolean).join("  —  ");
    return `${pair}   /   ${pad2(pageCount)}`;
  })();

  function onPointerDown(event: React.PointerEvent) {
    if (present && lens) {
      panDrag.current = { x: event.clientX, y: event.clientY, px: pan.x, py: pan.y };
      return;
    }
    swipe.current = { x: event.clientX, y: event.clientY, moved: false };
  }
  function onPointerMove(event: React.PointerEvent) {
    const drag = panDrag.current;
    if (!drag) return;
    setPan({ x: drag.px + event.clientX - drag.x, y: drag.py + event.clientY - drag.y });
  }
  function onPointerUp(event: React.PointerEvent) {
    if (panDrag.current) {
      panDrag.current = null;
      return;
    }
    const dx = event.clientX - swipe.current.x;
    const dy = event.clientY - swipe.current.y;
    if (Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      swipe.current.moved = true;
      go(dx < 0 ? "next" : "prev");
    }
  }

  const atStart = (narrow ? cursor : spreadCursor) <= 0;
  const atEnd = (narrow ? cursor : spreadCursor) >= maxCursor(total, narrow);

  return (
    <div
      ref={rootRef}
      className={`desk-screen desk-${doc.desk ?? "yeso"} ${hot ? "is-hot" : ""} ${present ? "is-present" : ""} ${lens ? "is-lens" : ""} ${scale > 1 ? "is-zoomed" : ""}`}
    >
      <div className={`quiet-bar top-bar ${present ? "present-bar" : ""}`}>
        {previewing ? (
          <button type="button" className="quiet-btn" onClick={onClosePreview}>
            Volver al editor
          </button>
        ) : (
          <div className="brand-lockup">
            <span className="quiet-note">cuaderno</span>
            <span className="byline">por Jose Liz</span>
          </div>
        )}
        <div className="quiet-actions">
          {present ? (
            <>
              <button type="button" className="quiet-btn" onClick={() => setAutoplay((v) => !v)}>
                {autoplay ? "Pausa" : "Reproducir"}
              </button>
              <button type="button" className="quiet-btn" onClick={leavePresent}>
                Salir
              </button>
            </>
          ) : (
            <>
              <button type="button" className="quiet-btn" onClick={openPresent}>
                <Maximize2 size={15} strokeWidth={1.75} />
                Presentación
              </button>
              <button type="button" className="quiet-btn" onClick={() => setShareOpen(true)}>
                <Share2 size={15} strokeWidth={1.75} />
                Compartir
              </button>
              {previewing ? null : (
                <Link to="/editar" className="quiet-btn">
                  Editar
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      <div
        ref={sceneRef}
        className={`book-scene ${narrow ? "is-single" : "is-spread"} phase-${phase} ${flip ? "is-flipping" : ""}`}
        style={
          present && (scale !== 1 || pan.x !== 0 || pan.y !== 0)
            ? { transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }
            : undefined
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {narrow ? (
          phase !== "open" ? (
            <button
              type="button"
              className={`closed-book ${phase === "opening" ? "is-opening" : ""} ${phase === "closing" ? "is-closing" : ""}`}
              onClick={() => {
                if (phase === "shut") go("next");
              }}
            >
              <span className="closed-shadow" aria-hidden="true" />
              <span className="closed-shell">
                <span className="closed-spine" />
                <span className="closed-pages" />
                <span className="closed-cover">
                  <CoverFace cover={doc.cover} imageUrl={coverUrl} />
                </span>
              </span>
              <span className="open-hint">Abrir cuaderno</span>
            </button>
          ) : (
            <div className="single-book">
              <div className="single-under">
                <SlotSheet index={singleUnder} doc={doc} assets={assets} single />
              </div>
              {flip ? (
                <div className={`leaf leaf-single leaf-${flip.dir}`}>
                  <div className="face face-front">
                    <SlotSheet index={flip.from} doc={doc} assets={assets} single />
                  </div>
                  <div className="face face-back">
                    <SlotSheet index={singleUnder} doc={doc} assets={assets} single />
                  </div>
                  <div className="leaf-shade" />
                </div>
              ) : (
                <div className="single-static">
                  <SlotSheet index={cursor} doc={doc} assets={assets} single />
                </div>
              )}
            </div>
          )
        ) : (
          <div className={`book-pose ${showCoverLeaf ? "with-cover" : ""}`}>
            <div className="spread">
              <div className="wing wing-left">
                <div className="curl">
                  <SlotSheet index={leftIndex} doc={doc} assets={assets} single={false} />
                </div>
                <span className="fore-edge edge-left" aria-hidden="true" />
              </div>
              <div className="gutter" aria-hidden="true" />
              <div className="wing wing-right">
                <div className="curl">
                  <SlotSheet index={rightIndex} doc={doc} assets={assets} single={false} />
                </div>
                <span className="fore-edge edge-right" aria-hidden="true" />
              </div>
              {leaf ? (
                <div className={`leaf leaf-${leaf.dir}`}>
                  <div className="face face-front">
                    <SlotSheet index={leaf.front} doc={doc} assets={assets} single={false} />
                  </div>
                  <div className="face face-back">
                    <SlotSheet index={leaf.back} doc={doc} assets={assets} single={false} />
                  </div>
                  <div className="leaf-shade" />
                </div>
              ) : null}
              {showCoverLeaf ? (
                <div className="leaf leaf-next cover-leaf">
                  <div className="face face-front">
                    <CoverFace cover={doc.cover} imageUrl={coverUrl} />
                  </div>
                  <div className="face face-back">
                    <SlotSheet index={0} doc={doc} assets={assets} single={false} />
                  </div>
                  <span className="page-block" aria-hidden="true" />
                </div>
              ) : null}
              {phase === "shut" ? (
                <button type="button" className="cover-hit" aria-label="Abrir cuaderno" onClick={() => go("next")} />
              ) : null}
            </div>
            {phase === "shut" ? (
              <button type="button" className="open-hint desk-hint" onClick={() => go("next")}>
                Abrir cuaderno
              </button>
            ) : null}
          </div>
        )}

        {phase === "open" && !(present && lens) ? (
          <>
            <button
              type="button"
              className="hit hit-prev"
              aria-label="Página anterior"
              disabled={atStart}
              onClick={() => {
                if (swipe.current.moved) {
                  swipe.current.moved = false;
                  return;
                }
                go("prev");
              }}
            >
              <ChevronLeft size={28} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              className="hit hit-next"
              aria-label="Página siguiente"
              disabled={atEnd}
              onClick={() => {
                if (swipe.current.moved) {
                  swipe.current.moved = false;
                  return;
                }
                go("next");
              }}
            >
              <ChevronRight size={28} strokeWidth={1.5} />
            </button>
          </>
        ) : null}
      </div>

      {present ? (
        <div className={`lens-dock ${lens ? "is-on" : ""}`}>
          <button type="button" className={`quiet-btn ${lens ? "is-on" : ""}`} onClick={toggleLens}>
            <Search size={15} strokeWidth={1.75} />
            Lupa
          </button>
          {lens ? (
            <>
              <button
                type="button"
                className="quiet-btn"
                onClick={() => setScale((current) => Math.min(3, Math.round((current + 0.4) * 10) / 10))}
              >
                +
              </button>
              <button
                type="button"
                className="quiet-btn"
                onClick={() =>
                  setScale((current) => {
                    const next = Math.max(1, Math.round((current - 0.4) * 10) / 10);
                    if (next === 1) setPan({ x: 0, y: 0 });
                    return next;
                  })
                }
              >
                −
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="quiet-bar bottom-bar">
        {phase === "open" ? (
          <button type="button" className="quiet-btn ghost" onClick={closeBook}>
            <X size={14} strokeWidth={1.75} />
            Cerrar
          </button>
        ) : (
          <span />
        )}
        <p className="page-index" aria-live="polite">
          {label}
        </p>
        {compact && phase === "open" ? (
          <button type="button" className="quiet-btn ghost" onClick={() => setPair(narrow)}>
            {narrow ? "Dos páginas" : "Una página"}
          </button>
        ) : (
          <span className="quiet-note key-hint">← →</span>
        )}
      </div>

      {shareOpen ? <ShareDialog publishedNote onClose={() => setShareOpen(false)} /> : null}
      <span className="sr-only">
        Hoja {from + 1} de {pageCount}. {narrow ? "Una página." : "Dos páginas."} Contraportada al final.
      </span>
    </div>
  );
}
