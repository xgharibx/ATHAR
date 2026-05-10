#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 62: Weekly featured word from mid/rare tier in QuranVocab, shown between actions and stats card."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/QuranVocab.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

OLD = (
    '        {/* Stats mini-card */}\n'
    '        <div\n'
    '          className="w-full max-w-sm rounded-2xl p-4 text-center"\n'
    '          style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}\n'
    '        >'
)
NEW = (
    '        {/* Phase 62: Weekly featured word from mid/rare tier */}\n'
    '        {(() => {\n'
    '          const MID_RARE = QURAN_VOCAB.filter((w) => w.id >= 51);\n'
    '          const weekNum = Math.floor(Date.now() / (7 * 86400000));\n'
    '          const featured = MID_RARE[weekNum % MID_RARE.length];\n'
    '          if (!featured) return null;\n'
    '          const isLearned = learned.has(featured.id);\n'
    '          return (\n'
    '            <div\n'
    '              className="w-full max-w-sm rounded-2xl p-3 flex items-center gap-3"\n'
    '              style={{ background: "color-mix(in srgb, #a78bfa 9%, var(--card))", border: "1px solid rgba(167,139,250,0.25)" }}\n'
    '            >\n'
    '              <div className="shrink-0 text-xs font-bold px-2 py-1 rounded-xl" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>\n'
    '                \u0643\u0644\u0645\u0629\n'
    '              </div>\n'
    '              <div className="flex-1 min-w-0 text-right">\n'
    '                <div className="font-bold arabic-text text-sm">{featured.arabic}</div>\n'
    '                <div className="text-[11px] opacity-60 truncate">{featured.meaning}</div>\n'
    '              </div>\n'
    '              <button\n'
    '                type="button"\n'
    '                className="shrink-0 p-1.5 rounded-xl transition-all active:scale-90"\n'
    '                style={isLearned\n'
    '                  ? { background: "color-mix(in srgb, var(--ok) 15%, transparent)", color: "var(--ok)" }\n'
    '                  : { background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}\n'
    '                onClick={() => handleLearn(featured.id)}\n'
    '                aria-label={isLearned ? "\u0625\u0644\u063a\u0627\u0621 \u062d\u0641\u0638 \u0627\u0644\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u062e\u062a\u0627\u0631\u0629" : "\u062d\u0641\u0638 \u0627\u0644\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u062e\u062a\u0627\u0631\u0629"}\n'
    '              >\n'
    '                <CheckCircle2 size={14} aria-hidden="true" />\n'
    '              </button>\n'
    '            </div>\n'
    '          );\n'
    '        })()}\n'
    '\n'
    '        {/* Stats mini-card */}\n'
    '        <div\n'
    '          className="w-full max-w-sm rounded-2xl p-4 text-center"\n'
    '          style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}\n'
    '        >'
)
c = content.count(OLD)
print(f'Anchor: {c}')
if c == 1:
    content = content.replace(OLD, NEW, 1)
    with open('src/pages/QuranVocab.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
        f.write(content)
    print(f'Saved ({len(content)} bytes)')
