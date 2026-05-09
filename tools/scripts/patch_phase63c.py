import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'

patches = {
    'src/pages/HadithBookView.tsx': [
        # Inline loader in header — decorative
        (
            '{isLoading && <Loader2 size={18} className="animate-spin text-[var(--muted)] shrink-0" />}',
            '{isLoading && <Loader2 size={18} aria-hidden="true" className="animate-spin text-[var(--muted)] shrink-0" />}',
            'header loader aria-hidden'
        ),
        # Loading container — add role=status
        (
            '<div dir="rtl" className="flex-1 flex items-center justify-center px-6">',
            '<div dir="rtl" role="status" aria-live="polite" aria-label="جاري تحميل الكتاب" className="flex-1 flex items-center justify-center px-6">',
            'loading container role=status'
        ),
        # Loader inside status container — decorative
        (
            '<Loader2 size={20} className="animate-spin text-[var(--accent)]" />',
            '<Loader2 size={20} aria-hidden="true" className="animate-spin text-[var(--accent)]" />',
            'body loader aria-hidden'
        ),
    ],
    'src/pages/HadithReader.tsx': [
        # Inline loader in header — decorative
        (
            '{isLoading && <Loader2 size={16} className="animate-spin text-[var(--muted)] shrink-0" />}',
            '{isLoading && <Loader2 size={16} aria-hidden="true" className="animate-spin text-[var(--muted)] shrink-0" />}',
            'header loader aria-hidden'
        ),
        # Loading card — add role=status
        (
            '          <Card className="p-6">\n'
            '            <div className="flex items-center justify-center gap-3 py-10 text-[var(--muted)]">\n'
            '              <Loader2 className="animate-spin" />',
            '          <Card className="p-6" role="status" aria-live="polite">\n'
            '            <div className="flex items-center justify-center gap-3 py-10 text-[var(--muted)]">\n'
            '              <Loader2 aria-hidden="true" className="animate-spin" />',
            'body card role=status + loader aria-hidden'
        ),
    ],
    'src/components/layout/QuranRadioFab.tsx': [
        # FAB button loader — inside aria-label button so decorative
        (
            '          <Loader2 size={22} className="animate-spin" />',
            '          <Loader2 size={22} aria-hidden="true" className="animate-spin" />',
            'fab loader aria-hidden'
        ),
        # Station loading indicator — decorative
        (
            '                    <Loader2 size={12} className="animate-spin shrink-0 opacity-70" />',
            '                    <Loader2 size={12} aria-hidden="true" className="animate-spin shrink-0 opacity-70" />',
            'station loader aria-hidden'
        ),
    ],
}

for rel, pats in patches.items():
    path = os.path.join(base, rel)
    name = rel.split('/')[-1]
    print(f'=== {name} ===')
    with open(path, encoding='utf-8') as f:
        c = f.read()
    for old, new, label in pats:
        if old in c:
            c = c.replace(old, new)
            print(f'  OK  [{label}]')
        else:
            print(f'  MISS[{label}]')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
