"""Phase 50b: Companions aria-label, Home Lottie aria-hidden, Leaderboard aria-expanded."""

base_pages = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages'

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
        print(f'  MISS:    {name} {label} -> {repr(old[:60])}')
        return False

# ---- 1. Companions: add aria-label to search input ----
print('Companions:')
patch(
    base_pages + r'\Companions.tsx',
    '              type="search"\n              dir="rtl"\n              placeholder="\u0627\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0635\u062d\u0627\u0628\u0629\u2026"',
    '              type="search"\n              dir="rtl"\n              aria-label="\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0635\u062d\u0627\u0628\u0629"\n              placeholder="\u0627\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0635\u062d\u0627\u0628\u0629\u2026"',
    'aria-label'
)

# ---- 2. Home: add aria-hidden to decorative Lottie container ----
print('Home Lottie:')
patch(
    base_pages + r'\Home.tsx',
    '        <div className="absolute -top-10 -left-8 opacity-80">\n          <div className="w-32 h-32">',
    '        <div className="absolute -top-10 -left-8 opacity-80" aria-hidden="true">\n          <div className="w-32 h-32">',
    'aria-hidden'
)

# ---- 3. Leaderboard AdminPanel: add aria-expanded ----
print('Leaderboard AdminPanel:')
patch(
    base_pages + r'\Leaderboard.tsx',
    '        <Button variant={expanded ? "secondary" : "outline"} onClick={() => setExpanded((v) => !v)}>\n          {expanded ? "\u0625\u062e\u0641\u0627\u0621" : "\u0641\u062a\u062d"}',
    '        <Button variant={expanded ? "secondary" : "outline"} aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>\n          {expanded ? "\u0625\u062e\u0641\u0627\u0621" : "\u0641\u062a\u062d"}',
    'aria-expanded'
)

# ---- 4. Leaderboard FriendsSection: add aria-expanded ----
print('Leaderboard FriendsSection:')
patch(
    base_pages + r'\Leaderboard.tsx',
    '        <Button variant="secondary" onClick={() => setExpanded((v) => !v)}>\n          {expanded ? "\u0625\u062e\u0641\u0627\u0621" : "\u0625\u062f\u0627\u0631\u0629"}',
    '        <Button variant="secondary" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>\n          {expanded ? "\u0625\u062e\u0641\u0627\u0621" : "\u0625\u062f\u0627\u0631\u0629"}',
    'aria-expanded'
)

print('\nDone.')
