// Token Radar: a sealed snapshot in, a ranked board and a dossier out.
//
// Run with Node 22 or newer and nothing else installed. The program reads the
// snapshot (a sealed DefiLlama protocol index), scores every pre-token protocol
// with the model in lib/model.ts, and writes the ranked board, the dashboard's
// data script, the dashboard files and the screenshots into the output
// directory, then the dossier the judge reads. The dossier is rebuilt from
// that same output directory, so what the scorer sees is what this program
// wrote — there is no second copy of the truth.
//
// The output directory is /output inside the grader's container. Anywhere
// else, MAKEFUN_OUTPUT_DIR stands in for it:
//   MAKEFUN_OUTPUT_DIR=out node main.ts --input ../token-radar-01-kit/input/snapshot.json

import * as fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  boardIssue,
  buildRadar,
  dataScript,
  parseSnapshot,
} from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

/** Where this file lives: dashboard/ and screenshots/ are copied from beside it. */
const here = dirname(fileURLToPath(import.meta.url));

/** The dossier's text cap (contracts/dossier.ts): the text shapes the bytes, the rest refuse. */
const DOSSIER_TEXT_CAP = 65_536;
/** How many screenshots the dossier allows, and how large each may be. */
const SHOT_LIMIT = { max: 4, max_bytes: 524_288 };
/** A plain image name: a letter, digit or _ first, then letters, digits and . _ -. */
const IMAGE_NAME = new RegExp('^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$');

/** The value of `--name <value>` on the command line, or the fallback when absent. */
function flag(name: string, fallback: string): string {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === `--${name}` && i + 1 < args.length) return args[i + 1]!;
    const joined = args[i]!;
    if (joined.startsWith(`--${name}=`)) return joined.slice(name.length + 3);
  }
  return fallback;
}

/** The snapshot file: a .json path as given, or snapshot.json inside a directory. */
function resolveInput(given: string): string {
  return given.endsWith('.json') ? given : join(given, 'snapshot.json');
}

/**
 * Copy one directory's regular files into `to`, skipping dot-names and anything
 * that is not a file. Returns the names copied, in directory order.
 */
function copyPlainFiles(from: string, to: string): string[] {
  if (!fs.existsSync(from)) return [];
  fs.mkdirSync(to, { recursive: true });
  const names: string[] = [];
  for (const name of fs.readdirSync(from)) {
    if (name.startsWith('.')) continue;
    const path = join(from, name);
    if (!fs.statSync(path).isFile()) continue;
    fs.copyFileSync(path, join(to, name));
    names.push(name);
  }
  return names;
}

function main(): void {
  const inputPath = resolveInput(flag('input', '/input'));
  if (!fs.existsSync(inputPath)) {
    process.stderr.write(
      `token radar: cannot find a snapshot at ${inputPath}: pass --input <snapshot.json|directory> or mount the sealed /input\n`,
    );
    process.exit(2);
  }
  const outDir = flag('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

  const snapshot = parseSnapshot(fs.readFileSync(inputPath, 'utf8'));
  const { board, radar } = buildRadar(snapshot);
  const issue = boardIssue(board, snapshot);
  if (issue !== null) {
    process.stderr.write(`token radar: refusing a board the gate would not take: ${issue}\n`);
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(join(outDir, 'board.json'), JSON.stringify({ rows: board }) + '\n');
  fs.writeFileSync(join(outDir, 'data.js'), dataScript(radar));

  copyPlainFiles(join(here, 'dashboard'), join(outDir, 'dashboard'));
  const shots = copyPlainFiles(join(here, 'screenshots'), join(outDir, 'screenshots'));
  if (shots.length < 3) {
    process.stderr.write(
      `token radar: screenshots/ holds ${shots.length} image${shots.length === 1 ? '' : 's'}: hand in 3, the board, a detail view and a filtered view\n`,
    );
    process.exit(1);
  }
  for (const name of shots) {
    if (!IMAGE_NAME.test(name)) {
      process.stderr.write(
        `token radar: screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters\n`,
      );
      process.exit(1);
    }
  }

  // The dossier is written last, from this same output, so the scorer's rebuild
  // of it is byte for byte what this program wrote.
  fs.writeFileSync(
    join(outDir, 'dossier.json'),
    buildDossier(outDir, {
      text_max_bytes: DOSSIER_TEXT_CAP,
      screenshots: SHOT_LIMIT,
      dashboard: { max_files: 400, max_bytes: 4_194_304 },
    }),
  );

  process.stdout.write(
    `token radar: ${snapshot.protocols.length} protocols in the snapshot, ${snapshot.watchlist.length} on the watchlist, ${board.length} rows scored (${radar.early_size} early, ${radar.live_size} live set aside)\n` +
      `token radar: wrote ${join(outDir, 'board.json')}, ${join(outDir, 'data.js')}, ${join(outDir, 'dashboard')} (3 files), ${join(outDir, 'screenshots')} (${shots.length} images) and ${join(outDir, 'dossier.json')}\n`,
  );
}

main();
