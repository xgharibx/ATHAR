"""Patch Phase 53d:
1. ProphetStories - story list gets role=list, StoryCard root gets role=listitem
2. Companions - companions list gets role=list, items get role=listitem
3. AsmaAlHusna - names grid gets role=list, each card gets role=listitem
"""

# ─── ProphetStories ───────────────────────────────────────────────────────────
path1 = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\ProphetStories.tsx'
content = open(path1, encoding='utf-8').read()

# Add role=list to the stories container
old1 = '''      {/* Stories */}
      <div className="px-4 pt-4 space-y-3">'''

new1 = '''      {/* Stories */}
      <div className="px-4 pt-4 space-y-3" role="list" aria-label="قائمة قصص الأنبياء">'''

if old1 in content:
    content = content.replace(old1, new1, 1)
    print("ProphetStories: PATCHED stories container role=list")
else:
    print(f"ProphetStories: container not found")

# Add role=listitem to StoryCard container
old2 = '''    <div
      className="rounded-2xl overflow-hidden transition-all duration-200 cv-auto"
      style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}
    >'''

new2 = '''    <div
      role="listitem"
      className="rounded-2xl overflow-hidden transition-all duration-200 cv-auto"
      style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}
    >'''

if old2 in content:
    content = content.replace(old2, new2, 1)
    print("ProphetStories: PATCHED StoryCard role=listitem")
else:
    print(f"ProphetStories: StoryCard div not found")

open(path1, 'w', encoding='utf-8').write(content)


# ─── Companions ──────────────────────────────────────────────────────────────
path2 = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Companions.tsx'
content2 = open(path2, encoding='utf-8').read()

# Find the companions list container
import re

# Find pattern: div className with space-y or grid and map((c =>
match = re.search(r'<div[^>]+className="[^"]*space-y[^"]*"[^>]*>\s*\{(?:filtered|companions)\.map', content2)
if match:
    print(f"Companions: found list container at char {match.start()}")
    print(f"  Snippet: {content2[match.start():match.start()+100]}")
else:
    # Try different approach
    match2 = re.search(r'filtered\.map\(\(c\b', content2)
    if match2:
        start = max(0, match2.start() - 200)
        print(f"Companions: filtered.map found. Context: {content2[start:match2.start()+50]}")
    else:
        print("Companions: filtered.map not found")

print("\nDone.")
