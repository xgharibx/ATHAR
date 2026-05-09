"""Patch Qibla.tsx: add role=status to geo loading state."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Qibla.tsx'
content = open(path, 'r', encoding='utf-8').read()

old = '          <div className="flex items-center gap-2 text-sm opacity-60">\n            <RefreshCw size={14} className="animate-spin" />'
new = '          <div className="flex items-center gap-2 text-sm opacity-60" role="status" aria-label="\u062c\u0627\u0631\u0633 \u062a\u062d\u062f\u064a\u062f \u0645\u0648\u0642\u0639\u0643">\n            <RefreshCw size={14} className="animate-spin" />'

if old in content:
    content = content.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(content)
    print('PATCHED: geo loading role=status')
else:
    print('NOT_FOUND')
