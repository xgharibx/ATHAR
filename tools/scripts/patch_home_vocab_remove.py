import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open("src/pages/Home.tsx", "r", encoding="utf-8", errors="surrogatepass") as f:
    c = f.read()

# Remove the standalone كلمة اليوم block that's now inside DailyCarousel
# It appears between the widget loop end and the daily goal pill
old_vocab_block = (
    '\n      {\u0643\u0644\u0645\u0629 \u0627\u0644\u064a\u0648\u0645 \u2014 vocab \u2014 */}\n'
    '      {dailyVocabWord && (\n'
    '        <button\n'
    '          type="button"\n'
    '          onClick={() => navigate("/quran-vocab")}\n'
    '          className="w-full text-right rounded-3xl border transition-all active:scale-[0.99] p-4"\n'
    '          style={{\n'
    '            background: "color-mix(in srgb, var(--accent) 6%, var(--card))",\n'
    '            borderColor: "color-mix(in srgb, var(--accent) 20%, transparent)",\n'
    '          }}\n'
    '          aria-label="\u0643\u0644\u0645\u0629 \u0627\u0644\u064a\u0648\u0645 \u2014 \u0627\u0646\u062a\u0642\u0644 \u0625\u0644\u0649 \u0645\u0641\u0631\u062f\u0627\u062a \u0627\u0644\u0642\u0631\u0622\u0646"\n'
    '        >\n'
    '          <div className="flex items-start justify-between gap-3">\n'
    '            <div className="flex-1 min-w-0">\n'
    '              <div className="text-[10px] font-semibold opacity-45 mb-1.5 tracking-wide uppercase">\u2605 \u0643\u0644\u0645\u0629 \u0627\u0644\u064a\u0648\u0645</div>\n'
    '              <div\n'
    '                className="text-2xl font-bold mb-1 leading-tight"\n'
    '                style={{ fontFamily: "var(--font-arabic, inherit)", color: "var(--accent)" }}\n'
    '                lang="ar"\n'
    '              >\n'
    '                {dailyVocabWord.arabic}\n'
    '              </div>\n'
    '              <div className="text-sm font-medium opacity-75">{dailyVocabWord.meaning}</div>\n'
    '            </div>\n'
    '            <div className="text-[10px] opacity-30 self-center">\u276c</div>\n'
    '          </div>\n'
    '        </button>\n'
    '      )}\n'
)

# Use a broader pattern that can be found
import re
pattern = r'\{/\* \u2500\u2500 \u0643\u0644\u0645\u0629 \u0627\u0644\u064a\u0648\u0645 \u2014 vocab \u2014 \*\/\}.*?\{dailyVocabWord && \(.*?\)\}\n'
match = re.search(pattern, c, re.DOTALL)
if match:
    c = c[:match.start()] + c[match.end():]
    print("Removed standalone vocab block via regex")
else:
    print("WARNING: regex did not match, trying line-based search")
    # Find it by markers
    start_marker = '      {/* \u2500\u2500 \u0643\u0644\u0645\u0629 \u0627\u0644\u064a\u0648\u0645 \u2014 vocab \u2014 */'
    end_marker = '      {/* \u0647\u062f\u0641 \u0622\u064a\u0627\u062a \u0627\u0644\u064a\u0648\u0645'
    si = c.find(start_marker)
    ei = c.find(end_marker)
    if si >= 0 and ei > si:
        c = c[:si] + c[ei:]
        print("Removed standalone vocab block via markers")
    else:
        print(f"ERROR: start={si}, end={ei}")

with open("src/pages/Home.tsx", "w", encoding="utf-8", errors="surrogatepass", newline="\n") as f:
    f.write(c)

print("Home.tsx updated")
