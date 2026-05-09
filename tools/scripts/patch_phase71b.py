"""Phase 71b: Focus management — autoFocus for custom dialogs."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'

patches = [
    (
        'src/components/dhikr/DhikrList.tsx',
        [
            (
                '                value={customText}\n                onChange={(event) => setCustomText(event.target.value)}\n                placeholder="اكتب الذكر"\n                aria-label="نص الذكر الجديد"',
                '                value={customText}\n                onChange={(event) => setCustomText(event.target.value)}\n                placeholder="اكتب الذكر"\n                aria-label="نص الذكر الجديد"\n                autoFocus',
                'DhikrList add dialog textarea autoFocus'
            ),
        ]
    ),
    (
        'src/pages/PrayerTimes.tsx',
        [
            (
                '<button type="button" aria-label="إغلاق" onClick={onClose} className="opacity-50 hover:opa',
                '<button type="button" aria-label="إغلاق" onClick={onClose} autoFocus className="opacity-50 hover:opa',
                'PrayerTimes settings close button autoFocus'
            ),
        ]
    ),
    (
        'src/pages/QuranPlans.tsx',
        [
            (
                '              <Button variant="ghost" className="flex-1" onClick={() => setConfirmReset(false)}>',
                '              <Button variant="ghost" className="flex-1" autoFocus onClick={() => setConfirmReset(false)}>',
                'QuranPlans confirm reset cancel button autoFocus'
            ),
        ]
    ),
    (
        'src/components/onboarding/OnboardingFlow.tsx',
        [
            (
                '          <button type="button"\n            className="w-full mt-5 py-3.5 rounded-2xl bg-[var(--accent)] text-[var(--on-accent)] fon',
                '          <button type="button"\n            autoFocus\n            className="w-full mt-5 py-3.5 rounded-2xl bg-[var(--accent)] text-[var(--on-accent)] fon',
                'OnboardingFlow action button autoFocus'
            ),
        ]
    ),
]

for relpath, file_patches in patches:
    path = os.path.join(base, relpath.replace('/', os.sep))
    with open(path, encoding='utf-8') as f:
        c = f.read()
    changed = False
    for old, new, label in file_patches:
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
