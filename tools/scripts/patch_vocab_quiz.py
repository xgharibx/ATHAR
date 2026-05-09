#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 17: Add quiz/MCQ mode to QuranVocab."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/QuranVocab.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# ─────────────────────────────────────────────────────────────────────────────
# 1. Add HelpCircle to imports
# ─────────────────────────────────────────────────────────────────────────────
old_import = 'import { ArrowRight, Shuffle, RotateCcw, CheckCircle2, BookOpen, Share2, Copy, Star, List, CreditCard, Search, X as XIcon } from "lucide-react";'
new_import = 'import { ArrowRight, Shuffle, RotateCcw, CheckCircle2, BookOpen, Share2, Copy, Star, List, CreditCard, Search, X as XIcon, HelpCircle, ChevronLeft } from "lucide-react";'

if old_import in content:
    content = content.replace(old_import, new_import, 1)
    print('1. Import updated')
else:
    print('1. Import NOT found')

# ─────────────────────────────────────────────────────────────────────────────
# 2. Add quiz state variables after browseQuery state
# ─────────────────────────────────────────────────────────────────────────────
old_state_block = '  const [browseMode, setBrowseMode] = React.useState(false);\n  const [browseQuery, setBrowseQuery] = React.useState("");'
new_state_block = '''\
  const [browseMode, setBrowseMode] = React.useState(false);
  const [browseQuery, setBrowseQuery] = React.useState("");
  const [quizMode, setQuizMode] = React.useState(false);
  const [quizQueue, setQuizQueue] = React.useState<number[]>([]);
  const [quizIdx, setQuizIdx] = React.useState(0);
  const [quizSelected, setQuizSelected] = React.useState<number | null>(null);
  const [quizCorrect, setQuizCorrect] = React.useState(0);
  const [quizTotal, setQuizTotal] = React.useState(0);
  const [quizDone, setQuizDone] = React.useState(false);'''

if old_state_block in content:
    content = content.replace(old_state_block, new_state_block, 1)
    print('2. Quiz state added')
else:
    print('2. State block NOT found')

# ─────────────────────────────────────────────────────────────────────────────
# 3. Add quiz helpers & memo after browseList memo
# ─────────────────────────────────────────────────────────────────────────────
old_after_browse_list = '''\
  }, [browseQuery]);

  const dailyWordIdx'''
new_after_browse_list = '''\
  }, [browseQuery]);

  // ── Quiz helpers ──────────────────────────────────────────────────────────
  function startQuiz(wordIds: number[]) {
    const q = shuffle(wordIds);
    setQuizQueue(q);
    setQuizIdx(0);
    setQuizSelected(null);
    setQuizCorrect(0);
    setQuizTotal(0);
    setQuizDone(false);
    setQuizMode(true);
    setBrowseMode(false);
  }

  const quizCard = React.useMemo(() => {
    if (!quizMode || quizDone || quizIdx >= quizQueue.length) return null;
    const wordId = quizQueue[quizIdx];
    if (wordId === undefined) return null;
    const word = QURAN_VOCAB.find((w) => w.id === wordId);
    if (!word) return null;
    const distractors = shuffle(QURAN_VOCAB.filter((w) => w.id !== wordId)).slice(0, 3);
    const options = shuffle([word, ...distractors]);
    return { word, options };
  }, [quizMode, quizDone, quizIdx, quizQueue]);

  function handleQuizSelect(optionId: number) {
    if (quizSelected !== null || !quizCard) return;
    const isCorrect = optionId === quizCard.word.id;
    setQuizSelected(optionId);
    setQuizTotal((t) => t + 1);
    if (isCorrect) setQuizCorrect((c) => c + 1);
  }

  function handleQuizNext() {
    const nextIdx = quizIdx + 1;
    if (nextIdx >= quizQueue.length) {
      setQuizDone(true);
    } else {
      setQuizIdx(nextIdx);
      setQuizSelected(null);
    }
  }

  const dailyWordIdx'''

if old_after_browse_list in content:
    content = content.replace(old_after_browse_list, new_after_browse_list, 1)
    print('3. Quiz helpers added')
else:
    print('3. After browseList block NOT found')

# ─────────────────────────────────────────────────────────────────────────────
# 4. Add quiz button to header actions row (after browse toggle button)
# ─────────────────────────────────────────────────────────────────────────────
old_browse_btn_end = '''\
                  {browseMode ? <CreditCard size={16} aria-hidden="true" /> : <List size={16} aria-hidden="true" />}
                </button>'''
new_browse_btn_end = '''\
                  {browseMode ? <CreditCard size={16} aria-hidden="true" /> : <List size={16} aria-hidden="true" />}
                </button>
                <button
                  type="button"
                  onClick={() => startQuiz(QURAN_VOCAB.map((w) => w.id))}
                  className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95"
                  style={{
                    background: quizMode ? "color-mix(in srgb, #a78bfa 15%, transparent)" : "var(--card)",
                    color: quizMode ? "#a78bfa" : "var(--fg)",
                    border: quizMode ? "1px solid rgba(167,139,250,0.35)" : "1px solid transparent",
                  }}
                  aria-pressed={quizMode}
                  aria-label="\u0627\u062e\u062a\u0628\u0627\u0631 \u0627\u0644\u0645\u0641\u0631\u062f\u0627\u062a"
                >
                  <HelpCircle size={16} aria-hidden="true" />
                </button>'''

if old_browse_btn_end in content:
    content = content.replace(old_browse_btn_end, new_browse_btn_end, 1)
    print('4. Quiz button added to header')
else:
    print('4. Browse button end NOT found')

# ─────────────────────────────────────────────────────────────────────────────
# 5. Add quiz UI section before Browse list mode
# ─────────────────────────────────────────────────────────────────────────────
old_browse_section_start = '      {/* Browse list mode */}\n      {browseMode && ('
new_browse_section_start = '''\
      {/* Quiz mode */}
      {quizMode && (
        <div className="px-4 pt-4 pb-32">
          {/* Quiz header */}
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={() => setQuizMode(false)} className="text-xs opacity-50 hover:opacity-80 flex items-center gap-1" aria-label="\u0625\u063a\u0644\u0627\u0642 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631">
              <XIcon size={13} /> \u0625\u063a\u0644\u0627\u0642
            </button>
            <div className="text-xs font-semibold" style={{ color: "#a78bfa" }}>
              {!quizDone ? `${(quizIdx + 1).toLocaleString("ar-EG")} / ${quizQueue.length.toLocaleString("ar-EG")}` : "\u0627\u0646\u062a\u0647\u064a\u062a!"}
            </div>
            <div className="text-xs opacity-50 tabular-nums">
              {quizCorrect.toLocaleString("ar-EG")}/{quizTotal.toLocaleString("ar-EG")} \u0635\u062d\u064a\u062d
            </div>
          </div>

          {/* Progress bar */}
          {!quizDone && (
            <div className="h-1 rounded-full mb-5 overflow-hidden" style={{ background: "var(--card)" }}>
              <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.round((quizIdx / quizQueue.length) * 100)}%`, background: "#a78bfa" }} />
            </div>
          )}

          {/* Quiz done screen */}
          {quizDone && (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="text-5xl">{quizCorrect / quizTotal >= 0.8 ? "\ud83c\udf1f" : quizCorrect / quizTotal >= 0.5 ? "\ud83d\udcaa" : "\ud83d\udcda"}</div>
              <div className="text-lg font-bold">\u0623\u062a\u0645\u0645\u062a \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631</div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: "#a78bfa" }}>
                {quizCorrect.toLocaleString("ar-EG")} / {quizTotal.toLocaleString("ar-EG")}
              </div>
              <div className="text-sm opacity-60">
                {quizCorrect / quizTotal >= 0.8
                  ? "\u0645\u0645\u062a\u0627\u0632! \u062d\u0641\u0638\u062a\u0651 \u0643\u062b\u064a\u0631\u0627\u064b \u0645\u0646 \u0645\u0641\u0631\u062f\u0627\u062a \u0627\u0644\u0642\u0631\u0622\u0646"
                  : quizCorrect / quizTotal >= 0.5
                  ? "\u062c\u064a\u062f! \u0627\u0633\u062a\u0645\u0631\u0651 \u0641\u064a \u0627\u0644\u062a\u0639\u0644\u0645"
                  : "\u0627\u0633\u062a\u0645\u0631\u0651 \u0641\u064a \u0627\u0644\u062a\u062f\u0631\u064a\u0628 \u0633\u062a\u062a\u062d\u0633\u0651\u0646"}
              </div>
              <div className="flex gap-2 mt-2">
                <button type="button" onClick={() => startQuiz(QURAN_VOCAB.map((w) => w.id))} className="px-4 py-2 rounded-2xl text-sm font-semibold transition-all active:scale-95" style={{ background: "#a78bfa", color: "#fff" }}>
                  \u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0627\u062e\u062a\u0628\u0627\u0631
                </button>
                <button type="button" onClick={() => setQuizMode(false)} className="px-4 py-2 rounded-2xl text-sm transition-all active:scale-95" style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}>
                  \u0625\u063a\u0644\u0627\u0642
                </button>
              </div>
            </div>
          )}

          {/* Question card */}
          {!quizDone && quizCard && (
            <div className="space-y-4">
              <div className="rounded-3xl p-6 text-center" style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}>
                <div className="text-4xl font-bold mb-2" style={{ fontFamily: "var(--font-arabic, inherit)", color: "var(--fg)" }}>
                  {quizCard.word.arabic}
                </div>
                <div className="text-xs opacity-40">\u0645\u0627 \u0645\u0639\u0646\u0649 \u0647\u0630\u0647 \u0627\u0644\u0643\u0644\u0645\u0629\u061f</div>
              </div>

              <div className="space-y-2">
                {quizCard.options.map((opt) => {
                  const isSelected = quizSelected === opt.id;
                  const isCorrect = opt.id === quizCard.word.id;
                  const revealed = quizSelected !== null;
                  let bg = "var(--card)";
                  let border = "1px solid var(--stroke)";
                  if (revealed && isCorrect) { bg = "color-mix(in srgb, var(--ok) 18%, transparent)"; border = "1px solid color-mix(in srgb, var(--ok) 40%, transparent)"; }
                  else if (revealed && isSelected && !isCorrect) { bg = "color-mix(in srgb, #f87171 15%, transparent)"; border = "1px solid rgba(248,113,113,0.4)"; }
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleQuizSelect(opt.id)}
                      disabled={revealed}
                      className="w-full text-right px-4 py-3 rounded-2xl text-sm transition-all active:scale-[0.99]"
                      style={{ background: bg, border }}
                    >
                      <span style={{ color: revealed && isCorrect ? "var(--ok)" : revealed && isSelected ? "#f87171" : "var(--fg)" }}>
                        {opt.meaning.split("\u2014").slice(-1)[0]?.trim() ?? opt.meaning}
                      </span>
                    </button>
                  );
                })}
              </div>

              {quizSelected !== null && (
                <button type="button" onClick={handleQuizNext} className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.99]" style={{ background: "#a78bfa", color: "#fff" }}>
                  {quizIdx + 1 < quizQueue.length ? <>\u0627\u0644\u0633\u0624\u0627\u0644 \u0627\u0644\u062a\u0627\u0644\u064a <ChevronLeft size={16} aria-hidden="true" /></> : "\u0639\u0631\u0636 \u0627\u0644\u0646\u062a\u064a\u062c\u0629"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Browse list mode */}
      {browseMode && ('''

if old_browse_section_start in content:
    content = content.replace(old_browse_section_start, new_browse_section_start, 1)
    print('5. Quiz UI section added')
else:
    print('5. Browse section start NOT found')

# ─────────────────────────────────────────────────────────────────────────────
# 6. Hide flashcard and browse sections when quizMode is active
# ─────────────────────────────────────────────────────────────────────────────
old_browse_cond = '      {!browseMode && ('
new_browse_cond = '      {!browseMode && !quizMode && ('

count = content.count(old_browse_cond)
if count == 1:
    content = content.replace(old_browse_cond, new_browse_cond, 1)
    print('6. Flashcard visibility guard updated')
else:
    print(f'6. Pattern found {count} times (expected 1)')

with open('src/pages/QuranVocab.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
