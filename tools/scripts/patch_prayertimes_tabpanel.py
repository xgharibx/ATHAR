"""Patch PrayerTimes.tsx: add id to tab buttons and role=tabpanel to panels."""
path = r'c:\Users\Amrab\Downloads\noor-adhkar\src\pages\PrayerTimes.tsx'
content = open(path, 'r', encoding='utf-8').read()

patches = [
    # Tab buttons: add id
    (
        '          <button type="button" key={tab.key} role="tab" aria-selected={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}',
        '          <button type="button" key={tab.key} id={`pt-tab-${tab.key}`} role="tab" aria-selected={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}'
    ),
    # TODAY panel
    (
        '        {/* TODAY */}\n        {activeTab === "today" && (\n          <div className="space-y-2.5">',
        '        {/* TODAY */}\n        {activeTab === "today" && (\n          <div className="space-y-2.5" role="tabpanel" id="pt-panel-today" aria-labelledby="pt-tab-today" tabIndex={0}>'
    ),
    # WEEKLY panel
    (
        '        {/* WEEKLY */}\n        {activeTab === "weekly" && (\n          <div>\n            <div className="text-sm font-semibold mb-4">\u0635\u0644\u0648\u0627\u062a \u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u062d\u0627\u0644\u064a</div>',
        '        {/* WEEKLY */}\n        {activeTab === "weekly" && (\n          <div role="tabpanel" id="pt-panel-weekly" aria-labelledby="pt-tab-weekly" tabIndex={0}>\n            <div className="text-sm font-semibold mb-4">\u0635\u0644\u0648\u0627\u062a \u0627\u0644\u0623\u0633\u0628\u0648\u0639 \u0627\u0644\u062d\u0627\u0644\u064a</div>'
    ),
    # MONTHLY panel
    (
        '        {/* MONTHLY */}\n        {activeTab === "monthly" && (\n          <div>\n            <div className="text-sm font-semibold mb-4">\u0627\u0644\u062a\u0642\u0648\u064a\u0645 \u0627\u0644\u0634\u0647\u0631\u064a \u0644\u0644\u0645\u0648\u0627\u0642\u064a\u062a</div>',
        '        {/* MONTHLY */}\n        {activeTab === "monthly" && (\n          <div role="tabpanel" id="pt-panel-monthly" aria-labelledby="pt-tab-monthly" tabIndex={0}>\n            <div className="text-sm font-semibold mb-4">\u0627\u0644\u062a\u0642\u0648\u064a\u0645 \u0627\u0644\u0634\u0647\u0631\u064a \u0644\u0644\u0645\u0648\u0627\u0642\u064a\u062a</div>'
    ),
    # TRACKING panel (inline component)
    (
        '        {/* TRACKING */}\n        {activeTab === "track" && <TrackingTab timings={timings} />}',
        '        {/* TRACKING */}\n        {activeTab === "track" && <div role="tabpanel" id="pt-panel-track" aria-labelledby="pt-tab-track" tabIndex={0}><TrackingTab timings={timings} /></div>}'
    ),
    # HIJRI panel
    (
        '        {/* HIJRI */}\n        {activeTab === "hijri" && (\n          <div>\n            <div className="text-sm font-semibold mb-4">\u0627\u0644\u062a\u0642\u0648\u064a\u0645 \u0627\u0644\u0647\u062c\u0631\u064a \u0648\u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0627\u062a \u0627\u0644\u0625\u0633\u0644\u0627\u0645\u064a\u0629</div>',
        '        {/* HIJRI */}\n        {activeTab === "hijri" && (\n          <div role="tabpanel" id="pt-panel-hijri" aria-labelledby="pt-tab-hijri" tabIndex={0}>\n            <div className="text-sm font-semibold mb-4">\u0627\u0644\u062a\u0642\u0648\u064a\u0645 \u0627\u0644\u0647\u062c\u0631\u064a \u0648\u0627\u0644\u0645\u0646\u0627\u0633\u0628\u0627\u062a \u0627\u0644\u0625\u0633\u0644\u0627\u0645\u064a\u0629</div>'
    ),
    # CITIES panel
    (
        '        {/* CITIES */}\n        {activeTab === "cities" && (\n          <div>\n            <div className="text-sm font-semibold mb-4">\u0645\u0648\u0627\u0642\u064a\u062a \u0627\u0644\u0635\u0644\u0627\u0629 \u0641\u064a \u0645\u062f\u0646 \u0623\u062e\u0631\u0649</div>',
        '        {/* CITIES */}\n        {activeTab === "cities" && (\n          <div role="tabpanel" id="pt-panel-cities" aria-labelledby="pt-tab-cities" tabIndex={0}>\n            <div className="text-sm font-semibold mb-4">\u0645\u0648\u0627\u0642\u064a\u062a \u0627\u0644\u0635\u0644\u0627\u0629 \u0641\u064a \u0645\u062f\u0646 \u0623\u062e\u0631\u0649</div>'
    ),
    # STATS panel (inline)
    (
        '        {/* STATS */}\n        {activeTab === "stats" && <StatsTab />}',
        '        {/* STATS */}\n        {activeTab === "stats" && <div role="tabpanel" id="pt-panel-stats" aria-labelledby="pt-tab-stats" tabIndex={0}><StatsTab /></div>}'
    ),
    # ARC panel (inline)
    (
        '        {/* ARC */}\n        {activeTab === "arc" && <DayArcTab timings={timings} />}',
        '        {/* ARC */}\n        {activeTab === "arc" && <div role="tabpanel" id="pt-panel-arc" aria-labelledby="pt-tab-arc" tabIndex={0}><DayArcTab timings={timings} /></div>}'
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
