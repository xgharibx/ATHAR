"""Phase 87 patch: aria-pressed on all Settings.tsx option-selector buttons"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
path = os.path.join(WORKSPACE, 'src', 'pages', 'Settings.tsx')
with open(path, encoding='utf-8') as f:
    content = f.read()

changes = 0

def patch(old, new, label):
    global content, changes
    if old in content:
        content = content.replace(old, new, 1)
        print(f'OK: {label}')
        changes += 1
    else:
        print(f'FAIL: {label}')

# --- 1. ThemeChip: add aria-pressed ---
patch(
    '''    <button type="button"
      onClick={props.onClick}
      className={[''',
    '''    <button type="button"
      onClick={props.onClick}
      aria-pressed={props.active}
      className={[''',
    'ThemeChip aria-pressed'
)

# --- 2. Arabic font buttons ---
patch(
    '''              <button type="button"
                key={f.id}
                onClick={() => setPrefs({ arabicFont: f.id })}
                className={[''',
    '''              <button type="button"
                key={f.id}
                onClick={() => setPrefs({ arabicFont: f.id })}
                aria-pressed={(prefs.arabicFont ?? "noto_naskh") === f.id}
                className={[''',
    'Arabic font selector aria-pressed'
)

# --- 3. Language selector buttons ---
patch(
    '''                <button type="button"
                  key={lang}
                  onClick={() => lang === "ar" ? setPrefs({ uiLanguage: lang }) : toast("\u0627\u0644\u062a\u0631\u062c\u0645\u0629 \u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629 \u0642\u0631\u064a\u0628\u064b\u0627 \ud83c\udf10")}
                  className={[''',
    '''                <button type="button"
                  key={lang}
                  onClick={() => lang === "ar" ? setPrefs({ uiLanguage: lang }) : toast("\u0627\u0644\u062a\u0631\u062c\u0645\u0629 \u0627\u0644\u0625\u0646\u062c\u0644\u064a\u0632\u064a\u0629 \u0642\u0631\u064a\u0628\u064b\u0627 \ud83c\udf10")}
                  aria-pressed={(prefs.uiLanguage ?? "ar") === lang}
                  className={[''',
    'Language selector aria-pressed'
)

# --- 4. Text direction buttons ---
patch(
    '''                <button type="button"
                  key={d.id}
                  onClick={() => setPrefs({ textDir: d.id })}
                  className={[
                    "px-3 py-2 rounded-xl border text-xs transition min-h-[40px]",''',
    '''                <button type="button"
                  key={d.id}
                  onClick={() => setPrefs({ textDir: d.id })}
                  aria-pressed={(prefs.textDir ?? "auto") === d.id}
                  className={[
                    "px-3 py-2 rounded-xl border text-xs transition min-h-[40px]",''',
    'Text direction selector aria-pressed'
)

# --- 5. Quran page size buttons ---
patch(
    '''                    <button type="button"
                      key={n}
                      onClick={() => setPrefs({ quranPageSize: n })}
                      className={[''',
    '''                    <button type="button"
                      key={n}
                      onClick={() => setPrefs({ quranPageSize: n })}
                      aria-pressed={prefs.quranPageSize === n}
                      className={[''',
    'Quran page size aria-pressed'
)

# --- 6. Quran paper theme buttons ---
patch(
    '''                  <button type="button"
                    key={t}
                    onClick={() => setPrefs({ quranTheme: t })}
                    className={[
                      "text-[10px] px-2.5 py-1.5 rounded-xl border transition min-h-[36px]",''',
    '''                  <button type="button"
                    key={t}
                    onClick={() => setPrefs({ quranTheme: t })}
                    aria-pressed={prefs.quranTheme === t}
                    className={[
                      "text-[10px] px-2.5 py-1.5 rounded-xl border transition min-h-[36px]",''',
    'Quran theme selector aria-pressed'
)

# --- 7. Scroll mode buttons ---
patch(
    '''                  <button type="button"
                    key={m}
                    onClick={() => setPrefs({ quranScrollMode: m })}
                    className={[
                      "text-xs px-3 py-2 rounded-xl border transition min-h-[36px]",''',
    '''                  <button type="button"
                    key={m}
                    onClick={() => setPrefs({ quranScrollMode: m })}
                    aria-pressed={prefs.quranScrollMode === m}
                    className={[
                      "text-xs px-3 py-2 rounded-xl border transition min-h-[36px]",''',
    'Scroll mode aria-pressed'
)

# --- 8. Daily goal preset buttons ---
patch(
    '''                <button type="button"
                  key={p.value}
                  onClick={() => setPrefs({ quranDailyGoal: p.value })}
                  className={[''',
    '''                <button type="button"
                  key={p.value}
                  onClick={() => setPrefs({ quranDailyGoal: p.value })}
                  aria-pressed={(prefs.quranDailyGoal ?? 10) === p.value}
                  className={[''',
    'Daily goal presets aria-pressed'
)

# --- 9. Reciter buttons ---
patch(
    '''              <button type="button"
                key={r.id}
                onClick={() => setPrefs({ quranReciter: r.id })}
                className={[
                  "px-3 py-2.5 rounded-2xl border text-sm transition flex items-center gap-2 min-h-[44px] text-right",''',
    '''              <button type="button"
                key={r.id}
                onClick={() => setPrefs({ quranReciter: r.id })}
                aria-pressed={(prefs.quranReciter ?? "Alafasy_128kbps") === r.id}
                className={[
                  "px-3 py-2.5 rounded-2xl border text-sm transition flex items-center gap-2 min-h-[44px] text-right",''',
    'Reciter selector aria-pressed'
)

# --- 10. Reminder sound profile selector button ---
patch(
    '''                  <button type="button"
                    onClick={() => setReminders({ soundProfile: option.id })}
                    className="w-full text-right"
                    disabled={!reminders.enabled && isNative}
                  >''',
    '''                  <button type="button"
                    onClick={() => setReminders({ soundProfile: option.id })}
                    aria-pressed={active}
                    className="w-full text-right"
                    disabled={!reminders.enabled && isNative}
                  >''',
    'Reminder sound profile aria-pressed'
)

# --- 11. Prayer sound profile selector button ---
patch(
    '''                      <button type="button"
                        onClick={() => setReminders({ prayerSoundProfile: option.id })}
                        className="w-full text-right"
                        disabled={!reminders.enabled && isNative}
                      >''',
    '''                      <button type="button"
                        onClick={() => setReminders({ prayerSoundProfile: option.id })}
                        aria-pressed={active}
                        className="w-full text-right"
                        disabled={!reminders.enabled && isNative}
                      >''',
    'Prayer sound profile aria-pressed'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nTotal Settings.tsx changes: {changes}')
