"""Patch Phase 54a:
1. WuduGuide - steps container gets role=list
2. PrayerGuide - steps container gets role=list, each step div gets role=listitem
3. Ruqyah - section items panel gets role=list
"""

# ─── WuduGuide ─────────────────────────────────────────────────────────────
path1 = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\WuduGuide.tsx'
content = open(path1, encoding='utf-8').read()

old1 = '''      {/* Steps */}
      <div className="px-4 mt-4 space-y-3">'''

new1 = '''      {/* Steps */}
      <div className="px-4 mt-4 space-y-3" role="list" aria-label="خطوات الوضوء">'''

if old1 in content:
    content = content.replace(old1, new1, 1)
    print("WuduGuide: PATCHED steps container role=list")
else:
    print("WuduGuide: steps container not found")
open(path1, 'w', encoding='utf-8').write(content)


# ─── PrayerGuide ─────────────────────────────────────────────────────────────
path2 = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\PrayerGuide.tsx'
content2 = open(path2, encoding='utf-8').read()

old2 = '''      {/* Steps */}
      <div className="px-4 mt-4 space-y-2">'''

new2 = '''      {/* Steps */}
      <div className="px-4 mt-4 space-y-2" role="list" aria-label="خطوات الصلاة">'''

if old2 in content2:
    content2 = content2.replace(old2, new2, 1)
    print("PrayerGuide: PATCHED steps container role=list")
else:
    print("PrayerGuide: steps container not found")

# Add role=listitem to each step div
old2b = '''            <div
              key={step.id}
              className="rounded-2xl overflow-hidden transition-all duration-200"
              style={{
                background: isOpen ? "var(--accent)" : "var(--card)",
                border: "1px solid var(--stroke)",
                color: isOpen ? "var(--on-accent)" : "var(--fg)",
              }}
            >'''

new2b = '''            <div
              key={step.id}
              role="listitem"
              className="rounded-2xl overflow-hidden transition-all duration-200"
              style={{
                background: isOpen ? "var(--accent)" : "var(--card)",
                border: "1px solid var(--stroke)",
                color: isOpen ? "var(--on-accent)" : "var(--fg)",
              }}
            >'''

if old2b in content2:
    content2 = content2.replace(old2b, new2b, 1)
    print("PrayerGuide: PATCHED step card role=listitem")
else:
    print("PrayerGuide: step card not found")

open(path2, 'w', encoding='utf-8').write(content2)


# ─── Ruqyah ─────────────────────────────────────────────────────────────────
path3 = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Ruqyah.tsx'
content3 = open(path3, encoding='utf-8').read()

# Add role=list to the items panel
old3 = '''      <div id={`ruqyah-panel-${section.id}`} hidden={!expanded} className="px-4 pb-4 space-y-3 border-t border-[var(--stroke)] pt-3">'''

new3 = '''      <div id={`ruqyah-panel-${section.id}`} hidden={!expanded} className="px-4 pb-4 space-y-3 border-t border-[var(--stroke)] pt-3" role="list">'''

if old3 in content3:
    content3 = content3.replace(old3, new3, 1)
    print("Ruqyah: PATCHED items panel role=list")
else:
    print("Ruqyah: items panel not found")

# Find RuqyahItemCard container to add role=listitem
old3b = '          <RuqyahItemCard key={item.id} item={item} idx={idx} />'
new3b = '          <div role="listitem"><RuqyahItemCard key={item.id} item={item} idx={idx} /></div>'

if old3b in content3:
    # Actually this pattern might be wrong - key should be on outer element
    print("Ruqyah: RuqyahItemCard found - but key prop must stay on outermost element")
    # Don't add wrapping div as it breaks React key prop semantics
    # Instead add role=listitem to RuqyahItemCard's root element
    print("Ruqyah: skipping RuqyahItemCard listitem (need to patch the component itself)")
else:
    print("Ruqyah: RuqyahItemCard not found")

open(path3, 'w', encoding='utf-8').write(content3)

# Patch RuqyahItemCard root to have role=listitem
import re
content3 = open(path3, encoding='utf-8').read()

# Find the RuqyahItemCard function and its root element
match = re.search(r'function RuqyahItemCard.*?\{\s*return\s*\(', content3, re.DOTALL)
if match:
    end = match.end()
    # Look for the opening div after return (
    rest = content3[end:]
    div_match = re.search(r'<div\s+className="relative', rest)
    if div_match:
        print(f"RuqyahItemCard root: {rest[div_match.start():div_match.start()+80]}")
    else:
        print("RuqyahItemCard: root div not found")
else:
    print("RuqyahItemCard: function not found")
