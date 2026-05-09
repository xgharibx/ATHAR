#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 42: QuranVocab — frequency tier filter chips."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/QuranVocab.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Add tierFilter state after quizMode state
old_state = (
    '  const [reviewMode, setReviewMode] = React.useState(false);\n'
    '  const [browseMode, setBrowseMode] = React.useState(false);'
)
new_state = (
    '  const [reviewMode, setReviewMode] = React.useState(false);\n'
    '  const [tierFilter, setTierFilter] = React.useState<"all" | "top" | "mid" | "rare">("all");\n'
    '  const [browseMode, setBrowseMode] = React.useState(false);'
)
count = content.count(old_state)
print(f'1. State: {count}')
if count == 1:
    content = content.replace(old_state, new_state, 1)

# 2. Update deck rebuild effect to include tierFilter
old_effect = (
    '  // Rebuild deck when review mode changes\n'
    '  React.useEffect(() => {\n'
    '    const base = reviewMode\n'
    '      ? QURAN_VOCAB.filter((w) => learned.has(w.id))\n'
    '      : [...QURAN_VOCAB];\n'
    '    setDeck(base);\n'
    '    setCardIndex(0);\n'
    '    setFlipped(false);\n'
    '    setSeen(new Set());\n'
    '  // eslint-disable-next-line react-hooks/exhaustive-deps\n'
    '  }, [reviewMode]);'
)
new_effect = (
    '  // Rebuild deck when review mode or tier filter changes\n'
    '  React.useEffect(() => {\n'
    '    let base = reviewMode\n'
    '      ? QURAN_VOCAB.filter((w) => learned.has(w.id))\n'
    '      : [...QURAN_VOCAB];\n'
    '    if (tierFilter === "top") base = base.filter((w) => w.id <= 50);\n'
    '    else if (tierFilter === "mid") base = base.filter((w) => w.id >= 51 && w.id <= 150);\n'
    '    else if (tierFilter === "rare") base = base.filter((w) => w.id >= 151);\n'
    '    setDeck(base.length > 0 ? base : [...QURAN_VOCAB]);\n'
    '    setCardIndex(0);\n'
    '    setFlipped(false);\n'
    '    setSeen(new Set());\n'
    '  // eslint-disable-next-line react-hooks/exhaustive-deps\n'
    '  }, [reviewMode, tierFilter]);'
)
count = content.count(old_effect)
print(f'2. Effect: {count}')
if count == 1:
    content = content.replace(old_effect, new_effect, 1)

# 3. Add tier filter chips row inside the header card, after action buttons close div
old_action_close = (
    '                {learned.size < QURAN_VOCAB.length && (\n'
    '                  <button\n'
    '                    type="button"\n'
    '                    onClick={() => startQuiz(QURAN_VOCAB.filter((w) => !learned.has(w.id)).map((w) => w.id))}\n'
    '                    className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95 text-[10px] font-bold"\n'
    '                    style={{\n'
    '                      background: "var(--card)",\n'
    '                      color: "#a78bfa",\n'
    '                      border: "1px solid rgba(167,139,250,0.35)",\n'
    '                    }}\n'
    '                    aria-label="\u0627\u062e\u062a\u0628\u0627\u0631 \u063a\u064a\u0631 \u0627\u0644\u0645\u062d\u0641\u0648\u0638"\n'
    '                    title="\u0627\u062e\u062a\u0628\u0627\u0631 \u0627\u0644\u0643\u0644\u0645\u0627\u062a \u063a\u064a\u0631 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629 \u0641\u0642\u0637"\n'
    '                  >\n'
    '                    \u2605\n'
    '                  </button>\n'
    '                )}\n'
    '            </div>\n'
    '          </div>\n'
    '        </Card>\n'
    '      </div>'
)
new_action_close = (
    '                {learned.size < QURAN_VOCAB.length && (\n'
    '                  <button\n'
    '                    type="button"\n'
    '                    onClick={() => startQuiz(QURAN_VOCAB.filter((w) => !learned.has(w.id)).map((w) => w.id))}\n'
    '                    className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95 text-[10px] font-bold"\n'
    '                    style={{\n'
    '                      background: "var(--card)",\n'
    '                      color: "#a78bfa",\n'
    '                      border: "1px solid rgba(167,139,250,0.35)",\n'
    '                    }}\n'
    '                    aria-label="\u0627\u062e\u062a\u0628\u0627\u0631 \u063a\u064a\u0631 \u0627\u0644\u0645\u062d\u0641\u0648\u0638"\n'
    '                    title="\u0627\u062e\u062a\u0628\u0627\u0631 \u0627\u0644\u0643\u0644\u0645\u0627\u062a \u063a\u064a\u0631 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629 \u0641\u0642\u0637"\n'
    '                  >\n'
    '                    \u2605\n'
    '                  </button>\n'
    '                )}\n'
    '            </div>\n'
    '            {/* Frequency tier filter */}\n'
    '            <div className="flex gap-1.5 mt-2 flex-wrap" role="group" aria-label="\u0641\u0644\u062a\u0631 \u0627\u0644\u062a\u0643\u0631\u0627\u0631">\n'
    '              {([\n'
    '                { key: "all", label: "\u0627\u0644\u0643\u0644" },\n'
    '                { key: "top", label: "\u2b50 \u0639\u0644\u064a\u0627 (50)" },\n'
    '                { key: "mid", label: "\u26aa \u0648\u0633\u0637\u0649 (100)" },\n'
    '                { key: "rare", label: "\u26ab \u0646\u0627\u062f\u0631\u0629 (50)" },\n'
    '              ] as const).map(({ key, label }) => (\n'
    '                <button\n'
    '                  key={key}\n'
    '                  type="button"\n'
    '                  onClick={() => setTierFilter(key)}\n'
    '                  aria-pressed={tierFilter === key}\n'
    '                  className="text-[10px] px-2.5 py-1 rounded-full transition-all"\n'
    '                  style={tierFilter === key\n'
    '                    ? { background: "color-mix(in srgb, var(--accent) 18%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)", fontWeight: 600 }\n'
    '                    : { background: "var(--card)", color: "var(--fg)", border: "1px solid var(--stroke)", opacity: 0.65 }}\n'
    '                >{label}</button>\n'
    '              ))}\n'
    '            </div>\n'
    '          </div>\n'
    '        </Card>\n'
    '      </div>'
)
count = content.count(old_action_close)
print(f'3. Action close: {count}')
if count == 1:
    content = content.replace(old_action_close, new_action_close, 1)

with open('src/pages/QuranVocab.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
