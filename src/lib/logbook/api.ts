import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { assetIds, parseDoc, seedDoc, type LogbookDoc } from "@/lib/logbook/model";

type Sql = Awaited<ReturnType<typeof import("@/lib/db").getSql>>;

async function db() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

function stamp(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

function asDoc(value: unknown): LogbookDoc {
  const raw = typeof value === "string" ? JSON.parse(value) : value;
  return parseDoc(raw);
}

async function ensure(sql: Sql) {
  const rows = await sql<{ id: number }>`select id from logbook where id = 1`;
  if (rows.length) return;
  const seed = JSON.stringify(seedDoc());
  await sql.query(
    `insert into logbook (id, owner_id, draft, published, published_at)
     values (1, null, $1::jsonb, $1::jsonb, now())
     on conflict (id) do nothing`,
    [seed],
  );
}

export const getPublished = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await db();
  await ensure(sql);
  const rows = await sql<{
    published: unknown;
    published_at: unknown;
    owner_id: string | null;
  }>`select published, published_at, owner_id from logbook where id = 1`;
  const row = rows[0];
  return {
    doc: row ? asDoc(row.published) : seedDoc(),
    publishedAt: row ? stamp(row.published_at) : null,
    hasAuthor: Boolean(row?.owner_id),
  };
});

export const getRole = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    await ensure(sql);
    const rows = await sql<{ owner_id: string | null }>`select owner_id from logbook where id = 1`;
    const owner = rows[0]?.owner_id ?? null;
    return { canEdit: !owner || owner === context.userId };
  });

export const getDraft = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    await ensure(sql);
    const rows = await sql<{
      owner_id: string | null;
      draft: unknown;
      published_at: unknown;
    }>`select owner_id, draft, published_at from logbook where id = 1`;
    const row = rows[0];
    if (!row) return { canEdit: false as const };
    if (row.owner_id && row.owner_id !== context.userId) return { canEdit: false as const };
    return {
      canEdit: true as const,
      doc: asDoc(row.draft),
      claimed: Boolean(row.owner_id),
      publishedAt: stamp(row.published_at),
    };
  });

async function claim(sql: Sql, userId: string) {
  const rows = await sql<{ owner_id: string | null }>`select owner_id from logbook where id = 1`;
  const owner = rows[0]?.owner_id ?? null;
  if (owner && owner !== userId) return false;
  if (!owner) {
    await sql.query(`update logbook set owner_id = $1 where id = 1 and owner_id is null`, [userId]);
  }
  return true;
}

export const saveDraft = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) => {
    let doc: LogbookDoc;
    try {
      doc = parseDoc(data);
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : "No se pudo leer el cuaderno",
      };
    }
    const sql = await db();
    await ensure(sql);
    const updated = await sql.query<{ id: number }>(
      `update logbook
         set draft = $1::jsonb,
             updated_at = now(),
             owner_id = coalesce(owner_id, $2)
       where id = 1 and (owner_id is null or owner_id = $2)
       returning id`,
      [JSON.stringify(doc), context.userId],
    );
    if (!updated.length) {
      return { ok: false as const, message: "No puedes editar esta bitácora." };
    }
    return { ok: true as const };
  });

export const publishBook = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await db();
    await ensure(sql);
    const updated = await sql.query<{ published: unknown }>(
      `update logbook
         set published = draft,
             published_at = now(),
             owner_id = coalesce(owner_id, $1),
             updated_at = now()
       where id = 1 and (owner_id is null or owner_id = $1)
       returning published`,
      [context.userId],
    );
    if (!updated.length) {
      return { ok: false as const, message: "No puedes publicar esta bitácora." };
    }
    const doc = asDoc(updated[0].published);
    const ids = assetIds(doc);
    await sql.query(
      `update logbook_assets
         set is_public = (id = any($1::text[]))
       where owner_id = $2`,
      [ids.length ? ids : ["__none__"], context.userId],
    );
    return { ok: true as const, publishedAt: new Date().toISOString() };
  });

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export const uploadAsset = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => data)
  .handler(async ({ context, data }) => {
    const body = data as {
      id?: string;
      mime?: string;
      dataUrl?: string;
      thumb?: string;
      width?: number;
      height?: number;
    };
    const id = typeof body.id === "string" ? body.id.slice(0, 80) : "";
    const mime = typeof body.mime === "string" ? body.mime : "";
    const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
    const thumb = typeof body.thumb === "string" ? body.thumb : "";
    if (!/^[a-zA-Z0-9-]{8,80}$/.test(id)) {
      return { ok: false as const, message: "Identificador de imagen no válido." };
    }
    if (!ALLOWED_MIME.has(mime) || !dataUrl.startsWith(`data:${mime}`)) {
      return { ok: false as const, message: "Solo PNG, JPG o WebP." };
    }
    if (dataUrl.length > 1_700_000 || thumb.length > 400_000) {
      return { ok: false as const, message: "La imagen es demasiado pesada. Prueba con una más pequeña." };
    }
    const sql = await db();
    await ensure(sql);
    const allowed = await claim(sql, context.userId);
    if (!allowed) return { ok: false as const, message: "No puedes editar esta bitácora." };
    const width = Number.isFinite(body.width) ? Math.round(Number(body.width)) : null;
    const height = Number.isFinite(body.height) ? Math.round(Number(body.height)) : null;
    await sql.query(
      `insert into logbook_assets (id, owner_id, mime, data, thumb, width, height, bytes)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (id) do update
         set data = excluded.data,
             thumb = excluded.thumb,
             mime = excluded.mime,
             width = excluded.width,
             height = excluded.height,
             bytes = excluded.bytes
       where logbook_assets.owner_id = excluded.owner_id`,
      [id, context.userId, mime, dataUrl, thumb || null, width, height, dataUrl.length],
    );
    return { ok: true as const, id };
  });

function cleanIds(input: unknown) {
  const body = input as { ids?: unknown; variant?: unknown };
  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id): id is string => typeof id === "string" && id.length < 90).slice(0, 8)
    : [];
  const variant = body.variant === "thumb" ? "thumb" : "full";
  return { ids, variant };
}

export const getPublicAssets = createServerFn({ method: "POST" })
  .validator((data: unknown) => cleanIds(data))
  .handler(async ({ data }) => {
    if (!data.ids.length) return { assets: [] as { id: string; dataUrl: string }[] };
    const sql = await db();
    const column = data.variant === "thumb" ? "coalesce(thumb, data)" : "data";
    const rows = await sql.query<{ id: string; data_url: string }>(
      `select id, ${column} as data_url
         from logbook_assets
        where id = any($1::text[]) and is_public = true`,
      [data.ids],
    );
    return { assets: rows.map((row) => ({ id: row.id, dataUrl: row.data_url })) };
  });

export const getOwnerAssets = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: unknown) => cleanIds(data))
  .handler(async ({ context, data }) => {
    if (!data.ids.length) return { assets: [] as { id: string; dataUrl: string }[] };
    const sql = await db();
    const column = data.variant === "thumb" ? "coalesce(thumb, data)" : "data";
    const rows = await sql.query<{ id: string; data_url: string }>(
      `select id, ${column} as data_url
         from logbook_assets
        where id = any($1::text[]) and owner_id = $2`,
      [data.ids, context.userId],
    );
    return { assets: rows.map((row) => ({ id: row.id, dataUrl: row.data_url })) };
  });
