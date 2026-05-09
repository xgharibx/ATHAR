"""Patch Settings.tsx: add aria-pressed and aria-label to prayer sound option buttons."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Settings.tsx'
content = open(path, 'r', encoding='utf-8').read()

# Add aria-pressed and aria-label to prayer sound selector button
old1 = '''                      <button type="button"
                        onClick={() => setReminders({ prayerSoundProfile: option.id })}
                        className="w-full text-right"
                        disabled={!reminders.enabled && isNative}
                      >
                        <div className="text-sm font-semibold">{option.label}</div>
                      </button>'''
new1 = '''                      <button type="button"
                        onClick={() => setReminders({ prayerSoundProfile: option.id })}
                        className="w-full text-right"
                        aria-pressed={active}
                        aria-label={`\u0635\u0648\u062a \u0627\u0644\u0623\u0630\u0627\u0646: \u0627\u062e\u062a\u064a\u0627\u0631 \u0635\u0648\u062a ${option.label}`}
                        disabled={!reminders.enabled && isNative}
                      >
                        <div className="text-sm font-semibold">{option.label}</div>
                      </button>'''

# Add aria-label to preview button
old2 = '''                          onClick={() => void togglePrayerPreview(option.id)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/6 px-3 py-2 text-xs transition hover:bg-white/10"
                        >
                          {playingPreview === `prayer:${option.id}` ? <Square size={12} /> : <Play size={12} />}
                          {playingPreview === `prayer:${option.id}` ? "\u0625\u064a\u0642\u0627\u0641" : "\u0645\u0639\u0627\u064a\u0646\u0629"}'''
new2 = '''                          onClick={() => void togglePrayerPreview(option.id)}
                          aria-label={playingPreview === `prayer:${option.id}` ? `\u0625\u064a\u0642\u0627\u0641 \u0645\u0639\u0627\u064a\u0646\u0629 \u0635\u0648\u062a ${option.label}` : `\u0645\u0639\u0627\u064a\u0646\u0629 \u0635\u0648\u062a ${option.label}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/6 px-3 py-2 text-xs transition hover:bg-white/10"
                        >
                          {playingPreview === `prayer:${option.id}` ? <Square size={12} /> : <Play size={12} />}
                          {playingPreview === `prayer:${option.id}` ? "\u0625\u064a\u0642\u0627\u0641" : "\u0645\u0639\u0627\u064a\u0646\u0629"}'''

patches = [(old1, new1), (old2, new2)]
for old, new in patches:
    if old in content:
        content = content.replace(old, new, 1)
        print(f'PATCHED: {repr(old[:60])}')
    elif new in content:
        print(f'ALREADY_HAS: {repr(new[:60])}')
    else:
        print(f'NOT_FOUND: {repr(old[:60])}')

open(path, 'w', encoding='utf-8').write(content)
print('Done.')
