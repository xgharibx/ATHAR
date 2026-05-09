#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 25: Add on-track/ahead/behind indicator to QuranPlans.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/QuranPlans.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# Add an "on-track" indicator right after the stats grid closing </div>
old_today_title = (
    '          {/* Today\'s reading */}\n'
    '          <div>\n'
    '            <div className="flex items-center justify-between mb-1.5">\n'
    '              <span className="text-xs font-semibold opacity-80">\u0648\u0631\u062f \u0627\u0644\u064a\u0648\u0645</span>'
)
new_today_title = (
    '          {/* On-track indicator */}\n'
    '          {!activePlan.isFinished && activePlan.elapsed > 0 && (() => {\n'
    '            const ahead = activePlan.doneCount - activePlan.elapsed;\n'
    '            if (ahead > 0) return (\n'
    '              <div className="text-[11px] font-medium text-center py-1.5 px-3 rounded-2xl" style={{ background: "color-mix(in srgb, var(--ok) 12%, transparent)", color: "var(--ok)" }}>\n'
    '                \u062a\u0642\u062f\u0645\u062a \u0628\u064e{toArabicNumeral(ahead)} \u064a\u0648\u0645 \u2014 \u0623\u062d\u0633\u0646\u062a \u063a\u0627\u064a\u0629 \u0644\u0623\u0645\u0631 \u0627\u0644\u0644\u0647 \u2665\n'
    '              </div>\n'
    '            );\n'
    '            if (ahead < -1) return (\n'
    '              <div className="text-[11px] font-medium text-center py-1.5 px-3 rounded-2xl" style={{ background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)" }}>\n'
    '                \u062a\u0623\u062e\u0631\u062a {toArabicNumeral(Math.abs(ahead))} \u064a\u0648\u0645 \u2014 \u0644\u0627 \u062a\u0632\u0627\u0644 \u0628\u0627\u0644\u0625\u0645\u0643\u0627\u0646 \u0627\u0644\u062a\u0639\u0648\u064a\u0636\u061b \u0627\u0628\u062f\u0623 \u0627\u0644\u0622\u0646\n'
    '              </div>\n'
    '            );\n'
    '            return (\n'
    '              <div className="text-[11px] font-medium text-center py-1.5 px-3 rounded-2xl opacity-50" style={{ background: "var(--card)" }}>\n'
    '                \u0639\u0644\u0649 \u0627\u0644\u062e\u0637\u0629 \u062a\u0645\u0627\u0645\u0627\u064b \u2014 \u0627\u0633\u062a\u0645\u0631 \u0647\u0643\u0630\u0627\n'
    '              </div>\n'
    '            );\n'
    '          })()}\n\n'
    '          {/* Today\'s reading */}\n'
    '          <div>\n'
    '            <div className="flex items-center justify-between mb-1.5">\n'
    '              <span className="text-xs font-semibold opacity-80">\u0648\u0631\u062f \u0627\u0644\u064a\u0648\u0645</span>'
)

count = content.count(old_today_title)
print(f'1. Today title: {count}')
if count == 1:
    content = content.replace(old_today_title, new_today_title, 1)

with open('src/pages/QuranPlans.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
