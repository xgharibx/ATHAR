#!/usr/bin/env python3
"""
Enhance Mushaf.tsx session summary to show:
1. Completed surahs during this session
2. Today's total ayahs read
"""

with open('src/pages/Mushaf.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add quranDailyAyahs to store subscriptions
old1 = '  const recordQuranRead = useNoorStore((s) => s.recordQuranRead);'
new1 = (
    '  const recordQuranRead = useNoorStore((s) => s.recordQuranRead);\n'
    '  const quranDailyAyahs = useNoorStore((s) => s.quranDailyAyahs);'
)

count1 = content.count(old1)
if count1 == 1:
    content = content.replace(old1, new1, 1)
    print('quranDailyAyahs selector added')
else:
    print(f'Pattern 1 found {count1} times')

# 2. Enhance session summary JSX
old2 = '''          <div className="mushaf-session-card" role="dialog" aria-modal="true" aria-label="\u0645\u0644\u062e\u0635 \u062c\u0644\u0633\u0629 \u0627\u0644\u0642\u0631\u0627\u0621\u0629" dir="rtl">
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>\U0001f4d6</div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.3rem" }}>\u062c\u0644\u0633\u0629 \u0642\u0631\u0627\u0621\u0629</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.65, marginBottom: "1.25rem" }}>
              {toArabicNumeral(sessionDurationMin)} \u062f\u0642\u064a\u0642\u0629 \u00b7 {toArabicNumeral(pagesReadRef.current.size)} \u0635\u0641\u062d\u0629
            </div>
            <button type="button"
              className="mushaf-btn-primary"
              style={{ width: "100%" }}
              onClick={() => { setShowSessionSummary(false); navigate("/quran"); }}
            >
              \u062d\u0633\u0646\u064b\u0627
            </button>
          </div>'''

new2 = '''          <div className="mushaf-session-card" role="dialog" aria-modal="true" aria-label="\u0645\u0644\u062e\u0635 \u062c\u0644\u0633\u0629 \u0627\u0644\u0642\u0631\u0627\u0621\u0629" dir="rtl">
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>\U0001f4d6</div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.3rem" }}>\u062c\u0644\u0633\u0629 \u0642\u0631\u0627\u0621\u0629</div>
            <div style={{ fontSize: "0.85rem", opacity: 0.65, marginBottom: sessionSurahCompletedRef.current.size > 0 ? "0.75rem" : "1.25rem" }}>
              {toArabicNumeral(sessionDurationMin)} \u062f\u0642\u064a\u0642\u0629 \u00b7 {toArabicNumeral(pagesReadRef.current.size)} \u0635\u0641\u062d\u0629
              {(() => {
                const todayISO2 = new Date().toISOString().slice(0, 10);
                const todayAyahs = quranDailyAyahs?.[todayISO2] ?? 0;
                return todayAyahs > 0 ? <span> \u00b7 {toArabicNumeral(todayAyahs)} \u0622\u064a\u0629 \u0627\u0644\u064a\u0648\u0645</span> : null;
              })()}
            </div>
            {sessionSurahCompletedRef.current.size > 0 && (
              <div style={{ marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center" }}>
                {[...sessionSurahCompletedRef.current].map((sid) => {
                  const name = quranDB?.find((s) => s.id === sid)?.name;
                  if (!name) return null;
                  return (
                    <span key={sid} style={{ fontSize: "0.78rem", padding: "0.2rem 0.65rem", borderRadius: "999px", background: "rgba(61,220,151,0.15)", color: "#3ddc97", border: "1px solid rgba(61,220,151,0.3)" }}>
                      {name} \u2713
                    </span>
                  );
                })}
              </div>
            )}
            <button type="button"
              className="mushaf-btn-primary"
              style={{ width: "100%" }}
              onClick={() => { setShowSessionSummary(false); navigate("/quran"); }}
            >
              \u062d\u0633\u0646\u064b\u0627
            </button>
          </div>'''

count2 = content.count(old2)
if count2 == 1:
    content = content.replace(old2, new2, 1)
    print('Session summary enhanced')
else:
    print(f'Pattern 2 found {count2} times')

with open('src/pages/Mushaf.tsx', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print('Saved')
