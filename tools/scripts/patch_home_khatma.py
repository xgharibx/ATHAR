#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 41: Home.tsx — khatma progress pill."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Home.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Add store subscriptions after quranStreak
old_subs = '  const quranStreak = useNoorStore((s) => s.quranStreak);\n  const prayerLog = useNoorStore((s) => s.prayerLog);'
new_subs = (
    '  const quranStreak = useNoorStore((s) => s.quranStreak);\n'
    '  const prayerLog = useNoorStore((s) => s.prayerLog);\n'
    '  const khatmaStartISO = useNoorStore((s) => s.khatmaStartISO);\n'
    '  const khatmaDays = useNoorStore((s) => s.khatmaDays);\n'
    '  const khatmaDone = useNoorStore((s) => s.khatmaDone);'
)
count = content.count(old_subs)
print(f'1. Subs: {count}')
if count == 1:
    content = content.replace(old_subs, new_subs, 1)

# 2. Add khatma pill after daily goal pill, before the library card comment
old_library_anchor = '      {/* \u2500\u2500 \u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u2500\u2500 */}'
new_khatma_pill = (
    '      {/* \u062e\u062a\u0645\u0629 \u0627\u0644\u0642\u0631\u0622\u0646 */}\n'
    '      {khatmaStartISO && khatmaDays && (() => {\n'
    '        const start = new Date(khatmaStartISO);\n'
    '        const end = new Date(start.getTime() + khatmaDays * 86400000);\n'
    '        const now = Date.now();\n'
    '        if (now >= end.getTime()) return null; // finished\n'
    '        const totalMs = end.getTime() - start.getTime();\n'
    '        const elapsedMs = now - start.getTime();\n'
    '        const pct = Math.min(100, Math.round((elapsedMs / totalMs) * 100));\n'
    '        const daysLeft = Math.ceil((end.getTime() - now) / 86400000);\n'
    '        const doneCount = Object.values(khatmaDone ?? {}).filter(Boolean).length;\n'
    '        return (\n'
    '          <button\n'
    '            type="button"\n'
    '            onClick={() => navigate("/quran-plans")}\n'
    '            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all active:scale-[0.99]"\n'
    '            style={{ background: "color-mix(in srgb, var(--accent) 5%, var(--card))", borderColor: "color-mix(in srgb, var(--accent) 18%, transparent)" }}\n'
    '            aria-label="\u062e\u062a\u0645\u0629 \u0627\u0644\u0642\u0631\u0622\u0646"\n'
    '          >\n'
    '            <span className="text-base shrink-0" aria-hidden="true">\uD83C\uDF19</span>\n'
    '            <div className="flex-1 min-w-0">\n'
    '              <div className="flex items-center justify-between mb-1">\n'
    '                <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>\u062e\u062a\u0645\u0629 \u0627\u0644\u0642\u0631\u0622\u0646</span>\n'
    '                <span className="text-xs tabular-nums opacity-70">\u062a\u0628\u0642\u0649 {daysLeft.toLocaleString("ar-EG")} \u064a\u0648\u0645 \u00b7 {doneCount.toLocaleString("ar-EG")}\u0633/{khatmaDays.toLocaleString("ar-EG")}</span>\n'
    '              </div>\n'
    '              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--stroke) 60%, transparent)" }}>\n'
    '                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "var(--accent)" }} />\n'
    '              </div>\n'
    '            </div>\n'
    '            <span className="text-[10px] opacity-30 shrink-0">\u276e</span>\n'
    '          </button>\n'
    '        );\n'
    '      })()}\n\n'
    '      {/* \u2500\u2500 \u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u2500\u2500 */}'
)
count = content.count(old_library_anchor)
print(f'2. Library anchor: {count}')
if count == 1:
    content = content.replace(old_library_anchor, new_khatma_pill, 1)

with open('src/pages/Home.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
