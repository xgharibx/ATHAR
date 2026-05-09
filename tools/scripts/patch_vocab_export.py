#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 39: QuranVocab — export learned words list."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/QuranVocab.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# Add after the progress bar block, before closing </div> of stats card
old_stat_close = (
    '              <p className="text-[10px] opacity-50">\n'
    '                {Math.round((learned.size / QURAN_VOCAB.length) * 100)}\u066a \u0645\u062d\u0641\u0648\u0638\n'
    '              </p>\n'
    '            </div>\n'
    '          )}\n'
    '        </div>\n'
    '      </div>\n'
    '    )}\n'
    '    </div>'
)
new_stat_close = (
    '              <p className="text-[10px] opacity-50">\n'
    '                {Math.round((learned.size / QURAN_VOCAB.length) * 100)}\u066a \u0645\u062d\u0641\u0648\u0638\n'
    '              </p>\n'
    '            </div>\n'
    '          )}\n'
    '          {learned.size > 0 && (\n'
    '            <button\n'
    '              type="button"\n'
    '              className="mt-3 w-full flex items-center justify-center gap-1.5 text-[11px] py-2 rounded-xl transition opacity-60 hover:opacity-90 active:scale-95"\n'
    '              style={{ background: "var(--card-2, rgba(255,255,255,0.06))", border: "1px solid var(--stroke)" }}\n'
    '              onClick={async () => {\n'
    '                const sorted = QURAN_VOCAB.filter((w) => learned.has(w.id))\n'
    '                  .sort((a, b) => a.id - b.id);\n'
    '                const lines = sorted.map((w, i) => `${(i + 1).toLocaleString("ar-EG")}. ${w.arabic} \u2014 ${w.meaning}`);\n'
    '                const text = `\u0645\u0641\u0631\u062f\u0627\u062a\u064a \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629 \u0645\u0646 \u0627\u0644\u0642\u0631\u0622\u0646 \u0627\u0644\u0643\u0631\u064a\u0645 (${learned.size.toLocaleString("ar-EG")}/${QURAN_VOCAB.length}):\\n${lines.join("\\n")}`;\n'
    '                if (navigator.share) {\n'
    '                  await navigator.share({ text }).catch(() => {});\n'
    '                } else {\n'
    '                  await navigator.clipboard.writeText(text).catch(() => {});\n'
    '                  toast.success("\u062a\u0645 \u0646\u0633\u062e \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0627\u062a");\n'
    '                }\n'
    '              }}\n'
    '              aria-label="\u0646\u0633\u062e \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0627\u062a"\n'
    '            >\n'
    '              <Copy size={11} aria-hidden="true" />\n'
    '              \u0646\u0633\u062e \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0627\u062a ({learned.size.toLocaleString("ar-EG")} \u0643\u0644\u0645\u0629)\n'
    '            </button>\n'
    '          )}\n'
    '        </div>\n'
    '      </div>\n'
    '    )}\n'
    '    </div>'
)

count = content.count(old_stat_close)
print(f'1. Stats close: {count}')
if count == 1:
    content = content.replace(old_stat_close, new_stat_close, 1)

with open('src/pages/QuranVocab.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
