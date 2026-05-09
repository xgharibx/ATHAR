#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 27: Add keyboard shortcut hints + 'M' key for mark learned."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/QuranVocab.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# ─── 1. Extend keyboard handler to include 'm' for mark learned ─────────────
old_arrow = (
    '      } else if (e.key === "ArrowRight") {\n'
    '        e.preventDefault();\n'
    '        setCardIndex((prev) => {\n'
    '          if (prev > 0) { setFlipped(false); return prev - 1; }\n'
    '          return prev;\n'
    '        });\n'
    '      }\n'
    '    };\n'
    '    window.addEventListener("keydown", handler);'
)
new_arrow = (
    '      } else if (e.key === "ArrowRight") {\n'
    '        e.preventDefault();\n'
    '        setCardIndex((prev) => {\n'
    '          if (prev > 0) { setFlipped(false); return prev - 1; }\n'
    '          return prev;\n'
    '        });\n'
    '      } else if (e.key === "m" || e.key === "M") {\n'
    '        e.preventDefault();\n'
    '        setCardIndex((prev) => {\n'
    '          const w = deck[prev];\n'
    '          if (w) {\n'
    '            const next = new Set(learned);\n'
    '            if (next.has(w.id)) next.delete(w.id); else { next.add(w.id); }\n'
    '            setLearned(next);\n'
    '            saveLearned(next);\n'
    '          }\n'
    '          return prev;\n'
    '        });\n'
    '      }\n'
    '    };\n'
    '    window.addEventListener("keydown", handler);'
)

count = content.count(old_arrow)
print(f'1. Keyboard handler: {count}')
if count == 1:
    content = content.replace(old_arrow, new_arrow, 1)

# ─── 2. Add keyboard hints row after Navigation buttons ─────────────────────
old_nav_end = (
    '        {/* Deck completion banner */}'
)
new_nav_end = (
    '        {/* Keyboard hints — desktop only */}\n'
    '        <div className="hidden md:flex items-center gap-3 text-[10px] opacity-30 mt-1" aria-hidden="true">\n'
    '          {[["Space", "\u0642\u0644\u0628"], ["\u2190\u2192", "\u062a\u0646\u0642\u0644"], ["M", "\u062d\u0641\u0638"]].map(([key, label]) => (\n'
    '            <span key={key} className="flex items-center gap-1">\n'
    '              <kbd className="px-1.5 py-0.5 rounded border border-current font-mono text-[9px]">{key}</kbd>\n'
    '              <span>{label}</span>\n'
    '            </span>\n'
    '          ))}\n'
    '        </div>\n\n'
    '        {/* Deck completion banner */}'
)

count2 = content.count(old_nav_end)
print(f'2. Keyboard hints: {count2}')
if count2 == 1:
    content = content.replace(old_nav_end, new_nav_end, 1)

with open('src/pages/QuranVocab.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
