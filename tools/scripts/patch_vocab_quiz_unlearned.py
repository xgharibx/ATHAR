#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 20a: Add quiz-unlearned-only button + Settings text fix."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# ─── 1. QuranVocab.tsx ────────────────────────────────────────────────
with open('src/pages/QuranVocab.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    vocab = f.read()

print(f'QuranVocab: {len(vocab)} bytes')

# A. Add "quiz unlearned" button right after the quiz button in header
old_quiz_btn_end = (
    '                  aria-pressed={quizMode}\n'
    '                  aria-label="\u0627\u062e\u062a\u0628\u0627\u0631 \u0627\u0644\u0645\u0641\u0631\u062f\u0627\u062a"\n'
    '                  title="\u0627\u062e\u062a\u0628\u0627\u0631 \u0627\u0644\u0645\u0641\u0631\u062f\u0627\u062a"\n'
    '                >\n'
    '                  <HelpCircle size={16} aria-hidden="true" />\n'
    '                </button>\n'
    '            </div>'
)

new_quiz_btn_end = (
    '                  aria-pressed={quizMode}\n'
    '                  aria-label="\u0627\u062e\u062a\u0628\u0627\u0631 \u0627\u0644\u0645\u0641\u0631\u062f\u0627\u062a"\n'
    '                  title="\u0627\u062e\u062a\u0628\u0627\u0631 \u0627\u0644\u0645\u0641\u0631\u062f\u0627\u062a"\n'
    '                >\n'
    '                  <HelpCircle size={16} aria-hidden="true" />\n'
    '                </button>\n'
    # Add unlearned quiz button
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
    '            </div>'
)

count = vocab.count(old_quiz_btn_end)
print(f'1a. Quiz btn end: {count}')
if count == 1:
    vocab = vocab.replace(old_quiz_btn_end, new_quiz_btn_end, 1)

# B. Also add unlearned quiz button in the quiz-done screen (alongside "retry all")
old_done_btns = (
    '              <div className="flex gap-2 mt-2">\n'
    '                <button type="button" onClick={() => startQuiz(QURAN_VOCAB.map((w) => w.id))} className="px-4 py-2 rounded-2xl text-sm font-semibold transition-all active:scale-95" style={{ background: "#a78bfa", color: "#fff" }}>\n'
    '                  \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631\n'
    '                </button>\n'
    '                <button type="button" onClick={() => setQuizMode(false)} className="px-4 py-2 rounded-2xl text-sm transition-all active:scale-95" style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}>\n'
    '                  \u0625\u063a\u0644\u0627\u0642\n'
    '                </button>\n'
    '              </div>'
)

new_done_btns = (
    '              <div className="flex gap-2 mt-2 flex-wrap justify-center">\n'
    '                <button type="button" onClick={() => startQuiz(QURAN_VOCAB.map((w) => w.id))} className="px-4 py-2 rounded-2xl text-sm font-semibold transition-all active:scale-95" style={{ background: "#a78bfa", color: "#fff" }}>\n'
    '                  \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631\n'
    '                </button>\n'
    '                {learned.size < QURAN_VOCAB.length && (\n'
    '                  <button type="button" onClick={() => startQuiz(QURAN_VOCAB.filter((w) => !learned.has(w.id)).map((w) => w.id))} className="px-4 py-2 rounded-2xl text-sm font-semibold transition-all active:scale-95" style={{ background: "color-mix(in srgb, #a78bfa 20%, var(--card))", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.35)" }}>\n'
    '                    \u063a\u064a\u0631 \u0627\u0644\u0645\u062d\u0641\u0648\u0638\u0629 ({(QURAN_VOCAB.length - learned.size).toLocaleString("ar-EG")})\n'
    '                  </button>\n'
    '                )}\n'
    '                <button type="button" onClick={() => setQuizMode(false)} className="px-4 py-2 rounded-2xl text-sm transition-all active:scale-95" style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}>\n'
    '                  \u0625\u063a\u0644\u0627\u0642\n'
    '                </button>\n'
    '              </div>'
)

count2 = vocab.count(old_done_btns)
print(f'1b. Done btns: {count2}')
if count2 == 1:
    vocab = vocab.replace(old_done_btns, new_done_btns, 1)

with open('src/pages/QuranVocab.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(vocab)
print(f'QuranVocab saved ({len(vocab)} bytes)')

# ─── 2. Settings.tsx ─────────────────────────────────────────────────
with open('src/pages/Settings.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    settings = f.read()

print(f'Settings: {len(settings)} bytes')

old_label = '{ icon: "\U0001f4d6", label: "\u0645\u0641\u0631\u062f\u0627\u062a \u0627\u0644\u0642\u0631\u0622\u0646", desc: "\u0628\u0637\u0627\u0642\u0627\u062a \u062a\u0639\u0644\u064a\u0645\u064a\u0629 \u0644\u0645\u0626\u0629 \u0643\u0644\u0645\u0629", route: "/quran-vocab" }'
new_label = '{ icon: "\U0001f4d6", label: "\u0645\u0641\u0631\u062f\u0627\u062a \u0627\u0644\u0642\u0631\u0622\u0646", desc: "\u0628\u0637\u0627\u0642\u0627\u062a \u062a\u0639\u0644\u064a\u0645\u064a\u0629 \u0644\u0645\u0626\u062a\u064a \u0643\u0644\u0645\u0629", route: "/quran-vocab" }'

count3 = settings.count(old_label)
print(f'2. Settings label: {count3}')
if count3 == 1:
    settings = settings.replace(old_label, new_label, 1)

with open('src/pages/Settings.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(settings)
print(f'Settings saved ({len(settings)} bytes)')
