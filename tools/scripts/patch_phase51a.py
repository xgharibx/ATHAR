"""Phase 51: NearbyMosques aria-label, Leaderboard role=alert, AsmaAlHusna/Duas aria-live counts."""

base = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages'

def patch(path, old, new, label=''):
    content = open(path, 'r', encoding='utf-8').read()
    name = path.split('\\')[-1]
    if old in content:
        content = content.replace(old, new, 1)
        open(path, 'w', encoding='utf-8').write(content)
        print(f'  PATCHED: {name} {label}')
        return True
    elif new in content:
        print(f'  ALREADY: {name} {label}')
        return True
    else:
        print(f'  MISS:    {name} {label} -> {repr(old[:70])}')
        return False

# ---- 1. NearbyMosques: share button aria-label ----
print('NearbyMosques share button:')
patch(
    base + r'\NearbyMosques.tsx',
    '                      title="\u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0645\u0648\u0642\u0639"\n                    >',
    '                      title="\u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0645\u0648\u0642\u0639"\n                      aria-label={`\u0645\u0634\u0627\u0631\u0643\u0629 \u0645\u0648\u0642\u0639 ${mosque.name}`}\n                    >',
    'aria-label'
)

# ---- 2. NearbyMosques: maps link aria-label ----
print('NearbyMosques maps link:')
patch(
    base + r'\NearbyMosques.tsx',
    '                      href={mapsUrl}\n                      target="_blank"\n                      rel="noopener noreferrer"\n                      className="shrink-0 text-[11px] px-3 py-1.5 rounded-full border border-[var(--stroke)] hover:bg-[var(--card-2)] transition whitespace-nowrap"\n                      style={{ color: "var(--accent)" }}\n                    >',
    '                      href={mapsUrl}\n                      target="_blank"\n                      rel="noopener noreferrer"\n                      aria-label={`\u0641\u062a\u062d ${mosque.name} \u0641\u064a \u062e\u0631\u0627\u0626\u0637 \u062c\u0648\u062c\u0644 (\u062a\u0628\u0648\u064a\u0628 \u062c\u062f\u064a\u062f)`}\n                      className="shrink-0 text-[11px] px-3 py-1.5 rounded-full border border-[var(--stroke)] hover:bg-[var(--card-2)] transition whitespace-nowrap"\n                      style={{ color: "var(--accent)" }}\n                    >',
    'aria-label'
)

# ---- 3. Leaderboard: add role=alert to boardLoadState error ----
print('Leaderboard boardLoadState error:')
patch(
    base + r'\Leaderboard.tsx',
    '          <div className="mt-3 rounded-2xl border border-danger-25 bg-danger-10 px-4 py-3 text-xs leading-6 text-[var(--danger)]">\n            \u062a\u0639\u0630\u0631 \u062a\u062d\u062f\u064a\u062b \u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0644\u0648\u062d\u0629 \u0645\u0646 \u0627\u0644\u062e\u0627\u062f\u0645 \u062d\u0627\u0644\u064a\u064b\u0627. \u0645\u0627 \u064a\u0638\u0647\u0631 \u0627\u0644\u0622\u0646 \u0647\u0648 \u0622\u062e\u0631 \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062d\u0644\u064a\u0629 \u0645\u062a\u0627\u062d\u0629 \u0641\u0642\u0637.\n          </div>',
    '          <div role="alert" className="mt-3 rounded-2xl border border-danger-25 bg-danger-10 px-4 py-3 text-xs leading-6 text-[var(--danger)]">\n            \u062a\u0639\u0630\u0631 \u062a\u062d\u062f\u064a\u062b \u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0644\u0648\u062d\u0629 \u0645\u0646 \u0627\u0644\u062e\u0627\u062f\u0645 \u062d\u0627\u0644\u064a\u064b\u0627. \u0645\u0627 \u064a\u0638\u0647\u0631 \u0627\u0644\u0622\u0646 \u0647\u0648 \u0622\u062e\u0631 \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u062d\u0644\u064a\u0629 \u0645\u062a\u0627\u062d\u0629 \u0641\u0642\u0637.\n          </div>',
    'role=alert'
)

# ---- 4. Leaderboard: importError role=alert ----
print('Leaderboard importError:')
patch(
    base + r'\Leaderboard.tsx',
    '{importError && <div className="mt-1 text-xs text-[var(--danger)]">{importError}</div>}',
    '{importError && <div role="alert" className="mt-1 text-xs text-[var(--danger)]">{importError}</div>}',
    'role=alert'
)

# ---- 5. AsmaAlHusna: add sr-only aria-live for search result count ----
print('AsmaAlHusna aria-live results:')
patch(
    base + r'\AsmaAlHusna.tsx',
    '      {/* Grid */}\n      <div className="px-4 pt-4 grid grid-cols-2 gap-3">',
    '      {/* Visually hidden live region for search result count */}\n      <div className="sr-only" aria-live="polite" aria-atomic="true">\n        {query ? `\u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0628\u062d\u062b: ${filtered.length} \u0645\u0646 \u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0644\u0647 \u0627\u0644\u062d\u0633\u0646\u0649` : null}\n      </div>\n      {/* Grid */}\n      <div className="px-4 pt-4 grid grid-cols-2 gap-3">',
    'aria-live'
)

# ---- 6. Duas: add sr-only aria-live for filter result count ----
print('Duas aria-live results:')
# Find the right place in Duas.tsx to add the live region
content = open(base + r'\Duas.tsx', 'r', encoding='utf-8').read()
# Look for the actual filtered variable
filtered_match = 'filteredDuas' if 'filteredDuas' in content else 'filtered'
print(f'  Duas filter var: {filtered_match}')

# Check for a good insertion point
if 'filtered.length === 0' in content or 'filteredDuas.length === 0' in content:
    # Find what shows the results count
    idx = content.find('filtered.length === 0')
    if idx == -1:
        idx = content.find('filteredDuas.length === 0')
    print(f'  Found at index {idx}: {repr(content[idx:idx+60])}')

# Find the card/container that holds the grid
idx = content.find('{/* Category filter')
if idx == -1:
    idx = content.find('Tabs')
print(f'  Category filter comment at: {idx}')

# Look for the listbox/grid container for duas
print('  Looking for grid/list container...')
idx = content.find('<div className="space-y')
print(f'  space-y div at: {idx}: {repr(content[idx:idx+60]) if idx != -1 else "NOT FOUND"}')

print('\nDone.')
