#!/usr/bin/env python3
"""Add jump-to-daily-word button in QuranVocab header."""

with open('src/pages/QuranVocab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Add dailyWordIdx computed value after dailyWordId
old1 = '  const dailyWordId = React.useMemo(() => getDailyWordId(), []);'
new1 = (
    '  const dailyWordId = React.useMemo(() => getDailyWordId(), []);\n'
    '  const dailyWordIdx = React.useMemo(() => deck.findIndex((w) => w.id === dailyWordId), [deck, dailyWordId]);'
)

count1 = content.count(old1)
if count1 == 1:
    content = content.replace(old1, new1, 1)
    print('dailyWordIdx added')
else:
    print(f'Pattern 1 found {count1} times')

# Add the jump button after the BookOpen button
old2 = '''              <button type="button"
                onClick={() => setReviewMode((v) => !v)}
                className="p-2 rounded-xl transition-colors"
                style={{
                  background: reviewMode ? "rgba(16,185,129,0.18)" : "var(--card)",
                  color: reviewMode ? "#10b981" : "var(--fg)",
                  border: reviewMode ? "1px solid rgba(16,185,129,0.35)" : "1px solid transparent",
                }}
                aria-label="مراجعة المحفوظات"
                aria-pressed={reviewMode}
                title="مراجعة المحفوظات فقط"
              >
                <BookOpen size={16} aria-hidden="true" />
              </button>'''

new2 = '''              <button type="button"
                onClick={() => setReviewMode((v) => !v)}
                className="p-2 rounded-xl transition-colors"
                style={{
                  background: reviewMode ? "rgba(16,185,129,0.18)" : "var(--card)",
                  color: reviewMode ? "#10b981" : "var(--fg)",
                  border: reviewMode ? "1px solid rgba(16,185,129,0.35)" : "1px solid transparent",
                }}
                aria-label="مراجعة المحفوظات"
                aria-pressed={reviewMode}
                title="مراجعة المحفوظات فقط"
              >
                <BookOpen size={16} aria-hidden="true" />
              </button>
              {dailyWordIdx >= 0 && cardIndex !== dailyWordIdx && (
                <button type="button"
                  onClick={() => { setCardIndex(dailyWordIdx); setFlipped(false); }}
                  className="p-2 rounded-xl transition-colors ml-auto"
                  style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)" }}
                  aria-label="الانتقال لكلمة اليوم"
                  title="كلمة اليوم"
                >
                  <Star size={15} aria-hidden="true" />
                </button>
              )}'''

count2 = content.count(old2)
if count2 == 1:
    content = content.replace(old2, new2, 1)
    print('Jump-to-daily button added')
else:
    print(f'Pattern 2 found {count2} times')

with open('src/pages/QuranVocab.tsx', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print('Saved')
