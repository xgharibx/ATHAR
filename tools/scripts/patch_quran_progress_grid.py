#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 19: Add 114-surah progress grid to Quran.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Quran.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# ─────────────────────────────────────────────────────────────────────────────
# 1. Add LayoutGrid to lucide-react imports
# ─────────────────────────────────────────────────────────────────────────────
old_import = 'import { Bookmark, BookOpen, Search, Shuffle, Volume2, X } from "lucide-react";'
new_import = 'import { Bookmark, BookOpen, Search, Shuffle, Volume2, X, LayoutGrid } from "lucide-react";'

count = content.count(old_import)
print(f'1. Import: {count}')
if count == 1:
    content = content.replace(old_import, new_import, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 2. Add showProgressGrid state after showBookmarks state
# ─────────────────────────────────────────────────────────────────────────────
old_state = '  const [showBookmarks, setShowBookmarks] = React.useState(false);'
new_state = '  const [showBookmarks, setShowBookmarks] = React.useState(false);\n  const [showProgressGrid, setShowProgressGrid] = React.useState(false);'

count = content.count(old_state)
print(f'2. State: {count}')
if count == 1:
    content = content.replace(old_state, new_state, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 3. Add progress grid toggle button in stats row (after completed count)
# ─────────────────────────────────────────────────────────────────────────────
old_plans_btn = '            {/* Plans page link */}\n            <button type="button"\n              onClick={() => navigate("/quran/plans")}'
new_plans_btn = (
    '            {/* Progress grid toggle */}\n'
    '            {quranStats.started > 0 && (\n'
    '              <button type="button"\n'
    '                onClick={() => setShowProgressGrid((v) => !v)}\n'
    '                aria-pressed={showProgressGrid}\n'
    '                aria-label="\u062e\u0631\u064a\u0637\u0629 \u0627\u0644\u062a\u0642\u062f\u0645"\n'
    '                className="flex items-center gap-1 text-xs transition"\n'
    '                style={{ color: showProgressGrid ? "var(--accent)" : undefined, opacity: showProgressGrid ? 1 : 0.5 }}\n'
    '              >\n'
    '                <LayoutGrid size={11} aria-hidden="true" />\n'
    '                <span>\u062e\u0631\u064a\u0637\u0629</span>\n'
    '              </button>\n'
    '            )}\n'
    '            {/* Plans page link */}\n'
    '            <button type="button"\n'
    '              onClick={() => navigate("/quran/plans")}'
)

count = content.count(old_plans_btn)
print(f'3. Plans btn: {count}')
if count == 1:
    content = content.replace(old_plans_btn, new_plans_btn, 1)

# ─────────────────────────────────────────────────────────────────────────────
# 4. Add the progress grid section right after the stats row closing Card
# ─────────────────────────────────────────────────────────────────────────────
old_after_card = '      </Card>\n\n      {/* \u2500\u2500 Today\'s khatma reading target'
new_after_card = (
    '      {/* \u2500\u2500 114-surah progress grid \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}\n'
    '      {showProgressGrid && data && mode === "surahs" && !query && (\n'
    '        <div\n'
    '          className="quran-surface rounded-3xl border px-4 py-4"\n'
    '          style={{ borderColor: "color-mix(in srgb, var(--stroke) 35%, transparent)" }}\n'
    '          aria-label="\u062e\u0631\u064a\u0637\u0629 \u062a\u0642\u062f\u0645 \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0633\u0648\u0631"\n'
    '        >\n'
    '          <div className="text-[10px] font-semibold opacity-40 mb-2.5 flex items-center justify-between">\n'
    '            <span>\u062e\u0631\u064a\u0637\u0629 \u0627\u0644\u0633\u0648\u0631 \u2014 ١١٤ \u0633\u0648\u0631\u0629</span>\n'
    '            <div className="flex items-center gap-3 text-[9px]">\n'
    '              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ background: "var(--ok)" }}></span>\u0645\u0643\u062a\u0645\u0644\u0629</span>\n'
    '              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ background: "var(--accent)" }}></span>\u062c\u0627\u0631\u064a</span>\n'
    '              <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm" style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}></span>\u0644\u0645 \u062a\u0628\u062f\u0623</span>\n'
    '            </div>\n'
    '          </div>\n'
    '          <div\n'
    '            className="grid gap-0.5"\n'
    '            style={{ gridTemplateColumns: "repeat(19, 1fr)" }}\n'
    '            role="list"\n'
    '          >\n'
    '            {data.map((s) => {\n'
    '              const maxRead = readingHistory[String(s.id)] ?? 0;\n'
    '              const pct = s.ayahs.length ? Math.min(100, Math.round((maxRead / s.ayahs.length) * 100)) : 0;\n'
    '              const isComplete = pct >= 100;\n'
    '              const isStarted = pct > 0 && pct < 100;\n'
    '              const isCurrent = lastRead?.surahId === s.id;\n'
    '              return (\n'
    '                <button\n'
    '                  key={s.id}\n'
    '                  type="button"\n'
    '                  role="listitem"\n'
    '                  onClick={() => { recordRecentSurah(s.id); navigate(`/mushaf?surah=${s.id}`); }}\n'
    '                  title={`${s.name} \u2014 ${pct > 0 ? `${pct}%` : "\u0644\u0645 \u062a\u0642\u0631\u0623"}`}\n'
    '                  aria-label={`${s.name}${isComplete ? " \u2013 \u0645\u0643\u062a\u0645\u0644\u0629" : isStarted ? ` \u2013 ${pct}%` : ""}`}\n'
    '                  className="rounded-sm transition-all active:scale-90 hover:opacity-80"\n'
    '                  style={{\n'
    '                    aspectRatio: "1",\n'
    '                    background: isComplete\n'
    '                      ? "color-mix(in srgb, var(--ok) 70%, transparent)"\n'
    '                      : isStarted\n'
    '                      ? `color-mix(in srgb, var(--accent) ${Math.max(20, Math.round(pct * 0.7))}%, transparent)`\n'
    '                      : "var(--card)",\n'
    '                    border: isCurrent ? "1.5px solid var(--accent)" : isComplete ? "none" : "1px solid var(--stroke)",\n'
    '                    opacity: isComplete ? 1 : isStarted ? 0.85 : 0.4,\n'
    '                  }}\n'
    '                />\n'
    '              );\n'
    '            })}\n'
    '          </div>\n'
    '          <div className="text-[10px] opacity-35 mt-2 text-center tabular-nums">\n'
    '            {quranStats.completed.toLocaleString("ar-EG")} \u0645\u0643\u062a\u0645\u0644\u0629 · {quranStats.started.toLocaleString("ar-EG")} \u0628\u062f\u0623\u062a · {(114 - quranStats.started - quranStats.completed).toLocaleString("ar-EG")} \u0644\u0645 \u062a\u0628\u062f\u0623\n'
    '          </div>\n'
    '        </div>\n'
    '      )}\n\n'
    '      </Card>\n\n'
    '      {/* \u2500\u2500 Today\'s khatma reading target'
)

count = content.count(old_after_card)
print(f'4. After card: {count}')
if count == 1:
    content = content.replace(old_after_card, new_after_card, 1)
else:
    idx = content.find("</Card>\n\n      {/* \u2500\u2500 Today")
    print(f'Alt find: {idx}')
    print(repr(content[max(0,idx-50):idx+80]))

with open('src/pages/Quran.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
