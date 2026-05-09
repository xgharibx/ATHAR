#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 18: Enhance Mushaf session summary with ayahs + surahs completed."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Mushaf.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Add sessionAyahCountRef next to pagesReadRef
old_ref = '  const pagesReadRef = React.useRef(new Set<number>());\n  const [showSessionSummary, setShowSessionSummary] = React.useState(false);'
new_ref = '  const pagesReadRef = React.useRef(new Set<number>());\n  const sessionAyahCountRef = React.useRef(0);\n  const [showSessionSummary, setShowSessionSummary] = React.useState(false);'

count = content.count(old_ref)
print(f'1. Ref pattern: {count}')
if count == 1:
    content = content.replace(old_ref, new_ref, 1)

# 2. Ayah tap
old_tap = '    setLastRead(item.surahId, item.displayAyah);\n    recordQuranRead(1);\n    flashChrome();'
new_tap = '    setLastRead(item.surahId, item.displayAyah);\n    sessionAyahCountRef.current += 1;\n    recordQuranRead(1);\n    flashChrome();'
count = content.count(old_tap)
print(f'2. Tap: {count}')
if count == 1:
    content = content.replace(old_tap, new_tap, 1)

# 3. markPageReviewed
old_mark = '    recordQuranRead(playableItems.length);\n    toast.success'
new_mark = '    sessionAyahCountRef.current += playableItems.length;\n    recordQuranRead(playableItems.length);\n    toast.success'
count = content.count(old_mark)
print(f'3. Mark page: {count}')
if count == 1:
    content = content.replace(old_mark, new_mark, 1)

# 4. Enhance summary card  
old_summary = '            <div style={{ fontSize: "0.85rem", opacity: 0.65, marginBottom: "1.25rem" }}>\n              {toArabicNumeral(sessionDurationMin)}'
new_summary = '            <div style={{ fontSize: "0.85rem", opacity: 0.65, marginBottom: "1rem" }}>\n              {toArabicNumeral(sessionDurationMin)}'
count = content.count(old_summary)
print(f'4. Summary div: {count}')
if count == 1:
    content = content.replace(old_summary, new_summary, 1)

old_summary_end = '            </div>\n            <button type="button"\n              className="mushaf-btn-primary"\n              style={{ width: "100%" }}\n              onClick={() => { setShowSessionSummary(false); navigate("/quran"); }}\n            >\n              \u062d\u0633\u0646\u0627\u064b\n            </button>'
new_summary_end = '            </div>\n            {/* Session stats grid */}\n            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", width: "100%", marginBottom: "1.25rem" }}>\n              {sessionAyahCountRef.current > 0 && (\n                <div style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", borderRadius: "0.75rem", padding: "0.6rem" }}>\n                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--accent)" }}>{toArabicNumeral(sessionAyahCountRef.current)}</div>\n                  <div style={{ fontSize: "0.7rem", opacity: 0.6 }}>\u0622\u064a\u0629</div>\n                </div>\n              )}\n              {sessionSurahCompletedRef.current.size > 0 && (\n                <div style={{ background: "color-mix(in srgb, var(--ok) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--ok) 25%, transparent)", borderRadius: "0.75rem", padding: "0.6rem" }}>\n                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ok)" }}>{toArabicNumeral(sessionSurahCompletedRef.current.size)}</div>\n                  <div style={{ fontSize: "0.7rem", opacity: 0.6 }}>\u0633\u0648\u0631\u0629 \u0645\u0643\u062a\u0645\u0644\u0629</div>\n                </div>\n              )}\n            </div>\n            <button type="button"\n              className="mushaf-btn-primary"\n              style={{ width: "100%" }}\n              onClick={() => { setShowSessionSummary(false); navigate("/quran"); }}\n            >\n              \u062d\u0633\u0646\u0627\u064b\n            </button>'

count = content.count(old_summary_end)
print(f'5. Summary end: {count}')
if count == 1:
    content = content.replace(old_summary_end, new_summary_end, 1)

with open('src/pages/Mushaf.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
