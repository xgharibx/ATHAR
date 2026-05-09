"""Patch PrayerGuide.tsx: add aria-label to copy and share buttons inside the expanded panel."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\PrayerGuide.tsx'
content = open(path, 'r', encoding='utf-8').read()

import re

# The copy button is inside the expanded panel - find it
# It's a button with onClick that calls navigator.clipboard.writeText
old_copy = '''                      className="p-2 rounded-xl transition-opacity hover:opacity-75"
                      style={{ background: "color-mix(in srgb, var(--on-accent) 10%, transparent)", color: "var(--on-accent)" }}
                    >
                      <Copy size={14} />
                    </button>'''
new_copy = '''                      aria-label="\u0646\u0633\u062e \u0627\u0644\u062e\u0637\u0648\u0629"
                      className="p-2 rounded-xl transition-opacity hover:opacity-75"
                      style={{ background: "color-mix(in srgb, var(--on-accent) 10%, transparent)", color: "var(--on-accent)" }}
                    >
                      <Copy size={14} />
                    </button>'''

# The share button follows immediately after the copy button
old_share = '''                      className="p-2 rounded-xl transition-opacity hover:opacity-75"
                      style={{ background: "color-mix(in srgb, var(--on-accent) 10%, transparent)", color: "var(--on-accent)" }}
                    >
                      <Share2 size={14} />
                    </button>'''
new_share = '''                      aria-label="\u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u062e\u0637\u0648\u0629"
                      className="p-2 rounded-xl transition-opacity hover:opacity-75"
                      style={{ background: "color-mix(in srgb, var(--on-accent) 10%, transparent)", color: "var(--on-accent)" }}
                    >
                      <Share2 size={14} />
                    </button>'''

patched = 0
for old, new in [(old_copy, new_copy), (old_share, new_share)]:
    if old in content:
        content = content.replace(old, new, 1)
        patched += 1
        print(f'PATCHED: {repr(old[:60])}')
    elif new in content:
        print(f'ALREADY_HAS: {repr(new[:60])}')
    else:
        print(f'NOT_FOUND: {repr(old[:60])}')

open(path, 'w', encoding='utf-8').write(content)
print(f'Done ({patched} patches applied).')
