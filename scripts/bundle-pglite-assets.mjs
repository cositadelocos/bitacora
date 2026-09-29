#!/usr/bin/env node
/**
 * Nitro's Vercel preset bundles PGLite but does not emit the WASM payload.
 * At runtime the function looks for `/var/task/_libs/pglite.data` (and the two
 * wasm files) next to `electric-sql__pglite.mjs` and crashes with ENOENT if
 * they are missing — which is what a GitHub → Vercel deploy hits when
 * DATABASE_URL is unset and the app falls back to PGLite.
 *
 * Copy the three files into every `_libs` directory of the build output.
 * Real copies, not symlinks: Vercel does not follow links back into
 * node_modules.
 */
import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "node_modules/@electric-sql/pglite/dist");
const OUT = join(ROOT, ".vercel/output/functions");
const ASSETS = ["pglite.data", "pglite.wasm", "initdb.wasm"];

async function findLibs(dir, found) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const next = join(dir, entry.name);
    if (entry.name === "_libs") found.push(next);
    else await findLibs(next, found);
  }
}

async function main() {
  const libs = [];
  await findLibs(OUT, libs);
  if (libs.length === 0) {
    console.log("[pglite] no _libs directory in the build output — skipping.");
    return;
  }
  for (const dir of libs) {
    await mkdir(dir, { recursive: true });
    for (const name of ASSETS) {
      const dest = join(dir, name);
      await rm(dest, { force: true });
      await copyFile(join(SRC, name), dest);
    }
    console.log(`[pglite] copied ${ASSETS.join(", ")} → ${dir}`);
  }
}

main().catch((err) => {
  console.error("[pglite] failed to copy runtime assets:", err);
  process.exit(1);
});
