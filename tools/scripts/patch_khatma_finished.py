#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Add khatma-finished celebration block to QuranPlans.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/QuranPlans.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

old = '          {/* Mark today done / CTA */}\n          <div className="flex gap-2">\n            <Button\n              className={`flex-1 text-sm ${activePlan.doneToday ? "opacity-50" : ""}`}\n              aria-pressed={activePlan.doneToday}\n              onClick={() => {\n                setKhatmaDone(today, !activePlan.doneToday);\n                if (!activePlan.doneToday) toast.success("\u0623\u062d\u0633\u0646\u062a! \u0633\u062c\u0644\u0646\u0627 \u064a\u0648\u0645\u0643 \u2713");\n              }}\n            >\n              <CheckCircle2 className="w-4 h-4 ml-1.5" />\n              {activePlan.doneToday ? "\u062a\u0645 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u064a\u0648\u0645" : "\u0633\u062c\u0651\u0644 \u0648\u0631\u062f \u0627\u0644\u064a\u0648\u0645"}\n            </Button>'

new = '          {/* Mark today done / CTA */}\n          {activePlan.isFinished ? (\n            <div\n              className="rounded-2xl p-4 text-center space-y-2"\n              style={{ background: "color-mix(in srgb, var(--ok) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--ok) 30%, transparent)" }}\n            >\n              <div className="text-2xl" aria-hidden="true">\U0001f3c6</div>\n              <div className="text-sm font-bold" style={{ color: "var(--ok)" }}>\u0645\u0628\u0627\u0631\u0643! \u0623\u062a\u0645\u0645\u062a \u0627\u0644\u062e\u062a\u0645\u0629</div>\n              <div className="text-xs opacity-60">\u062c\u0639\u0644\u0647\u0627 \u0627\u0644\u0644\u0647 \u0641\u064a \u0645\u064a\u0632\u0627\u0646 \u062d\u0633\u0646\u0627\u062a\u0643</div>\n              <Button className="w-full mt-2 text-sm" onClick={() => { resetKhatma(); setShowPresets(true); }}>\n                \u0627\u0628\u062f\u0623 \u062e\u062a\u0645\u0629 \u062c\u062f\u064a\u062f\u0629\n              </Button>\n            </div>\n          ) : (\n          <div className="flex gap-2">\n            <Button\n              className={`flex-1 text-sm ${activePlan.doneToday ? "opacity-50" : ""}`}\n              aria-pressed={activePlan.doneToday}\n              onClick={() => {\n                setKhatmaDone(today, !activePlan.doneToday);\n                if (!activePlan.doneToday) toast.success("\u0623\u062d\u0633\u0646\u062a! \u0633\u062c\u0644\u0646\u0627 \u064a\u0648\u0645\u0643 \u2713");\n              }}\n            >\n              <CheckCircle2 className="w-4 h-4 ml-1.5" />\n              {activePlan.doneToday ? "\u062a\u0645 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u064a\u0648\u0645" : "\u0633\u062c\u0651\u0644 \u0648\u0631\u062f \u0627\u0644\u064a\u0648\u0645"}\n            </Button>'

count = content.count(old)
print(f'Pattern found {count} times')

if count == 1:
    content = content.replace(old, new, 1)
    # Now find the closing </div> of the flex gap-2 row (before 7-day strip)
    # and add )} after it
    week_strip_marker = '          {/* 7-day strip */}'
    ws_pos = content.find(week_strip_marker)
    print(f'week_strip at {ws_pos}')
    # Find </div> immediately before it (skip whitespace)
    div_before = content.rfind('          </div>', 0, ws_pos)
    print(f'div_before at {div_before}')
    insert_at = div_before + len('          </div>')
    content = content[:insert_at] + '\n          )}' + content[insert_at:]
    print('Patched successfully')
else:
    print('Not found, checking disk...')
    idx = content.find('Mark today done')
    print(f'idx={idx}')
    if idx >= 0:
        print(repr(content[idx:idx+200]))

with open('src/pages/QuranPlans.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print('Saved')

