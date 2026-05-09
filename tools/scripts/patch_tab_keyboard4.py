"""Phase 50: Add keyboard navigation to all remaining tab widgets."""

KB = '''\n          onKeyDown={(e) => {
            const tabs = Array.from(e.currentTarget.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
            const idx = tabs.findIndex(t => t === document.activeElement);
            if (idx === -1) return;
            if (e.key === 'ArrowRight') { e.preventDefault(); const n=(idx-1+tabs.length)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'ArrowLeft') { e.preventDefault(); const n=(idx+1)%tabs.length; tabs[n].focus(); tabs[n].click(); }
            else if (e.key === 'Home') { e.preventDefault(); tabs[0].focus(); tabs[0].click(); }
            else if (e.key === 'End') { e.preventDefault(); tabs[tabs.length-1].focus(); tabs[tabs.length-1].click(); }
          }}'''

base = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages'

def patch(path, old, new):
    content = open(path, 'r', encoding='utf-8').read()
    if old in content:
        content = content.replace(old, new, 1)
        open(path, 'w', encoding='utf-8').write(content)
        name = path.split('\\')[-1]
        print(f'  PATCHED: {name}')
        return True
    elif new in content:
        name = path.split('\\')[-1]
        print(f'  ALREADY: {name}')
        return True
    else:
        name = path.split('\\')[-1]
        print(f'  MISS:    {name} -> {repr(old[:60])}')
        return False

# ---- AsmaAlHusna.tsx ----
print('AsmaAlHusna:')
patch(
    base + r'\AsmaAlHusna.tsx',
    '<div className="flex gap-2" role="tablist" aria-label="\u062a\u0635\u0641\u064a\u0629 \u0627\u0644\u0623\u0633\u0645\u0627\u0621">',
    '<div className="flex gap-2" role="tablist" aria-label="\u062a\u0635\u0641\u064a\u0629 \u0627\u0644\u0623\u0633\u0645\u0627\u0621"' + KB + '>'
)

# ---- Companions.tsx ----
print('Companions:')
patch(
    base + r'\Companions.tsx',
    '<div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="\u062a\u0635\u0641\u064a\u0629 \u0627\u0644\u0635\u062d\u0627\u0628\u0629" style={{ scrollbarWidth: "none" }}>',
    '<div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="\u062a\u0635\u0641\u064a\u0629 \u0627\u0644\u0635\u062d\u0627\u0628\u0629" style={{ scrollbarWidth: "none" }}' + KB + '>'
)

# ---- Duas.tsx ----
print('Duas:')
patch(
    base + r'\Duas.tsx',
    '<div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="\u062a\u0635\u0641\u064a\u0629 \u0627\u0644\u0623\u062f\u0639\u064a\u0629">',
    '<div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="\u062a\u0635\u0641\u064a\u0629 \u0627\u0644\u0623\u062f\u0639\u064a\u0629"' + KB + '>'
)

# ---- HadithMemo.tsx ----
print('HadithMemo:')
patch(
    base + r'\HadithMemo.tsx',
    '      <div\n        role="tablist"\n        aria-label="\u0648\u0636\u0639 \u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062a"\n        className="relative z-10 mx-4 mb-5 flex overflow-hidden rounded-2xl glass"\n      >',
    '      <div\n        role="tablist"\n        aria-label="\u0648\u0636\u0639 \u0627\u0644\u0628\u0637\u0627\u0642\u0627\u062a"\n        className="relative z-10 mx-4 mb-5 flex overflow-hidden rounded-2xl glass"' + KB + '\n      >'
)

# ---- HadithBookView.tsx ----
print('HadithBookView:')
patch(
    base + r'\HadithBookView.tsx',
    '          ref={sectionsRef}\n          dir="rtl"\n          role="tablist"\n          aria-label="\u062a\u0635\u0641\u064a\u0629 \u0627\u0644\u0623\u0628\u0648\u0627\u0628"\n          className="flex gap-2 px-3 pb-3 overflow-x-auto no-scrollbar"\n        >',
    '          ref={sectionsRef}\n          dir="rtl"\n          role="tablist"\n          aria-label="\u062a\u0635\u0641\u064a\u0629 \u0627\u0644\u0623\u0628\u0648\u0627\u0628"\n          className="flex gap-2 px-3 pb-3 overflow-x-auto no-scrollbar"' + KB + '\n        >'
)

# ---- Quran.tsx (second tablist: sort order) ----
print('Quran (sort):')
patch(
    base + r'\Quran.tsx',
    '<div className="flex rounded-xl bg-[var(--card)] border border-[var(--stroke)] overflow-hidden text-sm" role="tablist" aria-label="\u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0633\u0648\u0631">',
    '<div className="flex rounded-xl bg-[var(--card)] border border-[var(--stroke)] overflow-hidden text-sm" role="tablist" aria-label="\u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0633\u0648\u0631"' + KB + '>'
)

# ---- Leaderboard.tsx (3 tablists) ----
print('Leaderboard (period):')
patch(
    base + r'\Leaderboard.tsx',
    '<div role="tablist" aria-label="\u0627\u0644\u0641\u062a\u0631\u0629 \u0627\u0644\u0632\u0645\u0646\u064a\u0629" className="mt-3 flex flex-wrap gap-2">',
    '<div role="tablist" aria-label="\u0627\u0644\u0641\u062a\u0631\u0629 \u0627\u0644\u0632\u0645\u0646\u064a\u0629" className="mt-3 flex flex-wrap gap-2"' + KB + '>'
)

print('Leaderboard (board type):')
patch(
    base + r'\Leaderboard.tsx',
    '<div role="tablist" aria-label="\u0646\u0648\u0639 \u0627\u0644\u0644\u0648\u062d\u0629" className="mt-3 flex flex-wrap gap-2">',
    '<div role="tablist" aria-label="\u0646\u0648\u0639 \u0627\u0644\u0644\u0648\u062d\u0629" className="mt-3 flex flex-wrap gap-2"' + KB + '>'
)

print('Leaderboard (match mode):')
patch(
    base + r'\Leaderboard.tsx',
    '<div role="tablist" aria-label="\u0646\u0645\u0637 \u0627\u0644\u062a\u0637\u0627\u0628\u0642" className="flex gap-2 flex-wrap">',
    '<div role="tablist" aria-label="\u0646\u0645\u0637 \u0627\u0644\u062a\u0637\u0627\u0628\u0642" className="flex gap-2 flex-wrap"' + KB + '>'
)

print('\nDone.')
