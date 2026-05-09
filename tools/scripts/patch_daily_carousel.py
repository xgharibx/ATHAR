"""Patch DailyCarousel.tsx: add ARIA carousel pattern roles."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\components\ui\DailyCarousel.tsx'
content = open(path, 'r', encoding='utf-8').read()

patches = [
    # 1. Wrap the outer Card with role="region" and aria-label
    (
        '    <Card className="p-0 overflow-hidden">\n      {/* Header label */}',
        '    <Card className="p-0 overflow-hidden" role="region" aria-label="\u0645\u062d\u062a\u0648\u0649 \u064a\u0648\u0645\u064a" aria-roledescription="\u0639\u0631\u0636 \u062f\u0648\u0627\u0631">\n      {/* Header label */'
    ),
    # 2. Add aria-live and id to the slides container
    (
        '      <div\n        style={{ overflow: "hidden", width: "100%" }}\n        onTouchStart={handleTouchStart}\n        onTouchEnd={handleTouchEnd}\n      >',
        '      <div\n        style={{ overflow: "hidden", width: "100%" }}\n        aria-live="polite"\n        aria-atomic="true"\n        onTouchStart={handleTouchStart}\n        onTouchEnd={handleTouchEnd}\n      >'
    ),
    # 3. Add aria-roledescription and aria-label to slide 1
    (
        '          {/* Slide 1: \u0622\u064a\u0629 \u0627\u0644\u064a\u0648\u0645 */}\n          <div style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>',
        '          {/* Slide 1: \u0622\u064a\u0629 \u0627\u0644\u064a\u0648\u0645 */}\n          <div role="group" aria-roledescription="\u0634\u0631\u064a\u062d\u0629" aria-label="\u0622\u064a\u0629 \u0627\u0644\u064a\u0648\u0645" style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>'
    ),
    # 4. Add aria-roledescription and aria-label to slide 2
    (
        '          {/* Slide 2: \u062d\u062f\u064a\u062b \u0627\u0644\u064a\u0648\u0645 */}\n          <div style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>',
        '          {/* Slide 2: \u062d\u062f\u064a\u062b \u0627\u0644\u064a\u0648\u0645 */}\n          <div role="group" aria-roledescription="\u0634\u0631\u064a\u062d\u0629" aria-label="\u062d\u062f\u064a\u062b \u0627\u0644\u064a\u0648\u0645" style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>'
    ),
    # 5. Add aria-roledescription and aria-label to slide 3
    (
        '          {/* Slide 3: \u062a\u062f\u0628\u0631 \u0627\u0644\u064a\u0648\u0645 */}\n          <div style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>',
        '          {/* Slide 3: \u062a\u062f\u0628\u0631 \u0627\u0644\u064a\u0648\u0645 */}\n          <div role="group" aria-roledescription="\u0634\u0631\u064a\u062d\u0629" aria-label="\u062a\u062f\u0628\u0631 \u0627\u0644\u064a\u0648\u0645" style={{ flex: "0 0 100%", width: "100%", padding: "0.75rem 1rem 1rem" }}>'
    ),
    # 6. Add role="tablist" to dot indicators container
    (
        '      {/* Dot indicators */}\n      <div className="flex items-center justify-center gap-2 pb-3">',
        '      {/* Dot indicators */}\n      <div className="flex items-center justify-center gap-2 pb-3" role="tablist" aria-label="\u062a\u0646\u0642\u0644 \u0628\u064a\u0646 \u0627\u0644\u0634\u0631\u0627\u0626\u062d">'
    ),
    # 7. Add role="tab" and aria-selected to each dot button
    (
        '          <button type="button"\n            key={i}\n            aria-label={SLIDE_LABELS[i]}\n            onClick={() => goTo(i)}',
        '          <button type="button"\n            key={i}\n            role="tab"\n            aria-selected={activeIdx === i}\n            aria-label={SLIDE_LABELS[i]}\n            onClick={() => goTo(i)}'
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
