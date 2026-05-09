#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 34 fix: correct anchor."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Home.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

old_library = (
    '      {/* \u2500\u2500 \u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u2500\u2500 */}\n'
    '      <Card className="p-4">\n'
    '        <div className="flex items-center gap-2 mb-3">\n'
    '          <span className="text-base" aria-hidden="true">\U0001f4da</span>\n'
    '          <div className="text-sm font-semibold">\u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u0645\u062d\u062a\u0648\u0649</div>'
)
new_library = (
    '      {/* \u0647\u062f\u0641 \u0622\u064a\u0627\u062a \u0627\u0644\u064a\u0648\u0645 */}\n'
    '      {(prefs.quranDailyGoal ?? 10) > 0 && (() => {\n'
    '        const todayAyahs = quranDailyAyahs[civilTodayKey] ?? 0;\n'
    '        const goal = Math.max(1, prefs.quranDailyGoal ?? 10);\n'
    '        const pct = Math.min(100, Math.round((todayAyahs / goal) * 100));\n'
    '        const met = todayAyahs >= goal;\n'
    '        return (\n'
    '          <button\n'
    '            type="button"\n'
    '            onClick={() => navigate("/quran")}\n'
    '            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all active:scale-[0.99]"\n'
    '            style={{\n'
    '              background: met ? "color-mix(in srgb, var(--ok) 8%, var(--card))" : "color-mix(in srgb, var(--accent) 5%, var(--card))",\n'
    '              borderColor: met ? "color-mix(in srgb, var(--ok) 25%, transparent)" : "color-mix(in srgb, var(--accent) 18%, transparent)",\n'
    '            }}\n'
    '            aria-label="\u0647\u062f\u0641 \u0627\u0644\u0642\u0631\u0622\u0646 \u0627\u0644\u064a\u0648\u0645\u064a"\n'
    '          >\n'
    '            <span className="text-base shrink-0" aria-hidden="true">{met ? "\u2705" : "\ud83d\udcd6"}</span>\n'
    '            <div className="flex-1 min-w-0">\n'
    '              <div className="flex items-center justify-between mb-1">\n'
    '                <span className="text-xs font-semibold" style={{ color: met ? "var(--ok)" : "var(--accent)" }}>\u0622\u064a\u0627\u062a \u0627\u0644\u064a\u0648\u0645</span>\n'
    '                <span className="text-xs tabular-nums opacity-70">{todayAyahs.toLocaleString("ar-EG")} / {goal.toLocaleString("ar-EG")}</span>\n'
    '              </div>\n'
    '              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--stroke) 60%, transparent)" }}>\n'
    '                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: met ? "var(--ok)" : "var(--accent)" }} />\n'
    '              </div>\n'
    '            </div>\n'
    '            <span className="text-[10px] opacity-30 shrink-0">\u276e</span>\n'
    '          </button>\n'
    '        );\n'
    '      })()}\n'
    '\n'
    '      {/* \u2500\u2500 \u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u2500\u2500 */}\n'
    '      <Card className="p-4">\n'
    '        <div className="flex items-center gap-2 mb-3">\n'
    '          <span className="text-base" aria-hidden="true">\U0001f4da</span>\n'
    '          <div className="text-sm font-semibold">\u0645\u0643\u062a\u0628\u0629 \u0627\u0644\u0645\u062d\u062a\u0648\u0649</div>'
)

count = content.count(old_library)
print(f'1. Library anchor: {count}')
if count == 1:
    content = content.replace(old_library, new_library, 1)

with open('src/pages/Home.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
