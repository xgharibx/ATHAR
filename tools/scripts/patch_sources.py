"""Patch Sources.tsx: add aria-labels to count input, benefit input, and islambook external link."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\Sources.tsx'
content = open(path, 'r', encoding='utf-8').read()

# 1. Add aria-label to count input
old1 = '''          <Input
            type="number"
            min={1}
            value={customCount}
            onChange={(event) => setCustomCount(event.target.value)}
            inputMode="numeric"
            placeholder="\u0627\u0644\u0639\u062f\u062f"
          />'''
new1 = '''          <Input
            type="number"
            min={1}
            value={customCount}
            onChange={(event) => setCustomCount(event.target.value)}
            inputMode="numeric"
            placeholder="\u0627\u0644\u0639\u062f\u062f"
            aria-label="\u0639\u062f\u062f \u0627\u0644\u062a\u0643\u0631\u0627\u0631"
          />'''

# 2. Add aria-label to benefit/source input
old2 = '''        <Input
          className="mt-3"
          value={customBenefit}
          onChange={(event) => setCustomBenefit(event.target.value)}
          placeholder="\u0627\u0644\u0645\u0635\u062f\u0631 \u0623\u0648 \u0627\u0644\u0641\u0636\u0644"
        />'''
new2 = '''        <Input
          className="mt-3"
          value={customBenefit}
          onChange={(event) => setCustomBenefit(event.target.value)}
          placeholder="\u0627\u0644\u0645\u0635\u062f\u0631 \u0623\u0648 \u0627\u0644\u0641\u0636\u0644"
          aria-label="\u0627\u0644\u0645\u0635\u062f\u0631 \u0623\u0648 \u0641\u0636\u0644 \u0627\u0644\u0630\u0643\u0631"
        />'''

# 3. Add aria-label to external link
old3 = '''          <a
            href="https://www.islambook.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--card)] hover:bg-[var(--card-2)] border border-[var(--stroke)] text-sm min-h-[44px]"
          >'''
new3 = '''          <a
            href="https://www.islambook.com/"
            target="_blank"
            rel="noreferrer"
            aria-label="\u0641\u062a\u062d \u0645\u0648\u0642\u0639 islambook.com \u0641\u064a \u062a\u0628\u0648\u064a\u0628 \u062c\u062f\u064a\u062f"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--card)] hover:bg-[var(--card-2)] border border-[var(--stroke)] text-sm min-h-[44px]"
          >'''

patches = [(old1, new1), (old2, new2), (old3, new3)]
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
