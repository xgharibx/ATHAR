/**
 * Merge multiple adhkar JSON databases into one.
 *
 * Usage:
 *   node tools/scripts/merge-db.mjs base.json extra1.json extra2.json --out merged.json
 *
 * Notes:
 * - Expected format: { "sections": [ { "id": "...", "title": "...", "content": [ ... ] } ] }
 * - If IDs collide, the extra section is namespaced with a suffix.
 */
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outPath = outIdx >= 0 ? args[outIdx + 1] : "merged.json";
const files = outIdx >= 0 ? args.slice(0, outIdx) : args;

if (files.length < 2) {
  console.log("Provide at least 2 files: base + extras");
  process.exit(1);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const base = readJson(files[0]);
const merged = { sections: [...(base.sections ?? [])] };
const used = new Set(merged.sections.map((s) => s.id));

for (let i = 1; i < files.length; i++) {
  const extra = readJson(files[i]);
  for (const sec of extra.sections ?? []) {
    let id = sec.id;
    if (used.has(id)) id = `${id}__extra${i}`;
    used.add(id);
    merged.sections.push({ ...sec, id });
  }
}

fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), "utf8");
console.log(`Merged -> ${outPath} (sections: ${merged.sections.length})`);
