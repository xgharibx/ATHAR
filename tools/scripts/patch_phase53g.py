"""Patch Phase 53g: Duas - add role=list to container, role=listitem to each dua card."""

path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Duas.tsx'
content = open(path, encoding='utf-8').read()

# Add role=list to the duas list container
old1 = '''      {/* Duas list */}
      <div className="px-4 pt-4 space-y-4">'''

new1 = '''      {/* Duas list */}
      <div className="px-4 pt-4 space-y-4" role="list" aria-label="قائمة الأدعية">'''

if old1 in content:
    content = content.replace(old1, new1, 1)
    print("Duas: PATCHED list container role=list")
else:
    print("Duas: list container not found")

# Add role=listitem to each dua card
old2 = '''            <div
              key={dua.id}
              className="rounded-2xl p-4 cv-auto"
              style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}
            >'''

new2 = '''            <div
              key={dua.id}
              role="listitem"
              className="rounded-2xl p-4 cv-auto"
              style={{ background: "var(--card)", border: "1px solid var(--stroke)" }}
            >'''

if old2 in content:
    content = content.replace(old2, new2, 1)
    print("Duas: PATCHED dua card role=listitem")
else:
    print("Duas: dua card not found")

open(path, 'w', encoding='utf-8').write(content)
print("Done.")
