"""Patch Phase 53c: 
1. SeerahTimeline - timeline list gets role=list, items get role=listitem + aria-label for icon
2. QuranPlans plan preset items get role=list/listitem
"""

# ─── SeerahTimeline ───────────────────────────────────────────────────────────
path1 = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\SeerahTimeline.tsx'
content = open(path1, encoding='utf-8').read()

old1 = '''          <div className="flex flex-col gap-4">
            {filtered.length === 0 ? (
              <div className="text-center py-10 opacity-50 text-sm" style={{ color: "var(--fg)" }}>
                لا توجد نتائج
              </div>
            ) : filtered.map((event) => {
              const color = getCategoryColor(event.category);
              return (
                <div key={event.id} className="flex items-start gap-4">'''

new1 = '''          <div className="flex flex-col gap-4" role="list" aria-label="أحداث السيرة النبوية">
            {filtered.length === 0 ? (
              <div className="text-center py-10 opacity-50 text-sm" style={{ color: "var(--fg)" }}>
                لا توجد نتائج
              </div>
            ) : filtered.map((event) => {
              const color = getCategoryColor(event.category);
              return (
                <div key={event.id} role="listitem" className="flex items-start gap-4">'''

if old1 in content:
    content = content.replace(old1, new1, 1)
    # Add aria-hidden to the icon dot
    old1b = '''                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm"
                      style={{ background: `${color}22`, border: `2px solid ${color}` }}
                    >
                      {event.icon}
                    </div>'''
    new1b = '''                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm"
                      style={{ background: `${color}22`, border: `2px solid ${color}` }}
                      aria-hidden="true"
                    >
                      {event.icon}
                    </div>'''
    if old1b in content:
        content = content.replace(old1b, new1b, 1)
        print("SeerahTimeline: PATCHED list + aria-hidden icon")
    else:
        print("SeerahTimeline: list patched but icon not found")
else:
    print("SeerahTimeline: OLD not found")
open(path1, 'w', encoding='utf-8').write(content)


# ─── ProphetStories list ──────────────────────────────────────────────────────
path2 = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\ProphetStories.tsx'
content2 = open(path2, encoding='utf-8').read()

# Check the prophets list container
import re
match = re.search(r'\.map\(\s*\(prophet\)', content2)
if match:
    # Find the parent div
    start = max(0, match.start() - 300)
    snippet = content2[start:match.start()+200]
    print(f"ProphetStories near map: ...{snippet[-200:]}...")
else:
    print("ProphetStories: map(prophet) not found")

# Also check if the list for Duas/AsmaAlHusna items need role=list
print("\nDone with phase53c patches.")
