import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { UserButton } from "@/lib/auth/gates";
import { getDraft, publishBook, saveDraft, uploadAsset } from "@/lib/logbook/api";
import { compressImage, loadAssets, rememberAsset } from "@/lib/logbook/assets";
import {
  DECO_LABEL,
  DECOS,
  DESKS,
  FONT_GROUPS,
  INK_LABEL,
  INKS,
  RATIO,
  TAPE_LABEL,
  TAPES,
  blankPage,
  coverPlacement,
  cryptoId,
  pageAssetIds,
  resolveFont,
  type Cloth,
  type DeskId,
  type DecoKind,
  type ImageLook,
  type InkName,
  type LogElement,
  type LogPage,
  type LogbookDoc,
  type TapeKind,
  type Tone,
} from "@/lib/logbook/model";
import { BackFace } from "@/components/book/cover-face";
import { DecoGraphic } from "@/components/book/decorations";
import { BookStage } from "@/components/book/book-stage";
import { CoverCanvas, PageCanvas } from "@/components/editor/page-canvas";

const EMPTY_LOOK: ImageLook = { shadow: false, frame: false, scan: false, torn: false, fade: 0 };

function patchPage(doc: LogbookDoc, pageId: string, map: (page: LogPage) => LogPage): LogbookDoc {
  return { ...doc, pages: doc.pages.map((page) => (page.id === pageId ? map(page) : page)) };
}

function withZ(elements: LogElement[], id: string, mode: "front" | "forward" | "back" | "backward") {
  const sorted = elements.slice().sort((a, b) => a.z - b.z || a.id.localeCompare(b.id));
  const index = sorted.findIndex((el) => el.id === id);
  if (index < 0) return elements;
  const next = sorted.slice();
  const [item] = next.splice(index, 1);
  if (!item) return elements;
  if (mode === "front") next.push(item);
  else if (mode === "back") next.unshift(item);
  else if (mode === "forward") next.splice(Math.min(next.length, index + 1), 0, item);
  else next.splice(Math.max(0, index - 1), 0, item);
  const order = new Map(next.map((el, i) => [el.id, i + 1]));
  return elements.map((el) => ({ ...el, z: order.get(el.id) ?? el.z }));
}

export function EditorApp() {
  const [doc, setDoc] = useState<LogbookDoc | null>(null);
  const [past, setPast] = useState<LogbookDoc[]>([]);
  const [future, setFuture] = useState<LogbookDoc[]>([]);
  const [pageId, setPageId] = useState<string>("cover");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState("Cargando cuaderno…");
  const [dirty, setDirty] = useState(false);
  const [ready, setReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [claimed, setClaimed] = useState(true);
  const [preview, setPreview] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [dropHot, setDropHot] = useState(false);
  const [panel, setPanel] = useState<"pages" | "tools" | null>(null);
  const [assets, setAssets] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<LogbookDoc | null>(null);
  const gen = useRef(0);
  docRef.current = doc;

  useEffect(() => {
    let cancel = false;
    void getDraft()
      .then((res) => {
        if (cancel) return;
        if (!res.canEdit) {
          setBlocked(true);
          setStatus("");
          return;
        }
        setDoc(res.doc);
        setClaimed(res.claimed);
        setPageId(res.doc.pages[0]?.id ?? "cover");
        setReady(true);
        setStatus(res.claimed ? "Borrador" : "Sin autor todavía");
      })
      .catch(() => {
        if (!cancel) setStatus("No se pudo abrir el cuaderno");
      });
    return () => {
      cancel = true;
    };
  }, []);

  const page = doc?.pages.find((item) => item.id === pageId);
  const assetKey = useMemo(() => {
    if (!doc) return "";
    const ids = new Set<string>();
    if (doc.cover.assetId) ids.add(doc.cover.assetId);
    if (page) for (const id of pageAssetIds(page)) ids.add(id);
    return [...ids].join("|");
  }, [doc, page]);

  useEffect(() => {
    if (!assetKey) return;
    let cancel = false;
    void loadAssets("owner", "full", assetKey.split("|"), (id, url) => {
      if (!cancel) setAssets((prev) => (prev[id] === url ? prev : { ...prev, [id]: url }));
    });
    return () => {
      cancel = true;
    };
  }, [assetKey]);

  const commit = useCallback((recipe: (current: LogbookDoc) => LogbookDoc, record: boolean) => {
    const current = docRef.current;
    if (!current) return;
    const next = recipe(current);
    if (next === current) return;
    if (record) {
      setPast((stack) => [...stack, current].slice(-40));
      setFuture([]);
    }
    docRef.current = next;
    setDoc(next);
    setDirty(true);
  }, []);

  const persist = useCallback(async (snapshot: LogbookDoc) => {
    const token = ++gen.current;
    setStatus("Guardando…");
    try {
      const res = await saveDraft({ data: snapshot });
      if (token !== gen.current) return;
      if (!res.ok) {
        setStatus(res.message);
        toast.error(res.message);
        return;
      }
      const latest = docRef.current;
      if (latest && JSON.stringify(latest) !== JSON.stringify(snapshot)) {
        void persist(latest);
        return;
      }
      setDirty(false);
      setClaimed(true);
      setStatus("Borrador guardado");
    } catch {
      if (token === gen.current) setStatus("Error al guardar");
    }
  }, []);

  useEffect(() => {
    if (!ready || !dirty || !doc) return;
    const handle = window.setTimeout(() => void persist(doc), 800);
    return () => window.clearTimeout(handle);
  }, [doc, dirty, ready, persist]);

  function undo() {
    const current = docRef.current;
    setPast((stack) => {
      if (!current || stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      if (!prev) return stack;
      setFuture((next) => [current, ...next].slice(0, 40));
      docRef.current = prev;
      setDoc(prev);
      setDirty(true);
      return stack.slice(0, -1);
    });
  }
  function redo() {
    const current = docRef.current;
    setFuture((stack) => {
      if (!current || stack.length === 0) return stack;
      const [next, ...rest] = stack;
      if (!next) return stack;
      setPast((prev) => [...prev, current].slice(-40));
      docRef.current = next;
      setDoc(next);
      setDirty(true);
      return rest;
    });
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (preview) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (docRef.current) void persist(docRef.current);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if (typing) return;
      if ((event.key === "Delete" || event.key === "Backspace") && selectedId && pageId !== "cover" && pageId !== "back") {
        event.preventDefault();
        commit(
          (current) =>
            patchPage(current, pageId, (item) => ({
              ...item,
              elements: item.elements.filter((el) => el.id !== selectedId),
            })),
          true,
        );
        setSelectedId(null);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d" && selectedId) {
        event.preventDefault();
        duplicateSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function addElement(make: (z: number) => LogElement) {
    if (!doc || pageId === "cover" || pageId === "back") return;
    const target = doc.pages.find((item) => item.id === pageId);
    const z = (target?.elements.reduce((max, el) => Math.max(max, el.z), 0) ?? 0) + 1;
    const element = make(z);
    setSelectedId(element.id);
    commit(
      (current) =>
        patchPage(current, pageId, (item) => ({ ...item, elements: [...item.elements, element] })),
      true,
    );
  }

  function duplicateSelected() {
    if (!doc || !selectedId || pageId === "cover" || pageId === "back") return;
    const source = page?.elements.find((el) => el.id === selectedId);
    if (!source) return;
    const copy: LogElement = {
      ...source,
      id: cryptoId(),
      x: source.x + 4,
      y: source.y + 4,
      z: source.z + 1,
      look: source.look ? { ...source.look } : undefined,
    };
    commit(
      (current) =>
        patchPage(current, pageId, (item) => ({ ...item, elements: [...item.elements, copy] })),
      true,
    );
    setSelectedId(copy.id);
  }

  async function ingest(files: File[], target: "page" | "cover") {
    if (!files.length) return;
    setStatus(`Subiendo ${files.length === 1 ? "imagen" : `${files.length} imágenes`}…`);
    const made: LogElement[] = [];
    let coverAsset: string | null = null;
    for (const [index, file] of files.entries()) {
      try {
        const image = await compressImage(file);
        const id = cryptoId();
        const res = await uploadAsset({
          data: {
            id,
            mime: image.mime,
            dataUrl: image.dataUrl,
            thumb: image.thumb,
            width: image.width,
            height: image.height,
          },
        });
        if (!res.ok) {
          toast.error(res.message);
          continue;
        }
        rememberAsset("owner", id, image.dataUrl, image.thumb);
        setAssets((prev) => ({ ...prev, [id]: image.dataUrl }));
        if (target === "cover") {
          coverAsset = id;
          const aspect = image.width / image.height;
          commit(
            (current) => ({
              ...current,
              cover: { ...current.cover, assetId: id, ...coverPlacement(current.cover.imageFit ?? "plate", aspect) },
            }),
            true,
          );
          break;
        }
        const w = 38;
        const h = (w * image.height) / image.width;
        const col = index % 2;
        const row = Math.floor(index / 2);
        made.push({
          id: cryptoId(),
          type: "image",
          assetId: id,
          naturalW: image.width,
          naturalH: image.height,
          x: 32 + col * 36,
          y: 34 + row * Math.min(h + 6, 48),
          w,
          h,
          rotation: 0,
          opacity: 1,
          z: index + 1,
          look: { ...EMPTY_LOOK },
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo subir la imagen");
      }
    }
    if (coverAsset) {
      setStatus("Ilustración de portada lista");
      return;
    }
    if (!made.length || pageId === "cover") return;
    const base = page?.elements.reduce((max, el) => Math.max(max, el.z), 0) ?? 0;
    const elements = made.map((el, index) => ({ ...el, z: base + index + 1 }));
    setSelectedId(elements[elements.length - 1]?.id ?? null);
    commit(
      (current) =>
        patchPage(current, pageId, (item) => ({ ...item, elements: [...item.elements, ...elements] })),
      true,
    );
    setStatus("Imágenes en la página");
  }

  async function publish() {
    if (docRef.current && dirty) await persist(docRef.current);
    const res = await publishBook();
    if (!res.ok) {
      toast.error(res.message);
      return;
    }
    setConfirmPublish(false);
    setClaimed(true);
    toast.success("La bitácora pública ya muestra este cuaderno");
    setStatus("Publicado");
  }

  if (blocked) {
    return (
      <div className="desk-screen center-note">
        <div className="paper-dialog static">
          <h2>Esta bitácora ya tiene autor</h2>
          <p className="dialog-copy">Puedes ver la versión publicada. La edición queda solo para quien la guardó primero.</p>
          <Link to="/" className="ink-btn">
            Ver cuaderno
          </Link>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="desk-screen center-note">
        <p className="quiet-note">{status}</p>
      </div>
    );
  }

  if (preview) {
    return (
      <BookStage
        doc={doc}
        assetMode="owner"
        previewing
        onClosePreview={() => setPreview(false)}
      />
    );
  }

  const selected = page?.elements.find((el) => el.id === selectedId) ?? null;
  const coverUrl = doc.cover.assetId ? assets[doc.cover.assetId] : undefined;

  return (
    <div className={`editor-shell desk-${doc.desk ?? "yeso"}`}>
      <header className="editor-top">
        <div>
          <p className="quiet-note">Editar bitácora</p>
          <p className="save-status">{status}{dirty ? " · cambios" : ""}</p>
          {!claimed ? <p className="claim-note">Al guardar, esta cuenta queda como la única que puede editar.</p> : null}
        </div>
        <div className="editor-actions">
          <button type="button" className="quiet-btn" onClick={() => doc && void persist(doc)}>
            Guardar borrador
          </button>
          <button type="button" className="quiet-btn" onClick={() => setPreview(true)}>
            Previsualizar
          </button>
          {confirmPublish ? (
            <>
              <button type="button" className="ink-btn" onClick={() => void publish()}>
                Confirmar publicación
              </button>
              <button type="button" className="quiet-btn ghost" onClick={() => setConfirmPublish(false)}>
                Cancelar
              </button>
            </>
          ) : (
            <button type="button" className="ink-btn" onClick={() => setConfirmPublish(true)}>
              Publicar cambios
            </button>
          )}
          <Link to="/" className="quiet-btn ghost">
            Ver publicada
          </Link>
          <UserButton />
        </div>
      </header>

      <div className="editor-mobile-nav">
        <button type="button" className={panel === "pages" ? "quiet-btn is-on" : "quiet-btn"} onClick={() => setPanel(panel === "pages" ? null : "pages")}>
          Páginas
        </button>
        <button type="button" className={panel === "tools" ? "quiet-btn is-on" : "quiet-btn"} onClick={() => setPanel(panel === "tools" ? null : "tools")}>
          Herramientas
        </button>
      </div>

      <aside className={`rail ${panel === "pages" ? "open" : ""}`}>
        <button
          type="button"
          className="quiet-btn wide"
          onClick={() => {
            const created = blankPage();
            commit((current) => {
              const index = current.pages.findIndex((item) => item.id === pageId);
              const pages = current.pages.slice();
              pages.splice(index < 0 ? pages.length : index + 1, 0, created);
              return { ...current, pages };
            }, true);
            setPageId(created.id);
            setSelectedId(null);
          }}
        >
          + Nueva página
        </button>
        <button
          type="button"
          className={`page-slip ${pageId === "cover" ? "is-on" : ""}`}
          onClick={() => {
            setPageId("cover");
            setSelectedId(null);
          }}
        >
          <span className={`slip-paper cloth-${doc.cover.cloth}`} />
          <span>Portada</span>
        </button>
        <div className="slip-scroll">
          {doc.pages.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className={`page-slip ${item.id === pageId ? "is-on" : ""}`}
              onClick={() => {
                setPageId(item.id);
                setSelectedId(null);
              }}
            >
              <span className={`slip-paper tone-${item.tone}`} />
              <span className="slip-meta">
                <strong>{String(index + 1).padStart(2, "0")}</strong>
                <em>{index % 2 === 0 ? "izq" : "der"}</em>
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`page-slip ${pageId === "back" ? "is-on" : ""}`}
          onClick={() => {
            setPageId("back");
            setSelectedId(null);
          }}
        >
          <span className={`slip-paper cloth-${doc.back?.cloth === "same" || !doc.back ? doc.cover.cloth : doc.back.cloth}`} />
          <span>Tapa atrás</span>
        </button>
      </aside>

      <main className="editor-stage">
        {pageId === "cover" ? (
          <CoverCanvas
            cover={{
              ...doc.cover,
              imgX: doc.cover.imgX ?? 50,
              imgY: doc.cover.imgY ?? 46,
              imgW: doc.cover.imgW ?? 68,
              imgH: doc.cover.imgH ?? 78,
              imgRot: doc.cover.imgRot ?? -1.2,
            }}
            imageUrl={coverUrl}
            dropHot={dropHot}
            onDragState={setDropHot}
            onGestureStart={() => {
              setPast((stack) => (doc ? [...stack, doc].slice(-40) : stack));
              setFuture([]);
            }}
            onChange={(partial) =>
              commit((current) => ({ ...current, cover: { ...current.cover, ...partial } }), false)
            }
            onDropFiles={(files) => void ingest(files, "cover")}
          />
        ) : pageId === "back" ? (
          <div className="canvas-page is-cover" style={{ aspectRatio: `1 / ${RATIO}` }}>
            <BackFace cover={doc.cover} back={doc.back} />
          </div>
        ) : page ? (
          <PageCanvas
            page={page}
            assets={assets}
            selectedId={selectedId}
            onSelect={setSelectedId}
            dropHot={dropHot}
            onDragState={setDropHot}
            onGestureStart={() => {
              setPast((stack) => (doc ? [...stack, doc].slice(-40) : stack));
              setFuture([]);
            }}
            onPatch={(id, partial) => {
              commit(
                (current) =>
                  patchPage(current, pageId, (item) => ({
                    ...item,
                    elements: item.elements.map((el) => (el.id === id ? { ...el, ...partial } : el)),
                  })),
                false,
              );
            }}
            onDropFiles={(files) => void ingest(files, "page")}
          />
        ) : null}
      </main>

      <aside className={`tools ${panel === "tools" ? "open" : ""}`}>
        <DeskFields
          desk={doc.desk ?? "yeso"}
          onChange={(desk) => commit((current) => ({ ...current, desk }), true)}
        />
        {pageId === "cover" ? (
          <CoverFields
            cover={doc.cover}
            onChange={(partial) => commit((current) => ({ ...current, cover: { ...current.cover, ...partial } }), true)}
            onUpload={() => coverFileRef.current?.click()}
            onClear={() => commit((current) => ({ ...current, cover: { ...current.cover, assetId: null } }), true)}
          />
        ) : pageId === "back" ? (
          <BackFields
            back={doc.back ?? { note: "", cloth: "same" }}
            onChange={(partial) =>
              commit(
                (current) => ({
                  ...current,
                  back: { ...(current.back ?? { note: "", cloth: "same" }), ...partial },
                }),
                true,
              )
            }
          />
        ) : (
          <>
            <section>
              <h2>Herramientas</h2>
              <div className="tool-grid">
                <button type="button" className="quiet-btn" onClick={() => fileRef.current?.click()}>
                  + Imagen
                </button>
                <button
                  type="button"
                  className="quiet-btn"
                  onClick={() =>
                    addElement((z) => ({
                      id: cryptoId(),
                      type: "text",
                      text: "nota",
                      x: 50,
                      y: 72,
                      w: 42,
                      h: 24,
                      rotation: -1,
                      opacity: 1,
                      z,
                      font: "caveat",
                      fontSize: 6.2,
                      color: "ink",
                      align: "left",
                      bold: false,
                    }))
                  }
                >
                  + Texto
                </button>
              </div>
              <p className="tool-label">Cinta</p>
              <div className="choice-row">
                {TAPES.map((tape) => (
                  <button
                    key={tape}
                    type="button"
                    className="choice"
                    title={TAPE_LABEL[tape]}
                    onClick={() =>
                      addElement((z) => ({
                        id: cryptoId(),
                        type: "tape",
                        tape,
                        x: 50,
                        y: 28,
                        w: 42,
                        h: 9,
                        rotation: -2,
                        opacity: 1,
                        z,
                      }))
                    }
                  >
                    <i className={`tape tape-${tape}`} />
                  </button>
                ))}
              </div>
              <p className="tool-label">Dibujo</p>
              <div className="deco-grid">
                {DECOS.map((deco) => (
                  <button
                    key={deco}
                    type="button"
                    className="choice"
                    title={DECO_LABEL[deco]}
                    onClick={() =>
                      addElement((z) => ({
                        id: cryptoId(),
                        type: "deco",
                        deco,
                        x: 50,
                        y: 80,
                        w: deco === "swatches" ? 56 : 28,
                        h: deco === "underline" || deco === "arrow" ? 12 : deco === "swatches" ? 40 : 28,
                        rotation: 0,
                        opacity: 1,
                        z,
                        color: "ink",
                      }))
                    }
                  >
                    <DecoGraphic kind={deco as DecoKind} />
                  </button>
                ))}
              </div>
            </section>
            {page ? (
              <section>
                <h2>Página</h2>
                <div className="choice-row">
                  {(["ivory", "warm", "cool"] as Tone[]).map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      className={`tone-btn tone-${tone} ${page.tone === tone ? "is-on" : ""}`}
                      onClick={() =>
                        commit(
                          (current) => patchPage(current, page.id, (item) => ({ ...item, tone })),
                          true,
                        )
                      }
                    >
                      {tone === "ivory" ? "Marfil" : tone === "warm" ? "Cálido" : "Fresco"}
                    </button>
                  ))}
                </div>
                <div className="tool-grid">
                  <button type="button" className="quiet-btn" onClick={() => movePage(-1)} disabled={doc.pages[0]?.id === page.id}>
                    Subir
                  </button>
                  <button
                    type="button"
                    className="quiet-btn"
                    onClick={() => movePage(1)}
                    disabled={doc.pages[doc.pages.length - 1]?.id === page.id}
                  >
                    Bajar
                  </button>
                  <button
                    type="button"
                    className="quiet-btn"
                    onClick={() => {
                      const copy: LogPage = {
                        ...page,
                        id: cryptoId(),
                        elements: page.elements.map((el) => ({
                          ...el,
                          id: cryptoId(),
                          look: el.look ? { ...el.look } : undefined,
                        })),
                      };
                      commit((current) => {
                        const index = current.pages.findIndex((item) => item.id === page.id);
                        const pages = current.pages.slice();
                        pages.splice(index + 1, 0, copy);
                        return { ...current, pages };
                      }, true);
                      setPageId(copy.id);
                    }}
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    className="quiet-btn danger"
                    disabled={doc.pages.length < 2}
                    onClick={() => {
                      commit((current) => ({ ...current, pages: current.pages.filter((item) => item.id !== page.id) }), true);
                      const index = doc.pages.findIndex((item) => item.id === page.id);
                      const neighbor = doc.pages[index - 1] ?? doc.pages[index + 1];
                      setPageId(neighbor?.id ?? "cover");
                      setSelectedId(null);
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </section>
            ) : null}
            <section>
              <h2>Elemento</h2>
              {selected ? (
                <ElementFields
                  el={selected}
                  onChange={(partial, record) =>
                    commit(
                      (current) =>
                        patchPage(current, pageId, (item) => ({
                          ...item,
                          elements: item.elements.map((el) => (el.id === selected.id ? { ...el, ...partial } : el)),
                        })),
                      record,
                    )
                  }
                  onLayer={(mode) =>
                    commit(
                      (current) =>
                        patchPage(current, pageId, (item) => ({
                          ...item,
                          elements: withZ(item.elements, selected.id, mode),
                        })),
                      true,
                    )
                  }
                  onDuplicate={duplicateSelected}
                  onDelete={() => {
                    commit(
                      (current) =>
                        patchPage(current, pageId, (item) => ({
                          ...item,
                          elements: item.elements.filter((el) => el.id !== selected.id),
                        })),
                      true,
                    );
                    setSelectedId(null);
                  }}
                />
              ) : (
                <p className="dialog-copy">Selecciona algo en la página, o suelta varias imágenes a la vez.</p>
              )}
            </section>
          </>
        )}
      </aside>
      <input
        ref={fileRef}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          void ingest(files, "page");
        }}
      />
      <input
        ref={coverFileRef}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          event.target.value = "";
          void ingest(files, "cover");
        }}
      />
    </div>
  );

  function movePage(dir: -1 | 1) {
    if (!page) return;
    commit((current) => {
      const index = current.pages.findIndex((item) => item.id === page.id);
      const next = index + dir;
      if (index < 0 || next < 0 || next >= current.pages.length) return current;
      const pages = current.pages.slice();
      const [item] = pages.splice(index, 1);
      if (!item) return current;
      pages.splice(next, 0, item);
      return { ...current, pages };
    }, true);
  }
}

function DeskFields({
  desk,
  onChange,
}: {
  desk: DeskId;
  onChange: (desk: DeskId) => void;
}) {
  return (
    <section>
      <h2>Fondo</h2>
      <p className="dialog-copy">El color de la mesa donde descansa el cuaderno.</p>
      <div className="choice-row">
        {DESKS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`desk-swatch desk-${item.id} ${desk === item.id ? "is-on" : ""}`}
            aria-label={item.label}
            title={item.label}
            onClick={() => onChange(item.id)}
          />
        ))}
      </div>
    </section>
  );
}

function BackFields({
  back,
  onChange,
}: {
  back: LogbookDoc["back"];
  onChange: (partial: Partial<LogbookDoc["back"]>) => void;
}) {
  return (
    <section>
      <h2>Contraportada</h2>
      <p className="dialog-copy">
        Es la tapa de atrás, otra pieza. No repite el título ni la fecha de la portada. Si escribes una nota, sale a mano sobre la tela.
      </p>
      <label className="field">
        <span>Nota</span>
        <textarea
          value={back.note}
          maxLength={240}
          rows={4}
          onChange={(event) => onChange({ note: event.target.value })}
        />
      </label>
      <p className="tool-label">Tela</p>
      <div className="choice-row">
        <button
          type="button"
          className={`tone-btn ${back.cloth === "same" ? "is-on" : ""}`}
          onClick={() => onChange({ cloth: "same" })}
        >
          Igual
        </button>
        {(["olive", "ink", "brick", "kraft"] as Cloth[]).map((cloth) => (
          <button
            key={cloth}
            type="button"
            className={`tone-btn cloth-${cloth} ${back.cloth === cloth ? "is-on" : ""}`}
            onClick={() => onChange({ cloth })}
          >
            {cloth === "olive" ? "Oliva" : cloth === "ink" ? "Tinta" : cloth === "brick" ? "Ladrillo" : "Kraft"}
          </button>
        ))}
      </div>
    </section>
  );
}

function CoverFields({
  cover,
  onChange,
  onUpload,
  onClear,
}: {
  cover: LogbookDoc["cover"];
  onChange: (partial: Partial<LogbookDoc["cover"]>) => void;
  onUpload: () => void;
  onClear: () => void;
}) {
  return (
    <section>
      <h2>Portada</h2>
      <p className="dialog-copy">Sube tu ilustración. El cuaderno no inventa una imagen en su lugar.</p>
      <label className="field">
        <span>Título</span>
        <input value={cover.title} maxLength={80} onChange={(event) => onChange({ title: event.target.value })} />
      </label>
      <label className="field">
        <span>Subtítulo</span>
        <input value={cover.subtitle} maxLength={120} onChange={(event) => onChange({ subtitle: event.target.value })} />
      </label>
      <label className="field">
        <span>Autor</span>
        <input value={cover.author} maxLength={80} onChange={(event) => onChange({ author: event.target.value })} />
      </label>
      <label className="field">
        <span>Fecha</span>
        <input value={cover.date} maxLength={40} onChange={(event) => onChange({ date: event.target.value })} />
      </label>
      <label className="field">
        <span>Nota</span>
        <input value={cover.note} maxLength={160} onChange={(event) => onChange({ note: event.target.value })} />
      </label>
      <label className="check">
        <input type="checkbox" checked={cover.showText} onChange={(event) => onChange({ showText: event.target.checked })} />
        Mostrar texto
      </label>
      <div className="tool-grid">
        <button
          type="button"
          className={`quiet-btn ${cover.imageFit === "plate" ? "is-on" : ""}`}
          onClick={() => onChange(coverPlacement("plate", cover.imgW && cover.imgH ? cover.imgW / cover.imgH : 1))}
        >
          Lámina
        </button>
        <button
          type="button"
          className={`quiet-btn ${cover.imageFit === "full" ? "is-on" : ""}`}
          onClick={() => onChange(coverPlacement("full", cover.imgW && cover.imgH ? cover.imgW / cover.imgH : 1))}
        >
          Completa
        </button>
      </div>
      <p className="dialog-copy">Arrastra la ilustración en la portada para moverla, escalarla o rotarla. Un PNG se queda transparente.</p>
      <p className="tool-label">Tela</p>
      <div className="choice-row">
        {(["olive", "ink", "brick", "kraft"] as Cloth[]).map((cloth) => (
          <button
            key={cloth}
            type="button"
            className={`tone-btn cloth-${cloth} ${cover.cloth === cloth ? "is-on" : ""}`}
            onClick={() => onChange({ cloth })}
          >
            {cloth === "olive" ? "Oliva" : cloth === "ink" ? "Tinta" : cloth === "brick" ? "Ladrillo" : "Kraft"}
          </button>
        ))}
      </div>
      <div className="tool-grid">
        <button type="button" className="ink-btn" onClick={onUpload}>
          Subir ilustración
        </button>
        {cover.assetId ? (
          <button type="button" className="quiet-btn danger" onClick={onClear}>
            Quitar imagen
          </button>
        ) : null}
      </div>
    </section>
  );
}

function ElementFields({
  el,
  onChange,
  onLayer,
  onDuplicate,
  onDelete,
}: {
  el: LogElement;
  onChange: (partial: Partial<LogElement>, record: boolean) => void;
  onLayer: (mode: "front" | "forward" | "back" | "backward") => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const yPct = Math.round((el.y / RATIO) * 10) / 10;
  const hPct = Math.round((el.h / RATIO) * 10) / 10;
  return (
    <div className="element-fields">
      <p className="tool-label">
        {el.type === "image" ? "Imagen" : el.type === "text" ? "Texto" : el.type === "tape" ? "Cinta" : "Dibujo"}
      </p>
      {el.type === "text" ? (
        <>
          <label className="field">
            <span>Texto</span>
            <textarea value={el.text ?? ""} rows={4} onChange={(event) => onChange({ text: event.target.value.slice(0, 2000) }, false)} />
          </label>
          <div className="font-groups">
            {FONT_GROUPS.map((group) => (
              <div key={group.id} className="font-group">
                <h3>{group.label}</h3>
                {group.fonts.map((font) => (
                  <button
                    key={font.id}
                    type="button"
                    className={`font-pick ${resolveFont(el.font) === font.id ? "is-on" : ""}`}
                    style={{ fontFamily: font.family }}
                    onClick={() => onChange({ font: font.id }, true)}
                  >
                    <small>{font.name}</small>
                    <span>Diseño 2026</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <label className="field">
            <span>Tamaño {el.fontSize?.toFixed(1)}</span>
            <input
              type="range"
              min={1.6}
              max={18}
              step={0.1}
              value={el.fontSize ?? 5}
              onPointerDown={() => onChange({}, true)}
              onChange={(event) => onChange({ fontSize: Number(event.target.value) }, false)}
            />
          </label>
          <div className="tool-grid">
            {(["left", "center", "right"] as const).map((align) => (
              <button key={align} type="button" className={`quiet-btn ${el.align === align ? "is-on" : ""}`} onClick={() => onChange({ align }, true)}>
                {align === "left" ? "Izq" : align === "center" ? "Centro" : "Der"}
              </button>
            ))}
          </div>
          <label className="check">
            <input type="checkbox" checked={Boolean(el.bold)} onChange={(event) => onChange({ bold: event.target.checked }, true)} />
            Negrita
          </label>
        </>
      ) : null}
      {el.type === "text" || el.type === "deco" ? (
        <div className="swatches">
          {INKS.map((ink) => (
            <button
              key={ink}
              type="button"
              title={INK_LABEL[ink]}
              className={`swatch swatch-${ink} ${el.color === ink ? "is-on" : ""}`}
              onClick={() => onChange({ color: ink as InkName }, true)}
            />
          ))}
        </div>
      ) : null}
      {el.type === "tape" ? (
        <div className="choice-row">
          {TAPES.map((tape) => (
            <button
              key={tape}
              type="button"
              title={TAPE_LABEL[tape]}
              className={`choice ${el.tape === tape ? "is-on" : ""}`}
              onClick={() => onChange({ tape: tape as TapeKind }, true)}
            >
              <i className={`tape tape-${tape}`} />
            </button>
          ))}
        </div>
      ) : null}
      {el.type === "image" && el.look ? (
        <div className="looks">
          {(
            [
              ["shadow", "Sombra de papel"],
              ["frame", "Borde blanco"],
              ["scan", "Textura de escaneo"],
              ["torn", "Borde imperfecto"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="check">
              <input
                type="checkbox"
                checked={el.look?.[key] ?? false}
                onChange={(event) => onChange({ look: { ...el.look!, [key]: event.target.checked } }, true)}
              />
              {label}
            </label>
          ))}
          <label className="field">
            <span>Desaturar {Math.round((el.look.fade ?? 0) * 100)}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={el.look.fade}
              onPointerDown={() => onChange({}, true)}
              onChange={(event) => onChange({ look: { ...el.look!, fade: Number(event.target.value) } }, false)}
            />
          </label>
        </div>
      ) : null}
      <label className="field">
        <span>Horizontal {Math.round(el.x)}</span>
        <input type="range" min={-10} max={110} value={el.x} onPointerDown={() => onChange({}, true)} onChange={(event) => onChange({ x: Number(event.target.value) }, false)} />
      </label>
      <label className="field">
        <span>Vertical {Math.round(yPct)}</span>
        <input
          type="range"
          min={-5}
          max={105}
          value={yPct}
          onPointerDown={() => onChange({}, true)}
          onChange={(event) => onChange({ y: Number(event.target.value) * RATIO }, false)}
        />
      </label>
      <label className="field">
        <span>Ancho {Math.round(el.w)}</span>
        <input
          type="range"
          min={6}
          max={120}
          value={el.w}
          onPointerDown={() => onChange({}, true)}
          onChange={(event) => {
            const w = Number(event.target.value);
            const partial: Partial<LogElement> = { w };
            if (el.type === "image" && el.naturalW && el.naturalH) partial.h = (w * el.naturalH) / el.naturalW;
            onChange(partial, false);
          }}
        />
      </label>
      {el.type !== "image" ? (
        <label className="field">
          <span>Alto {Math.round(hPct)}</span>
          <input
            type="range"
            min={3}
            max={100}
            value={hPct}
            onPointerDown={() => onChange({}, true)}
            onChange={(event) => onChange({ h: Number(event.target.value) * RATIO }, false)}
          />
        </label>
      ) : null}
      <label className="field">
        <span>Rotación {Math.round(el.rotation)}°</span>
        <input type="range" min={-180} max={180} value={el.rotation} onPointerDown={() => onChange({}, true)} onChange={(event) => onChange({ rotation: Number(event.target.value) }, false)} />
      </label>
      <label className="field">
        <span>Opacidad {Math.round(el.opacity * 100)}</span>
        <input type="range" min={0.15} max={1} step={0.01} value={el.opacity} onPointerDown={() => onChange({}, true)} onChange={(event) => onChange({ opacity: Number(event.target.value) }, false)} />
      </label>
      <p className="tool-label">Capa</p>
      <div className="tool-grid">
        <button type="button" className="quiet-btn" onClick={() => onLayer("front")}>Frente</button>
        <button type="button" className="quiet-btn" onClick={() => onLayer("forward")}>Subir</button>
        <button type="button" className="quiet-btn" onClick={() => onLayer("backward")}>Bajar</button>
        <button type="button" className="quiet-btn" onClick={() => onLayer("back")}>Fondo</button>
      </div>
      <div className="tool-grid">
        <button type="button" className="quiet-btn" onClick={onDuplicate}>Duplicar</button>
        <button type="button" className="quiet-btn danger" onClick={onDelete}>Eliminar</button>
      </div>
    </div>
  );
}
