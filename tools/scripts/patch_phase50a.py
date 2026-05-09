"""Phase 50: VideoLibrary aria-pressed sort, Search role=search, AppShell main label, DailyCarousel keyboard nav."""
import re

base_pages = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages'
base_comp  = r'c:\Users\Amrab\Downloads\noor-adhkar\src\components'

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
        print(f'  MISS:    {name} {label}')
        return False

# ========================================================
# 1. VideoLibrary: add aria-pressed to sort buttons (3 groups)
# All 3 groups have identical pattern:
# <button key={sk} type="button" onClick={() => setSortKey(sk)}
#   or onClick={() => { setSortKey(sk); setLessonPage(1); }}
# ========================================================
vl = base_pages + r'\VideoLibrary.tsx'
content = open(vl, 'r', encoding='utf-8').read()

# Pattern 1: setSortKey(sk) without extra actions
old1 = '              <button key={sk} type="button" onClick={() => setSortKey(sk)}\n                className={cn("shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-medium border transition min-h-[30px]",\n                  sortKey === sk ? "border-transparent" : "bg-[var(--card)] border-[var(--stroke)]")}\n                style={sortKey === sk ? { background: channel.accent, color: contrastText(channel.accent) } : undefined}>'
new1 = '              <button key={sk} type="button" onClick={() => setSortKey(sk)} aria-pressed={sortKey === sk}\n                className={cn("shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-medium border transition min-h-[30px]",\n                  sortKey === sk ? "border-transparent" : "bg-[var(--card)] border-[var(--stroke)]")}\n                style={sortKey === sk ? { background: channel.accent, color: contrastText(channel.accent) } : undefined}>'

# Pattern 2: with setLessonPage(1)
old2 = '              <button key={sk} type="button" onClick={() => { setSortKey(sk); setLessonPage(1); }}\n                className={cn("shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-medium border transition min-h-[30px]",\n                  sortKey === sk ? "border-transparent" : "bg-[var(--card)] border-[var(--stroke)]")}\n                style={sortKey === sk ? { background: accent, color: contrastText(accent) } : undefined}>'
new2 = '              <button key={sk} type="button" onClick={() => { setSortKey(sk); setLessonPage(1); }} aria-pressed={sortKey === sk}\n                className={cn("shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-medium border transition min-h-[30px]",\n                  sortKey === sk ? "border-transparent" : "bg-[var(--card)] border-[var(--stroke)]")}\n                style={sortKey === sk ? { background: accent, color: contrastText(accent) } : undefined}>'

# Pattern 3: topic.accent
old3 = '              <button key={sk} type="button" onClick={() => setSortKey(sk)}\n                className={cn("shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-medium border transition min-h-[30px]",\n                  sortKey === sk ? "border-transparent" : "bg-[var(--card)] border-[var(--stroke)]")}\n                style={sortKey === sk ? { background: topic.accent, color: contrastText(topic.accent) } : undefined}>'
new3 = '              <button key={sk} type="button" onClick={() => setSortKey(sk)} aria-pressed={sortKey === sk}\n                className={cn("shrink-0 px-2.5 py-1 rounded-xl text-[10px] font-medium border transition min-h-[30px]",\n                  sortKey === sk ? "border-transparent" : "bg-[var(--card)] border-[var(--stroke)]")}\n                style={sortKey === sk ? { background: topic.accent, color: contrastText(topic.accent) } : undefined}>'

print('VideoLibrary sort aria-pressed:')
for old, new, label in [(old1, new1, 'channel'), (old2, new2, 'lesson'), (old3, new3, 'topic')]:
    if old in content:
        content = content.replace(old, new, 1)
        print(f'  PATCHED: VideoLibrary.tsx {label}')
    elif new in content:
        print(f'  ALREADY: VideoLibrary.tsx {label}')
    else:
        print(f'  MISS:    VideoLibrary.tsx {label}')

open(vl, 'w', encoding='utf-8').write(content)

# ========================================================
# 2. Search.tsx: add role="search" + aria-label to input wrapper
# ========================================================
print('Search role=search:')
patch(
    base_pages + r'\Search.tsx',
    '        <div className="mt-4 relative flex items-center gap-2">',
    '        <div className="mt-4 relative flex items-center gap-2" role="search" aria-label="\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u062a\u0637\u0628\u064a\u0642">',
    'role=search wrapper'
)

# Also add aria-label to the Input element
patch(
    base_pages + r'\Search.tsx',
    '<Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="\u0627\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0623\u0630\u0643\u0627\u0631 \u0648\u0627\u0644\u0642\u0631\u0622\u0646 \u0648\u0627\u0644\u0645\u0643\u062a\u0628\u0629\u2026"',
    '<Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} aria-label="\u062d\u0642\u0644 \u0627\u0644\u0628\u062d\u062b" placeholder="\u0627\u0628\u062d\u062b \u0641\u064a \u0627\u0644\u0623\u0630\u0643\u0627\u0631 \u0648\u0627\u0644\u0642\u0631\u0622\u0646 \u0648\u0627\u0644\u0645\u0643\u062a\u0628\u0629\u2026"',
    'aria-label on Input'
)

# ========================================================
# 3. AppShell.tsx: add aria-label to <main>
# ========================================================
print('AppShell main label:')
patch(
    base_comp + r'\layout\AppShell.tsx',
    '<main id="main-content" className="col-span-12 xl:col-span-9 2xl:col-span-10">',
    '<main id="main-content" aria-label="\u0627\u0644\u0645\u062d\u062a\u0648\u0649 \u0627\u0644\u0631\u0626\u064a\u0633\u064a" className="col-span-12 xl:col-span-9 2xl:col-span-10">',
    'aria-label'
)

# ========================================================
# 4. DailyCarousel: add keyboard nav + tabIndex to Card region
# ========================================================
print('DailyCarousel keyboard nav:')
patch(
    base_comp + r'\ui\DailyCarousel.tsx',
    '    <Card className="p-0 overflow-hidden" role="region" aria-label="\u0645\u062d\u062a\u0648\u0649 \u064a\u0648\u0645\u064a" aria-roledescription="\u0639\u0631\u0636 \u062f\u0648\u0627\u0631">',
    '    <Card className="p-0 overflow-hidden" role="region" aria-label="\u0645\u062d\u062a\u0648\u0649 \u064a\u0648\u0645\u064a" aria-roledescription="\u0639\u0631\u0636 \u062f\u0648\u0627\u0631" tabIndex={0}\n      onKeyDown={(e: React.KeyboardEvent) => {\n        if (e.key === \'ArrowLeft\') { e.preventDefault(); pauseUntilRef.current = Date.now() + 8000; setActiveIdx((p) => (p + 1) % 3); }\n        else if (e.key === \'ArrowRight\') { e.preventDefault(); pauseUntilRef.current = Date.now() + 8000; setActiveIdx((p) => (p - 1 + 3) % 3); }\n      }}>',
    'tabIndex + onKeyDown'
)

print('\nDone.')
