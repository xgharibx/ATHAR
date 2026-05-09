"""Apply Phase 17d CSS fixes to globals.css."""

with open('src/styles/globals.css', encoding='utf-8') as f:
    content = f.read()

# Fix 1: .quran-page-inner border - use var(--stroke) instead of white
old1 = '  border: 1px solid color-mix(in srgb, var(--accent) 18%, rgba(255, 255, 255, 0.06));'
new1 = '  border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--stroke));'

if old1 in content:
    content = content.replace(old1, new1, 1)
    print('Fix 1 applied: .quran-page-inner border')
else:
    print('Fix 1 NOT found:', repr(old1[:60]))

# Fix 2: .fab box-shadow ring - use var(--stroke) instead of white
old2 = '    0 0 0 1px rgba(255, 255, 255, 0.08);'
new2 = '    0 0 0 1px var(--stroke);'

if old2 in content:
    content = content.replace(old2, new2, 1)
    print('Fix 2 applied: .fab ring shadow')
else:
    print('Fix 2 NOT found:', repr(old2[:60]))

with open('src/styles/globals.css', 'w', encoding='utf-8') as f:
    f.write(content)

print('Done.')
