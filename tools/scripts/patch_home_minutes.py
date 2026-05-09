#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 55: Show reading minutes estimate in Home daily Quran goal bar."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Home.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# After the progress bar div in the daily goal button, add a reading time estimate
OLD_BAR_END = (
    '              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--stroke) 60%, transparent)" }}>\n'
    '                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: met ? "var(--ok)" : "var(--accent)" }} />\n'
    '              </div>\n'
    '            </div>\n'
    '            <span className="text-[10px] opacity-30 shrink-0">\u276e</span>'
)
NEW_BAR_END = (
    '              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--stroke) 60%, transparent)" }}>\n'
    '                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: met ? "var(--ok)" : "var(--accent)" }} />\n'
    '              </div>\n'
    '              {todayAyahs >= 4 && (\n'
    '                <p className="text-[10px] mt-1 opacity-40 tabular-nums">\u2248{Math.max(1, Math.round(todayAyahs / 8)).toLocaleString("ar-EG")} \u062f\u0642\u064a\u0642\u0629 \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u064a\u0648\u0645</p>\n'
    '              )}\n'
    '            </div>\n'
    '            <span className="text-[10px] opacity-30 shrink-0">\u276e</span>'
)
c = content.count(OLD_BAR_END)
print(f'Bar end: {c}')
if c == 1:
    content = content.replace(OLD_BAR_END, NEW_BAR_END, 1)
    with open('src/pages/Home.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
        f.write(content)
    print(f'Saved ({len(content)} bytes)')
