// Leonida Platinum — an offline GTA 6 trophy guide and tracker.
// Entry for make.fun competition gta6-trophy-guide-01 (Node 22, stdlib only).
//
// The guide itself is plain static files under app/: index.html opens in a
// desktop browser and works with the network off, and app/data/trophies.json
// holds all 55 official PlayStation 5 trophies with a guide for each one.
// This program hands the guide in: it copies app/ and screenshots/ from
// this repository into the output directory and writes dossier.json there,
// using the vendored make.fun library (vendor/makefun-frontend.ts, the
// kit's copy, unchanged — the scorer rebuilds the dossier with its own
// copy and the two must match byte for byte).
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the guide locally with any static server rooted at app/.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), {
    recursive: true,
  });
}

writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
