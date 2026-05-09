"""Patch Phase 53h: NearbyMosques - add role=list to container, role=listitem to each Card."""

path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\NearbyMosques.tsx'
content = open(path, encoding='utf-8').read()

# Add role=list to mosques container
old1 = '''        <div className="space-y-2">
          <div className="text-xs font-semibold opacity-60 uppercase tracking-wide mb-3" aria-live="polite" aria-atomic="true">
            {mosques.length} مسجد في نطاق 5 كم
          </div>
          {mosques.map((mosque, i) => {'''

new1 = '''        <div className="space-y-2" role="list" aria-label="المساجد القريبة">
          <div className="text-xs font-semibold opacity-60 uppercase tracking-wide mb-3" aria-live="polite" aria-atomic="true">
            {mosques.length} مسجد في نطاق 5 كم
          </div>
          {mosques.map((mosque, i) => {'''

if old1 in content:
    content = content.replace(old1, new1, 1)
    print("NearbyMosques: PATCHED container role=list")
else:
    print("NearbyMosques: container not found")

# Add role=listitem to each Card
old2 = '              <Card key={mosque.id} className="p-4">'
new2 = '              <Card key={mosque.id} role="listitem" className="p-4">'

if old2 in content:
    content = content.replace(old2, new2, 1)
    print("NearbyMosques: PATCHED Card role=listitem")
else:
    print("NearbyMosques: Card not found")

# Also add aria-hidden to the mosque emoji icon
old3 = '''                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
                      style={{ backgroundColor: "var(--card)" }}
                    >
                      🕌'''

new3 = '''                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
                      style={{ backgroundColor: "var(--card)" }}
                      aria-hidden="true"
                    >
                      🕌'''

if old3 in content:
    content = content.replace(old3, new3, 1)
    print("NearbyMosques: PATCHED mosque icon aria-hidden")
else:
    print("NearbyMosques: mosque icon not found")

open(path, 'w', encoding='utf-8').write(content)
print("Done.")
