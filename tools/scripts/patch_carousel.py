import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open("src/components/ui/DailyCarousel.tsx", "r", encoding="utf-8", errors="surrogatepass") as f:
    c = f.read()

# 1. Add QURAN_VOCAB import after existing imports
old_import = 'import { getTodayWisdom } from "@/data/dailyWisdom";'
new_import = 'import { getTodayWisdom } from "@/data/dailyWisdom";\nimport { QURAN_VOCAB } from "@/data/quranVocab";'
assert old_import in c, "import anchor not found"
c = c.replace(old_import, new_import, 1)

# 2. Update SLIDE_LABELS from 3 to 4 items
old_labels = 'const SLIDE_LABELS = ["\u0622\u064a\u0629 \u0627\u0644\u064a\u0648\u0645", "\u062d\u062f\u064a\u062b \u0627\u0644\u064a\u0648\u0645", "\u062a\u062f\u0628\u0631 \u0627\u0644\u064a\u0648\u0645"] as const;'
new_labels = 'const SLIDE_LABELS = ["\u0622\u064a\u0629 \u0627\u0644\u064a\u0648\u0645", "\u062d\u062f\u064a\u062b \u0627\u0644\u064a\u0648\u0645", "\u062a\u062f\u0628\u0631 \u0627\u0644\u064a\u0648\u0645", "\u0643\u0644\u0645\u0629 \u0627\u0644\u064a\u0648\u0645"] as const;'
assert old_labels in c, "SLIDE_LABELS anchor not found"
c = c.replace(old_labels, new_labels, 1)

# 3. Add vocabWord memo after wisdom memo
old_wisdom = '  const wisdom = React.useMemo(() => getTodayWisdom(dateKey), [dateKey]);'
new_wisdom = ('  const wisdom = React.useMemo(() => getTodayWisdom(dateKey), [dateKey]);\n\n'
              '  const vocabWord = React.useMemo(() => {\n'
              '    if (!QURAN_VOCAB.length) return null;\n'
              '    let hash = 0;\n'
              '    for (let i = 0; i < dateKey.length; i++) hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;\n'
              '    return QURAN_VOCAB[hash % QURAN_VOCAB.length] ?? null;\n'
              '  }, [dateKey]);')
assert old_wisdom in c, "wisdom memo anchor not found"
c = c.replace(old_wisdom, new_wisdom, 1)

# 4. Auto-advance: change % 3 to % 4
old_advance = 'setActiveIdx((prev) => (prev + 1) % 3);'
new_advance = 'setActiveIdx((prev) => (prev + 1) % 4);'
assert old_advance in c, "auto-advance anchor not found"
c = c.replace(old_advance, new_advance, 1)

# 5. ArrowLeft handler: (p + 1) % 3 -> % 4
old_left = 'if (e.key === \'ArrowLeft\') { e.preventDefault(); pauseUntilRef.current = Date.now() + 8000; setActiveIdx((p) => (p + 1) % 3); }'
new_left = 'if (e.key === \'ArrowLeft\') { e.preventDefault(); pauseUntilRef.current = Date.now() + 8000; setActiveIdx((p) => (p + 1) % 4); }'
assert old_left in c, "ArrowLeft anchor not found"
c = c.replace(old_left, new_left, 1)

# 6. ArrowRight handler: (p - 1 + 3) -> (p - 1 + 4)
old_right = 'else if (e.key === \'ArrowRight\') { e.preventDefault(); pauseUntilRef.current = Date.now() + 8000; setActiveIdx((p) => (p - 1 + 3) % 3); }'
new_right = 'else if (e.key === \'ArrowRight\') { e.preventDefault(); pauseUntilRef.current = Date.now() + 8000; setActiveIdx((p) => (p - 1 + 4) % 4); }'
assert old_right in c, "ArrowRight anchor not found"
c = c.replace(old_right, new_right, 1)

# 7. Touch swipe: Math.min(prev + 1, 2) -> Math.min(prev + 1, 3)
old_swipe = 'if (delta > 0) return Math.min(prev + 1, 2); // swipe left \u2192 next'
new_swipe = 'if (delta > 0) return Math.min(prev + 1, 3); // swipe left \u2192 next'
assert old_swipe in c, "swipe anchor not found"
c = c.replace(old_swipe, new_swipe, 1)

# 8. Add 4th slide BEFORE closing </div></div> of slides container
old_slide3_end = (
    '          </div>\n'
    '        </div>\n'
    '      </div>\n\n'
    '      {/* Dot indicators */}'
)
new_slide3_end = (
    '          </div>\n\n'
    '          {/* Slide 4: \u0643\u0644\u0645\u0629 \u0627\u0644\u064a\u0648\u0645 */}\n'
    '          <div id="carousel-slide-3" role="group" aria-roledescription="\u0634\u0631\u064a\u062d\u0629" aria-label="\u0643\u0644\u0645\u0629 \u0627\u0644\u064a\u0648\u0645" style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>\n'
    '            {vocabWord ? (\n'
    '              <button\n'
    '                type="button"\n'
    '                onClick={() => navigate("/quran-vocab")}\n'
    '                className="w-full text-right"\n'
    '                aria-label="\u0627\u0646\u062a\u0642\u0644 \u0625\u0644\u0649 \u0645\u0641\u0631\u062f\u0627\u062a \u0627\u0644\u0642\u0631\u0622\u0646"\n'
    '              >\n'
    '                <div\n'
    '                  className="text-3xl font-bold mb-1.5 leading-tight arabic-text"\n'
    '                  style={{ color: "var(--accent)" }}\n'
    '                  lang="ar"\n'
    '                >\n'
    '                  {vocabWord.arabic}\n'
    '                </div>\n'
    '                <div className="text-sm font-medium opacity-75 mb-2">{vocabWord.meaning}</div>\n'
    '                <div className="flex items-center justify-between">\n'
    '                  <span\n'
    '                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"\n'
    '                    style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}\n'
    '                  >\n'
    '                    \u0635\u0641 {vocabWord.id} \u2022 \u062a\u0631\u062f\u062f {vocabWord.frequency.toLocaleString("ar-EG")}\u00d7\n'
    '                  </span>\n'
    '                  <span className="text-[10px] opacity-40">\u0627\u0636\u063a\u0637 \u0644\u0644\u062a\u0639\u0644\u0645 \u276c</span>\n'
    '                </div>\n'
    '              </button>\n'
    '            ) : (\n'
    '              <div className="text-sm opacity-50 py-4 text-center">\u0644\u0627 \u062a\u0648\u062c\u062f \u0643\u0644\u0645\u0629</div>\n'
    '            )}\n'
    '          </div>\n'
    '        </div>\n'
    '      </div>\n\n'
    '      {/* Dot indicators */}'
)
assert old_slide3_end in c, "slide3 end anchor not found"
c = c.replace(old_slide3_end, new_slide3_end, 1)

# 9. Dot indicators: [0, 1, 2] -> [0, 1, 2, 3]
old_dots = '{[0, 1, 2].map((i) => ('
new_dots = '{[0, 1, 2, 3].map((i) => ('
assert old_dots in c, "dots anchor not found"
c = c.replace(old_dots, new_dots, 1)

with open("src/components/ui/DailyCarousel.tsx", "w", encoding="utf-8", errors="surrogatepass", newline="\n") as f:
    f.write(c)

print("DailyCarousel.tsx updated: 4th slide (kalimat alyawm) added")
