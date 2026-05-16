/**
 * Reorders PROPHET_STORIES array chronologically and removes duplicate stubs.
 * Run: node tools/scripts/reorder-prophets.mjs
 */
import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/data/prophetStories.ts';
const content = readFileSync(filePath, 'utf8');

// ── Find the opening of the array ──────────────────────────────────────────
const ARRAY_MARKER = 'export const PROPHET_STORIES: ProphetStory[] = [';
const markerIdx = content.indexOf(ARRAY_MARKER);
if (markerIdx === -1) throw new Error('Array marker not found');

// Everything up to and including the opening "["
const headerEnd = content.indexOf('[', markerIdx) + 1;
const before = content.substring(0, headerEnd);

// ── Find the closing ]; ─────────────────────────────────────────────────────
const closingIdx = content.lastIndexOf('\n];');
const after = content.substring(closingIdx); // "\n];" + anything after

const arrayBody = content.substring(headerEnd, closingIdx);

// ── Parse individual entries by brace-counting (respects backtick strings) ─
const entries = [];
let pos = 0;

while (pos < arrayBody.length) {
  // Seek next top-level '{'
  while (pos < arrayBody.length && arrayBody[pos] !== '{') pos++;
  if (pos >= arrayBody.length) break;

  let depth = 0;
  let start = pos;
  let inBacktick = false;

  for (let j = pos; j < arrayBody.length; j++) {
    const ch = arrayBody[j];
    if (ch === '`') inBacktick = !inBacktick;
    if (!inBacktick) {
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          const text = arrayBody.substring(start, j + 1);
          // id is always the very first field
          const m = text.match(/^\{\s*\n\s*id:\s*"([^"]+)"/);
          if (m) entries.push({ id: m[1], text });
          pos = j + 1;
          break;
        }
      }
    }
  }
}

console.log('Parsed entries:', entries.map(e => e.id));

// ── Define correct chronological order; omit duplicates ────────────────────
const ORDERED_IDS = [
  'adam',        // أول الخليقة
  'idris',       // قبل نوح
  'nuh',         // ~3000 ق.م
  'hud',         // قوم عاد — بعد الطوفان
  'salih',       // قوم ثمود
  'ibrahim',     // ~1900 ق.م
  'lut',         // معاصر إبراهيم
  'ismail',      // ~1850 ق.م
  'yusuf',       // ~1750 ق.م
  'ayyub',       // ~1600 ق.م
  'shuaib',      // قبيل موسى — أهل مدين
  'musa',        // ~1300 ق.م
  'dhul_kifl',   // غير محدد — مذكور مع أيوب
  'dawud',       // ~1000 ق.م
  'sulayman',    // ~970 ق.م
  'ilyas',       // ~900 ق.م
  'al_yasa',     // ~850 ق.م
  'yunus',       // ~750 ق.م
  'zakariya',    // قبيل الميلاد
  'yahya',       // معاصر عيسى
  'isa',         // ~4 ق.م
  'muhammad',    // 570-632 م
  // dawud_extended + sulaiman_extended → intentionally omitted (duplicates)
];

const byId = Object.fromEntries(entries.map(e => [e.id, e]));

// Validate
const missing = ORDERED_IDS.filter(id => !byId[id]);
if (missing.length) throw new Error('Missing entries: ' + missing.join(', '));

const removed = entries.filter(e => !ORDERED_IDS.includes(e.id)).map(e => e.id);
console.log('Removing duplicates:', removed);

// ── Reassemble ─────────────────────────────────────────────────────────────
const reorderedBody = ORDERED_IDS.map(id => '\n  ' + byId[id].text).join(',');

const newContent = before + reorderedBody + ',\n' + after.trimStart();
writeFileSync(filePath, newContent, 'utf8');
console.log('Done. Wrote', filePath);
