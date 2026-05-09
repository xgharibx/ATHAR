"""Patch YouTubeCoursePlayer.tsx: add aria-label to close button and bookmark button."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\components\video\YouTubeCoursePlayer.tsx'
content = open(path, 'r', encoding='utf-8').read()

patches = [
    # Close button - add aria-label
    (
        '            <button\n              type="button"\n              onClick={onClose}\n              className="w-7 h-7 rounded-xl bg-[var(--card)] border border-[var(--stroke)] flex items-center justify-center shrink-0 press-effect hover:bg-[var(--card-2)] transition-colors"',
        '            <button\n              type="button"\n              onClick={onClose}\n              aria-label="\u0625\u063a\u0644\u0627\u0642 \u0645\u0634\u063a\u0644 \u0627\u0644\u0641\u064a\u062f\u064a\u0648"\n              className="w-7 h-7 rounded-xl bg-[var(--card)] border border-[var(--stroke)] flex items-center justify-center shrink-0 press-effect hover:bg-[var(--card-2)] transition-colors"'
    ),
    # Bookmark button - add aria-label
    (
        '            <button\n              type="button"\n              onClick={onBookmark}\n              className="flex-1 rounded-2xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold press-effect transition-all border"',
        '            <button\n              type="button"\n              onClick={onBookmark}\n              aria-label={bookmarked ? "\u0625\u0644\u063a\u0627\u0621 \u062d\u0641\u0638 \u0627\u0644\u0641\u064a\u062f\u064a\u0648" : "\u062d\u0641\u0638 \u0627\u0644\u0641\u064a\u062f\u064a\u0648"}\n              aria-pressed={bookmarked}\n              className="flex-1 rounded-2xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold press-effect transition-all border"'
    ),
    # Complete button - add aria-pressed
    (
        '            <button\n              type="button"\n              onClick={() => { onComplete(); }}\n              className="flex-1 rounded-2xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold press-effect transition-all border"',
        '            <button\n              type="button"\n              onClick={() => { onComplete(); }}\n              aria-pressed={isCompleted}\n              aria-label={isCompleted ? "\u0625\u0644\u063a\u0627\u0621 \u0625\u0643\u0645\u0627\u0644 \u0627\u0644\u0641\u064a\u062f\u064a\u0648" : "\u062a\u0645\u064a\u064a\u0632 \u0627\u0644\u0641\u064a\u062f\u064a\u0648 \u0643\u0645\u0643\u062a\u0645\u0644"}\n              className="flex-1 rounded-2xl py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold press-effect transition-all border"'
    ),
]

for old, new in patches:
    if old in content:
        content = content.replace(old, new, 1)
        print(f'PATCHED: {repr(old[:60])}')
    elif new in content:
        print(f'ALREADY_HAS: {repr(old[:60])}')
    else:
        print(f'NOT_FOUND: {repr(old[:60])}')

open(path, 'w', encoding='utf-8').write(content)
print('Done.')
