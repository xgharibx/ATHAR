/**
 * Quick validation for adhkar.json shape (lightweight).
 * Usage:
 *   node tools/scripts/validate-db.mjs public/data/adhkar.json
 */
import fs from "node:fs";

const file = process.argv[2];
if (!file) {
  console.log("Usage: node tools/scripts/validate-db.mjs <adhkar.json>");
  process.exit(1);
}

const json = JSON.parse(fs.readFileSync(file, "utf8"));
if (!json.sections || !Array.isArray(json.sections)) throw new Error("Missing sections[]");

for (const s of json.sections) {
  if (!s.id || !s.title) throw new Error("Section must have id + title");
  if (!Array.isArray(s.content)) throw new Error(`Section ${s.id} missing content[]`);
  for (const it of s.content) {
    if (typeof it.text !== "string") throw new Error(`Item missing text in section ${s.id}`);
  }
}

console.log("OK ✓", { sections: json.sections.length });
