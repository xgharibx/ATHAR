"""Patch Settings.tsx: add aria-label to reminder preview button (correct classes)."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Settings.tsx'
content = open(path, 'r', encoding='utf-8').read()

old = '''                      onClick={() => void toggleReminderPreview(option.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--stroke)] bg-[var(--card)] px-3 py-2 text-xs transition hover:bg-[var(--card-2)]"'''
new = '''                      onClick={() => void toggleReminderPreview(option.id)}
                      aria-label={playingPreview === `reminder:${option.id}` ? `\u0625\u064a\u0642\u0627\u0641 \u0645\u0639\u0627\u064a\u0646\u0629 \u0635\u0648\u062a ${option.label}` : `\u0645\u0639\u0627\u064a\u0646\u0629 \u0635\u0648\u062a ${option.label}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--stroke)] bg-[var(--card)] px-3 py-2 text-xs transition hover:bg-[var(--card-2)]"'''

if old in content:
    content = content.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(content)
    print('PATCHED reminder preview aria-label')
else:
    print('NOT_FOUND')
