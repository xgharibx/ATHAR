"""Patch Qibla.tsx: add aria-label to share button and aria-live to bearing display."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Qibla.tsx'
content = open(path, 'r', encoding='utf-8').read()

patches = [
    # Add aria-label to share button
    (
        '              className="mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full opacity-60 hover:opacity-90 transition"\n              style={{ background: "var(--card)", border: "1px solid var(--stroke)", color: "var(--fg)" }}\n            >',
        '              aria-label="\u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u062a\u062c\u0627\u0647 \u0627\u0644\u0642\u0628\u0644\u0629"\n              className="mt-2 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full opacity-60 hover:opacity-90 transition"\n              style={{ background: "var(--card)", border: "1px solid var(--stroke)", color: "var(--fg)" }}\n            >'
    ),
    # Add aria-live to bearing info container
    (
        '          <div className="text-center space-y-1">',
        '          <div className="text-center space-y-1" aria-live="polite" aria-atomic="true">'
    ),
    # Add role=status to geo loading state
    (
        '          <div className="flex items-center gap-2 text-sm opacity-60">\n            <RefreshCw size={14} className="animate-spin" />\n            \u062c\u0627\u0631\u0653 \u062a\u062d\u062f\u064a\u062f \u0645\u0648\u0642\u0639\u0643...',
        '          <div className="flex items-center gap-2 text-sm opacity-60" role="status" aria-label="\u062c\u0627\u0631\u0633 \u062a\u062d\u062f\u064a\u062f \u0645\u0648\u0642\u0639\u0643">\n            <RefreshCw size={14} className="animate-spin" />\n            \u062c\u0627\u0631\u0653 \u062a\u062d\u062f\u064a\u062f \u0645\u0648\u0642\u0639\u0643...'
    ),
]

for old, new in patches:
    if old in content:
        content = content.replace(old, new, 1)
        print(f'PATCHED: {repr(old[:70])}')
    elif new in content:
        print(f'ALREADY_HAS: {repr(old[:70])}')
    else:
        print(f'NOT_FOUND: {repr(old[:70])}')

open(path, 'w', encoding='utf-8').write(content)
print('Done.')
