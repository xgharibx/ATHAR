"""Patch Phase 53e:
1. Companions - add role=list to grid container, role=listitem to each card
2. AsmaAlHusna - add role=list to grid, role=listitem to each item (check first)
"""

# ─── Companions ──────────────────────────────────────────────────────────────
path1 = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Companions.tsx'
content = open(path1, encoding='utf-8').read()

# Add role=list to the grid container
old1 = '''      {/* Cards grid */}
      <div className="relative z-10 grid grid-cols-1 gap-3 p-4">'''

new1 = '''      {/* Cards grid */}
      <div className="relative z-10 grid grid-cols-1 gap-3 p-4" role="list" aria-label="قائمة الصحابة">'''

if old1 in content:
    content = content.replace(old1, new1, 1)
    print("Companions: PATCHED grid container role=list")
else:
    print("Companions: grid container not found")

# Add role=listitem to each companion card
old2 = '''            <div
              key={companion.id}
              className="relative overflow-hidden rounded-3xl glass cv-auto"
              style={{ border: "1px solid var(--stroke)" }}
            >'''

new2 = '''            <div
              key={companion.id}
              role="listitem"
              className="relative overflow-hidden rounded-3xl glass cv-auto"
              style={{ border: "1px solid var(--stroke)" }}
            >'''

if old2 in content:
    content = content.replace(old2, new2, 1)
    print("Companions: PATCHED companion card role=listitem")
else:
    print("Companions: companion card not found")

open(path1, 'w', encoding='utf-8').write(content)


# ─── Inspect AsmaAlHusna grid ─────────────────────────────────────────────────
path2 = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\AsmaAlHusna.tsx'
content2 = open(path2, encoding='utf-8').read()
import re

match = re.search(r'filtered\.map\(', content2)
if match:
    start = max(0, match.start() - 200)
    print(f"\nAsmaAlHusna map context:\n...{content2[start:match.start()+200]}...")
else:
    print("AsmaAlHusna: filtered.map not found")
