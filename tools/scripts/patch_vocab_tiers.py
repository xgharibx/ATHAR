#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 57: Tier progress breakdown in QuranVocab stats card."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/QuranVocab.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# Insert tier breakdown between the progress bar section and the copy button
OLD_ANCHOR = (
    '          {learned.size > 0 && (\n'
    '            <button\n'
    '              type="button"\n'
    '              className="mt-3 w-full flex items-center justify-center gap-1.5 text-[11px] py-2 rounded-xl transition opacity-60 hover:opacity-90 active:scale-95"\n'
    '              style={{ background: "var(--card-2, rgba(255,255,255,0.06))", border: "1px solid var(--stroke)" }}\n'
    '              onClick={async () => {'
)
NEW_ANCHOR = (
    '          {/* Phase 57: Tier breakdown */}\n'
    '          {learned.size > 0 && (() => {\n'
    '            const TOP_TOTAL = QURAN_VOCAB.filter((w) => w.id <= 50).length;\n'
    '            const MID_TOTAL = QURAN_VOCAB.filter((w) => w.id >= 51 && w.id <= 150).length;\n'
    '            const RARE_TOTAL = QURAN_VOCAB.filter((w) => w.id >= 151).length;\n'
    '            const topLearned = QURAN_VOCAB.filter((w) => w.id <= 50 && learned.has(w.id)).length;\n'
    '            const midLearned = QURAN_VOCAB.filter((w) => w.id >= 51 && w.id <= 150 && learned.has(w.id)).length;\n'
    '            const rareLearned = QURAN_VOCAB.filter((w) => w.id >= 151 && learned.has(w.id)).length;\n'
    '            return (\n'
    '              <div className="mt-2 space-y-1.5 mb-1">\n'
    '                {([\n'
    '                  { label: "\u0634\u0627\u0626\u0639", total: TOP_TOTAL, done: topLearned, color: "#ffd780" },\n'
    '                  { label: "\u0645\u062a\u0648\u0633\u0637", total: MID_TOTAL, done: midLearned, color: "#a78bfa" },\n'
    '                  { label: "\u0646\u0627\u062f\u0631", total: RARE_TOTAL, done: rareLearned, color: "#60a5fa" },\n'
    '                ] as const).map(({ label, total, done, color }) => (\n'
    '                  <div key={label} className="flex items-center gap-2">\n'
    '                    <span className="text-[9px] w-8 shrink-0 opacity-55 text-right">{label}</span>\n'
    '                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>\n'
    '                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${total > 0 ? Math.round((done / total) * 100) : 0}%`, background: color }} />\n'
    '                    </div>\n'
    '                    <span className="text-[9px] tabular-nums opacity-45 w-8 text-left shrink-0">{done}/{total}</span>\n'
    '                  </div>\n'
    '                ))}\n'
    '              </div>\n'
    '            );\n'
    '          })()}\n'
    '          {learned.size > 0 && (\n'
    '            <button\n'
    '              type="button"\n'
    '              className="mt-3 w-full flex items-center justify-center gap-1.5 text-[11px] py-2 rounded-xl transition opacity-60 hover:opacity-90 active:scale-95"\n'
    '              style={{ background: "var(--card-2, rgba(255,255,255,0.06))", border: "1px solid var(--stroke)" }}\n'
    '              onClick={async () => {'
)
c = content.count(OLD_ANCHOR)
print(f'Anchor: {c}')
if c == 1:
    content = content.replace(OLD_ANCHOR, NEW_ANCHOR, 1)
    with open('src/pages/QuranVocab.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
        f.write(content)
    print(f'Saved ({len(content)} bytes)')
