// Leonida Trophy Guide — gta6-trophy-guide-01 entry (Node 22, standard
// library only). The guide is this directory's app/ folder: plain static
// files a browser opens at app/index.html (ES module, CSS, no build step),
// offline — it loads nothing over the network — and its trophy list and
// guides are app/data/trophies.json. This program hands it in: it copies
// app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library. Leave vendor/makefun-frontend.ts as it is: the scorer
// requires dossier.json to be byte for byte what its own copy writes.
//
// The output directory is cleared by emptying its contents, never by
// removing the directory itself: in the grader /output is a volume mount
// point, and rmSync on a mount point throws EBUSY (force: true does not
// suppress it), which would exit 1. Clearing the contents works on a mount
// point and on a plain directory alike.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The repository directory comes from this file's own location, not from
// the working directory: the grader runs `node /bot/main.ts` from its own
// cwd, so process.cwd() is not the repository.
const repoDir = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Clear only the output directory's contents, never the directory itself
// (see the note above: the grader's /output is a mount point).
mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}

cpSync(join(repoDir, 'app'), join(outDir, 'app'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the others
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files and directories in app/ or 48 MiB of
// app files).
writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
