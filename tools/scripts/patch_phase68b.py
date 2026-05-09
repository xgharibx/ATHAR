"""Phase 68b: aria-hidden on decorative spinners, Share2 fix, pull-to-refresh."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'

patches_by_file = {
    'src/pages/Mushaf.tsx': [
        # Loading page spinner: add role=status to parent + aria-hidden to spinner
        (
            '<div className="flex-1 flex items-center justify-center">\n          <div className="text-center">\n            <div className="w-10 h-10 border-2 border-[#2F4F37] border-t-transparent rounded-full animate-spin mx-auto mb-4"',
            '<div className="flex-1 flex items-center justify-center">\n          <div className="text-center" role="status">\n            <div className="w-10 h-10 border-2 border-[#2F4F37] border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true"',
            'Mushaf page spinner role=status'
        ),
        # Inline tafseer spinner 1
        (
            '<span className="w-3 h-3 border border-[var(--stroke)] border-t-[var(--accent)] rounded-full animate-spin inline-block"',
            '<span className="w-3 h-3 border border-[var(--stroke)] border-t-[var(--accent)] rounded-full animate-spin inline-block" aria-hidden="true"',
            'Mushaf inline tafseer spinner aria-hidden'
        ),
    ],
    'src/pages/HadithBooks.tsx': [
        (
            '<div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />',
            '<div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" aria-hidden="true" />',
            'HadithBooks spinner aria-hidden'
        ),
    ],
    'src/pages/HadithMemo.tsx': [
        (
            '<div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />',
            '<div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" aria-hidden="true" />',
            'HadithMemo spinner aria-hidden'
        ),
    ],
    'src/pages/Home.tsx': [
        (
            '<Loader2 size={14} className="animate-spin shrink-0" />',
            '<Loader2 size={14} className="animate-spin shrink-0" aria-hidden="true" />',
            'Home radio Loader2 aria-hidden'
        ),
    ],
    'src/hooks/usePullToRefresh.tsx': [
        (
            '<span className="ptr-spinner" />',
            '<span className="ptr-spinner" aria-hidden="true" />',
            'PullToRefresh ptr-spinner aria-hidden'
        ),
    ],
    'src/components/ui/DailyWisdomCard.tsx': [
        (
            '<Share2 size={14} />',
            '<Share2 size={14} aria-hidden="true" />',
            'DailyWisdomCard Share2 aria-hidden'
        ),
    ],
}

for rel_path, patches in patches_by_file.items():
    path = os.path.join(base, rel_path)
    with open(path, encoding='utf-8') as f:
        c = f.read()
    changed = False
    for old, new, label in patches:
        if old in c:
            c = c.replace(old, new)
            print(f'  OK  [{label}]')
            changed = True
        else:
            print(f'  MISS[{label}]')
    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)

print('\nDone.')
