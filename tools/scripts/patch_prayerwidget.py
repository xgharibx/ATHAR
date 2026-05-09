"""Patch PrayerWidget.tsx: add aria-current to current prayer cell."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\components\layout\PrayerWidget.tsx'
content = open(path, 'r', encoding='utf-8').read()

old = '''            <div
              key={prayer.name}
              className={cn(
                "flex flex-col gap-1 rounded-2xl py-1.5",
                isCurrent && "bg-accent-12 border border-accent-25",
                !isCurrent && isNext && "bg-[var(--card-2)] border border-[var(--stroke)]"
              )}
            >'''

new = '''            <div
              key={prayer.name}
              aria-current={isCurrent ? "true" : undefined}
              aria-label={`${prayer.label} ${prayer.timeLabel}${isCurrent ? " \u2014 \u0627\u0644\u0635\u0644\u0627\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629" : isNext ? " \u2014 \u0627\u0644\u0635\u0644\u0627\u0629 \u0627\u0644\u0642\u0627\u062f\u0645\u0629" : ""}`}
              className={cn(
                "flex flex-col gap-1 rounded-2xl py-1.5",
                isCurrent && "bg-accent-12 border border-accent-25",
                !isCurrent && isNext && "bg-[var(--card-2)] border border-[var(--stroke)]"
              )}
            >'''

if old in content:
    content = content.replace(old, new, 1)
    open(path, 'w', encoding='utf-8').write(content)
    print('PATCHED: PrayerWidget aria-current + aria-label on prayer cells')
else:
    print('NOT_FOUND')
