import re
with open('src/data/quranVocab.ts', 'r', encoding='utf-8') as f:
    content = f.read()
entries = re.findall(r'id:\s*(\d+)[^}]+?arabic:\s*"([^"]+)"', content, re.DOTALL)
seen = {}
dups = []
for eid, arabic in entries:
    clean = arabic.strip()
    if clean in seen:
        dups.append((seen[clean], eid, clean))
    else:
        seen[clean] = eid
print(f'Total entries: {len(entries)}')
print(f'Duplicates ({len(dups)}):')
for orig, dup, word in dups:
    print(f'  id {orig} and id {dup}: {word}')
