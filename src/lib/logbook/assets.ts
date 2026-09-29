import { getOwnerAssets, getPublicAssets } from "@/lib/logbook/api";

export type AssetMode = "public" | "owner";
export type AssetVariant = "full" | "thumb";

const mem = new Map<string, string>();
const misses = new Set<string>();

function key(mode: AssetMode, variant: AssetVariant, id: string) {
  return `${mode}:${variant}:${id}`;
}

export function rememberAsset(
  mode: AssetMode,
  id: string,
  fullUrl: string,
  thumbUrl?: string,
) {
  mem.set(key(mode, "full", id), fullUrl);
  if (thumbUrl) mem.set(key(mode, "thumb", id), thumbUrl);
  misses.delete(key(mode, "full", id));
  misses.delete(key(mode, "thumb", id));
}

export function peekAsset(mode: AssetMode, variant: AssetVariant, id: string) {
  return mem.get(key(mode, variant, id));
}

export async function loadAssets(
  mode: AssetMode,
  variant: AssetVariant,
  ids: string[],
  onOne: (id: string, url: string) => void,
) {
  const missing: string[] = [];
  for (const id of ids) {
    if (!id) continue;
    const hit = mem.get(key(mode, variant, id));
    if (hit) {
      onOne(id, hit);
      continue;
    }
    if (misses.has(key(mode, variant, id))) continue;
    missing.push(id);
  }
  const fetchBatch = mode === "public" ? getPublicAssets : getOwnerAssets;
  for (let i = 0; i < missing.length; i += 4) {
    const chunk = missing.slice(i, i + 4);
    try {
      const res = await fetchBatch({ data: { ids: chunk, variant } });
      const found = new Set<string>();
      for (const row of res.assets) {
        found.add(row.id);
        mem.set(key(mode, variant, row.id), row.dataUrl);
        onOne(row.id, row.dataUrl);
      }
      for (const id of chunk) {
        if (!found.has(id)) misses.add(key(mode, variant, id));
      }
    } catch {
      for (const id of chunk) misses.add(key(mode, variant, id));
    }
  }
}

function canvasOf(source: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("No se pudo preparar la imagen");
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  return { canvas, ctx };
}

function hasAlpha(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const step = Math.max(4, Math.floor(pixels.length / 4 / 4000)) * 4;
  for (let i = 3; i < pixels.length; i += step) {
    if (pixels[i] < 250) return true;
  }
  return false;
}

export async function compressImage(file: File): Promise<{
  mime: string;
  dataUrl: string;
  thumb: string;
  width: number;
  height: number;
}> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    throw new Error("Usa PNG, JPG o WebP.");
  }
  const bitmap = await createImageBitmap(file);
  const draw = (maxEdge: number) => {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    return canvasOf(bitmap, width, height);
  };
  let { canvas, ctx } = draw(1600);
  const alpha = hasAlpha(ctx, canvas.width, canvas.height);
  let mime = alpha ? "image/png" : "image/jpeg";
  let dataUrl = alpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.84);
  if (dataUrl.length > 1_500_000) {
    ({ canvas, ctx } = draw(1100));
    dataUrl = alpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.78);
    mime = alpha ? "image/png" : "image/jpeg";
  }
  if (dataUrl.length > 1_650_000 && !alpha) {
    ({ canvas, ctx } = draw(900));
    dataUrl = canvas.toDataURL("image/jpeg", 0.72);
    mime = "image/jpeg";
  }
  if (dataUrl.length > 1_650_000) {
    bitmap.close();
    throw new Error("La imagen sigue siendo muy pesada.");
  }
  const thumbMax = 320;
  const thumbScale = Math.min(1, thumbMax / Math.max(canvas.width, canvas.height));
  const tw = Math.max(1, Math.round(canvas.width * thumbScale));
  const th = Math.max(1, Math.round(canvas.height * thumbScale));
  const thumbCanvas = canvasOf(canvas, tw, th).canvas;
  const thumb = alpha
    ? thumbCanvas.toDataURL("image/png")
    : thumbCanvas.toDataURL("image/jpeg", 0.72);
  const width = canvas.width;
  const height = canvas.height;
  bitmap.close();
  return { mime, dataUrl, thumb, width, height };
}
