"""Patch Phase 53f: AsmaAlHusna - add role=list to grid, role=listitem to each name card."""

path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\AsmaAlHusna.tsx'
content = open(path, encoding='utf-8').read()

# Add role=list to the grid
old1 = '''      {/* Grid */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3">'''

new1 = '''      {/* Grid */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-3" role="list" aria-label="أسماء الله الحسنى">'''

if old1 in content:
    content = content.replace(old1, new1, 1)
    print("AsmaAlHusna: PATCHED grid role=list")
else:
    print("AsmaAlHusna: grid not found")

# Add role=listitem to each name card
old2 = '''            <div
              key={name.id}
              className="rounded-2xl transition-all duration-200 cv-auto"
              style={{
                background: isExpanded ? "var(--accent)" : "var(--card)",
                border: `1px solid ${isExpanded ? "transparent" : "var(--stroke)"}`,
                color: isExpanded ? "var(--on-accent)" : "var(--fg)",
                gridColumn: isExpanded ? "span 2" : undefined,
              }}
            >'''

new2 = '''            <div
              key={name.id}
              role="listitem"
              className="rounded-2xl transition-all duration-200 cv-auto"
              style={{
                background: isExpanded ? "var(--accent)" : "var(--card)",
                border: `1px solid ${isExpanded ? "transparent" : "var(--stroke)"}`,
                color: isExpanded ? "var(--on-accent)" : "var(--fg)",
                gridColumn: isExpanded ? "span 2" : undefined,
              }}
            >'''

if old2 in content:
    content = content.replace(old2, new2, 1)
    print("AsmaAlHusna: PATCHED name card role=listitem")
else:
    print("AsmaAlHusna: name card not found")

open(path, 'w', encoding='utf-8').write(content)
print("Done.")
