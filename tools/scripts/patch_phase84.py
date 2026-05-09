"""Phase 84: QuranVocab accessibility improvements"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
vocab_path = os.path.join(WORKSPACE, 'src', 'pages', 'QuranVocab.tsx')

with open(vocab_path, encoding='utf-8') as f:
    content = f.read()

original = content

# 1. Add aria-live to progress text div
old1 = '                <div className="text-sm opacity-70 mt-1 tabular-nums">\n                  {reviewMode ? "\u0645\u0631\u0627\u062c\u0639\u0629 \u2022 " : ""}{(cardIndex + 1).toLocaleString("ar-EG")} / {deck.length.toLocaleString("ar-EG")} \u2022 {learned.size.toLocaleString("ar-EG")} \u0645\u062d\u0641\u0648\u0638\u0629\n                </div>'
new1 = '                <div className="text-sm opacity-70 mt-1 tabular-nums" aria-live="polite" aria-atomic="true">\n                  {reviewMode ? "\u0645\u0631\u0627\u062c\u0639\u0629 \u2022 " : ""}{(cardIndex + 1).toLocaleString("ar-EG")} / {deck.length.toLocaleString("ar-EG")} \u2022 {learned.size.toLocaleString("ar-EG")} \u0645\u062d\u0641\u0648\u0638\u0629\n                </div>'
if old1 in content:
    content = content.replace(old1, new1, 1)
    print('OK: added aria-live to progress counter')
else:
    print('FAIL: progress counter text not found')

# 2. Add aria-label to the "Next" button
old2 = '            className="px-6 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-30"\n            style={{ background: "var(--accent)", color: "var(--on-accent)" }}\n          >\n            \u0627\u0644\u062a\u0627\u0644\u064a \u2190'
new2 = '            aria-label="\u0627\u0644\u0643\u0644\u0645\u0629 \u0627\u0644\u062a\u0627\u0644\u064a\u0629"\n            className="px-6 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-30"\n            style={{ background: "var(--accent)", color: "var(--on-accent)" }}\n          >\n            \u0627\u0644\u062a\u0627\u0644\u064a \u2190'
if old2 in content:
    content = content.replace(old2, new2, 1)
    print('OK: added aria-label to Next button')
else:
    print('FAIL: Next button not found')

# 3. Add aria-label to the "Prev" button
old3 = '            className="px-6 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-30"\n            style={{ background: "var(--card)", color: "var(--fg)", border: "1px solid var(--stroke)" }}\n          >\n            \u2192 \u0627\u0644\u0633\u0627\u0628\u0642'
new3 = '            aria-label="\u0627\u0644\u0643\u0644\u0645\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629"\n            className="px-6 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-30"\n            style={{ background: "var(--card)", color: "var(--fg)", border: "1px solid var(--stroke)" }}\n          >\n            \u2192 \u0627\u0644\u0633\u0627\u0628\u0642'
if old3 in content:
    content = content.replace(old3, new3, 1)
    print('OK: added aria-label to Prev button')
else:
    print('FAIL: Prev button not found')

# 4. Add aria-pressed + aria-label to "learn" button
old4 = '          <button\n            type="button"\n            onClick={() => handleLearn(card.id)}\n            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all"'
new4 = '          <button\n            type="button"\n            onClick={() => handleLearn(card.id)}\n            aria-label={learned.has(card.id) ? "\u0625\u0644\u063a\u0627\u0621 \u062d\u0641\u0638 \u0627\u0644\u0643\u0644\u0645\u0629" : "\u062d\u0641\u0638 \u0627\u0644\u0643\u0644\u0645\u0629"}\n            aria-pressed={learned.has(card.id)}\n            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium transition-all"'
if old4 in content:
    content = content.replace(old4, new4, 1)
    print('OK: added aria-pressed+label to learn button')
else:
    print('FAIL: learn button not found')

if content != original:
    with open(vocab_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('\nFile saved.')
else:
    print('\nNo changes made.')
