import re
with open('src/data/quranVocab.ts', 'r', encoding='utf-8') as f:
    content = f.read()
entries = re.findall(r'id:\s*(\d+)[^}]+?arabic:\s*"([^"]+)"', content, re.DOTALL)
print('All words:')
for eid, arabic in sorted(entries, key=lambda x: int(x[0])):
    print(f'  id {eid:>3}: {arabic}')
