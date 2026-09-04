#!/usr/bin/env node
/**
 * madweb fork: relocate the default-locale (Italian) export to the site root.
 *
 * pdf.madweb.it is an Italian product: `pdf.madweb.it/about/` reads better than
 * `pdf.madweb.it/it/about/` on a .it domain. next build still emits Italian under
 * out/it/ (next-intl's [locale] segment); this postbuild step moves those files
 * to the root so bare URLs are served directly by nginx, while English keeps its
 * /en/ prefix. Legacy /it/... URLs are redirected by nginx (301).
 *
 * Safety: refuses to overwrite existing files at the destination (except for
 * Next.js artifacts that are expected to collide: the old root redirect page).
 */

import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.argv[2] || 'out');
const DEFAULT_LOCALE = process.argv[3] || 'it';
const SRC = path.join(OUT, DEFAULT_LOCALE);

if (!fs.existsSync(SRC) || !fs.statSync(SRC).isDirectory()) {
  console.error(`[relocate] ${SRC} not found — nothing to relocate.`);
  process.exit(1);
}

// Expected collisions when re-running or when the old root redirect existed.
const OVERWRITABLE = new Set(['index.html', 'index.txt', 'index.meta']);

let moved = 0;
let overwritten = 0;

function relocate(srcEntry, destEntry) {
  const stat = fs.lstatSync(srcEntry);
  if (stat.isDirectory()) {
    fs.mkdirSync(destEntry, { recursive: true });
    for (const name of fs.readdirSync(srcEntry)) {
      relocate(path.join(srcEntry, name), path.join(destEntry, name));
    }
    return;
  }
  if (fs.existsSync(destEntry)) {
    if (!OVERWRITABLE.has(path.basename(destEntry))) {
      console.error(`[relocate] refusing to overwrite unexpected file: ${destEntry}`);
      process.exit(1);
    }
    overwritten += 1;
  }
  fs.renameSync(srcEntry, destEntry);
  moved += 1;
}

for (const name of fs.readdirSync(SRC)) {
  relocate(path.join(SRC, name), path.join(OUT, name));
}

fs.rmSync(SRC, { recursive: true, force: true });

console.log(
  `[relocate] moved ${moved} files from out/${DEFAULT_LOCALE}/ to the export root ` +
    `(${overwritten} overwritable artifacts replaced).`
);
