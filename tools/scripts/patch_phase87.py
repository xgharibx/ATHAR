"""Phase 87: Fix remaining aria-pressed and aria-label gaps"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
changes = 0

def patch_file(path, old, new, label):
    global changes
    with open(path, encoding='utf-8') as f:
        content = f.read()
    if old in content:
        content = content.replace(old, new, 1)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'OK: {label}')
        changes += 1
    else:
        print(f'FAIL: {label}')

# --- Favorites.tsx: Dhikr trash button (confirm-delete trigger) ---
fav_path = os.path.join(WORKSPACE, 'src', 'pages', 'Favorites.tsx')
patch_file(
    fav_path,
    '                            <Button variant="outline" onClick={() => setConfirmDeleteKey(r.key)}>\n                              <Trash2 size={16} />\n                            </Button>',
    '                            <Button variant="outline" onClick={() => setConfirmDeleteKey(r.key)} aria-label="\u0625\u0632\u0627\u0644\u0629 \u0645\u0646 \u0627\u0644\u0645\u0641\u0636\u0644\u0629">\n                              <Trash2 size={16} />\n                            </Button>',
    'Favorites.tsx Dhikr trash aria-label'
)

# --- PrayerTimes.tsx: iqama minus/plus buttons ---
pt_path = os.path.join(WORKSPACE, 'src', 'pages', 'PrayerTimes.tsx')
with open(pt_path, encoding='utf-8') as f:
    lines = f.readlines()

# Find and patch the minus button in iqama section
for i, line in enumerate(lines):
    if 'Math.max(0, (iqamaOffsets[p] ?? 15) - 5)' in line:
        # Next line should be the className + content
        # The button spans L338-340: button open, onClick=..., className=...>−
        # Find the line with className for this button
        for j in range(max(0,i-3), min(len(lines), i+4)):
            if 'grid place-items-center text-sm">-' in lines[j] or 'grid place-items-center text-sm">\xe2\x88\x92' in lines[j] or '\u2212' in lines[j]:
                pass
        # Find the actual button start
        for j in range(max(0,i-2), i+1):
            if '<button type="button"' in lines[j]:
                # Add aria-label to the className line
                for k in range(j, min(len(lines), j+5)):
                    stripped = lines[k].rstrip()
                    if stripped.endswith('>\u2212</button>') or stripped.endswith('>-</button>') or stripped.endswith('>\xe2\x88\x92</button>'):
                        indent = lines[k][:len(lines[k]) - len(lines[k].lstrip())]
                        lines[k] = lines[k].replace(
                            'place-items-center text-sm">',
                            'place-items-center text-sm"\n' + indent + '    aria-label={\`\u062a\u0642\u0644\u064a\u0644 \u0648\u0642\u062a \u0625\u0642\u0627\u0645\u0629 \${PRAYER_LABELS[p]}\`}>'
                        )
                        break
                break
        break

# Simpler approach: find the exact lines
with open(pt_path, encoding='utf-8') as f:
    content = f.read()

# Patch minus button
minus_old = '                    onClick={() => setReminders({ iqamaOffsets: { ...iqamaOffsets, [p]: Math.max(0, (iqamaOffsets[p] ?? 15) - 5) } })}\n                    className="w-8 h-8 rounded-full bg-[var(--card)] hover:bg-[var(--card-2)] transition-colors grid place-items-center text-sm">\u2212</button>'
minus_new = '                    onClick={() => setReminders({ iqamaOffsets: { ...iqamaOffsets, [p]: Math.max(0, (iqamaOffsets[p] ?? 15) - 5) } })}\n                    aria-label={`\u062a\u0642\u0644\u064a\u0644 \u0648\u0642\u062a \u0625\u0642\u0627\u0645\u0629 ${PRAYER_LABELS[p]}`}\n                    className="w-8 h-8 rounded-full bg-[var(--card)] hover:bg-[var(--card-2)] transition-colors grid place-items-center text-sm">\u2212</button>'

if minus_old in content:
    content = content.replace(minus_old, minus_new, 1)
    print('OK: PrayerTimes.tsx iqama minus aria-label')
    changes += 1
else:
    print('FAIL: PrayerTimes.tsx iqama minus - checking actual content...')
    # Find and show the actual content around Math.max
    idx = content.find('Math.max(0, (iqamaOffsets[p] ?? 15) - 5)')
    if idx >= 0:
        print(repr(content[idx-120:idx+120]))

# Patch plus button
plus_old = '                    onClick={() => setReminders({ iqamaOffsets: { ...iqamaOffsets, [p]: Math.min(60, (iqamaOffsets[p] ?? 15) + 5) } })}\n                    className="w-8 h-8 rounded-full bg-[var(--card)] hover:bg-[var(--card-2)] transition-colors grid place-items-center text-sm">+</button>'
plus_new = '                    onClick={() => setReminders({ iqamaOffsets: { ...iqamaOffsets, [p]: Math.min(60, (iqamaOffsets[p] ?? 15) + 5) } })}\n                    aria-label={`\u0632\u064a\u0627\u062f\u0629 \u0648\u0642\u062a \u0625\u0642\u0627\u0645\u0629 ${PRAYER_LABELS[p]}`}\n                    className="w-8 h-8 rounded-full bg-[var(--card)] hover:bg-[var(--card-2)] transition-colors grid place-items-center text-sm">+</button>'

if plus_old in content:
    content = content.replace(plus_old, plus_new, 1)
    print('OK: PrayerTimes.tsx iqama plus aria-label')
    changes += 1
else:
    print('FAIL: PrayerTimes.tsx iqama plus - checking actual content...')
    idx = content.find('Math.min(60, (iqamaOffsets[p] ?? 15) + 5)')
    if idx >= 0:
        print(repr(content[idx-120:idx+120]))

with open(pt_path, 'w', encoding='utf-8') as f:
    f.write(content)

# --- VideoLibrary.tsx: topic channel filter buttons ---
vl_path = os.path.join(WORKSPACE, 'src', 'pages', 'VideoLibrary.tsx')
with open(vl_path, encoding='utf-8') as f:
    content = f.read()

# "All" filter button
vl_old1 = '          <button type="button"\n            onClick={() => setChannelFilter(null)}\n            className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border transition min-h-[36px]",'
vl_new1 = '          <button type="button"\n            onClick={() => setChannelFilter(null)}\n            aria-pressed={channelFilter === null}\n            className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium border transition min-h-[36px]",'
if vl_old1 in content:
    content = content.replace(vl_old1, vl_new1, 1)
    print('OK: VideoLibrary.tsx channel filter "All" aria-pressed')
    changes += 1
else:
    print('FAIL: VideoLibrary.tsx channel filter "All" - checking...')
    idx = content.find('setChannelFilter(null)')
    if idx >= 0:
        print(repr(content[idx-200:idx+100]))

# Channel chip buttons
vl_old2 = '            <button type="button" key={id}\n              onClick={() => setChannelFilter(channelFilter === id ? null : id)}\n              className={cn("shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition min-h-[36px]",'
vl_new2 = '            <button type="button" key={id}\n              onClick={() => setChannelFilter(channelFilter === id ? null : id)}\n              aria-pressed={channelFilter === id}\n              className={cn("shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium border transition min-h-[36px]",'
if vl_old2 in content:
    content = content.replace(vl_old2, vl_new2, 1)
    print('OK: VideoLibrary.tsx channel chip aria-pressed')
    changes += 1
else:
    print('FAIL: VideoLibrary.tsx channel chip - checking...')
    idx = content.find('setChannelFilter(channelFilter === id ? null : id)')
    if idx >= 0:
        print(repr(content[idx-200:idx+100]))

with open(vl_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nTotal changes: {changes}')
