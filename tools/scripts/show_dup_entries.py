import re
# IDs that need to be replaced (the early duplicates)
target_ids = [17, 25, 32, 33, 34, 40, 45, 46, 50, 62, 84, 121, 122, 123, 126, 132, 135, 178]

with open('src/data/quranVocab.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Find each entry block
pattern = re.compile(r'\{[^{}]*?id:\s*(\d+)[^{}]*?\}', re.DOTALL)
for m in pattern.finditer(content):
    eid = int(m.group(1))
    if eid in target_ids:
        print(f'--- id {eid} ---')
        print(m.group(0)[:300])
        print()
