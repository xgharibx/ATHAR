import re
with open('src/data/quranVocab.ts', 'r', encoding='utf-8') as f:
    content = f.read()
m = re.search(r'\{ id: 17.*?\}', content, re.DOTALL)
if m:
    print(repr(m.group(0)))
    # Try to replace using re
    new_entry = '{ id: 17, arabic: "\u0648\u064e\u062d\u0652\u064a", meaning: "\u0627\u0644\u0648\u062d\u064a \u2014 \u0625\u0644\u0642\u0627\u0621 \u0627\u0644\u0644\u0647 \u0627\u0644\u0645\u0639\u0646\u0649 \u0641\u064a \u0642\u0644\u0628 \u0627\u0644\u0646\u0628\u064a \u0623\u0648 \u0625\u0631\u0633\u0627\u0644\u0647 \u0628\u0648\u0627\u0633\u0637\u0629 \u062c\u0628\u0631\u064a\u0644 \u0639\u0644\u064a\u0647 \u0627\u0644\u0633\u0644\u0627\u0645", frequency: 78 }'
    content2 = re.sub(r'\{ id: 17.*?\}', new_entry, content, count=1, flags=re.DOTALL)
    if content2 != content:
        with open('src/data/quranVocab.ts', 'w', encoding='utf-8', newline='\n') as f:
            f.write(content2)
        print('Saved id 17 fix')
    else:
        print('No change made')
