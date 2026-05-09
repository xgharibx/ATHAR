#!/usr/bin/env python3
"""Add auto-scroll to current surah in Quran.tsx."""

with open('src/pages/Quran.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add currentSurahRef and the auto-scroll useEffect after the filterJuz sync effect
old1 = '''  // Sync URL param changes (e.g. back-navigation)
  React.useEffect(() => {
    setFilterJuz(parseJuzParam(searchParams.get("juz")));
  }, [searchParams]);'''

new1 = '''  // Sync URL param changes (e.g. back-navigation)
  React.useEffect(() => {
    setFilterJuz(parseJuzParam(searchParams.get("juz")));
  }, [searchParams]);

  // Auto-scroll to currently reading surah on first load (only when not filtered/queried)
  const currentSurahRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!lastRead || filterJuz || query) return;
    const timer = setTimeout(() => {
      currentSurahRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350);
    return () => clearTimeout(timer);
  // Only run on initial mount or when the reading position changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastRead?.surahId]);'''

count1 = content.count(old1)
if count1 == 1:
    content = content.replace(old1, new1, 1)
    print('Auto-scroll ref + useEffect added')
else:
    print(f'Pattern 1 found {count1} times - expected 1')

# 2. Attach the ref to the isCurrent surah's outer div in the list
old2 = '''                <div key={s.id} role="listitem">
                <button type="button"
                  onClick={() => { recordRecentSurah(s.id); navigate(`/mushaf?surah=${s.id}`); }}'''

new2 = '''                <div key={s.id} role="listitem" ref={isCurrent ? currentSurahRef : undefined}>
                <button type="button"
                  onClick={() => { recordRecentSurah(s.id); navigate(`/mushaf?surah=${s.id}`); }}'''

count2 = content.count(old2)
if count2 == 1:
    content = content.replace(old2, new2, 1)
    print('currentSurahRef attached to listitem')
else:
    print(f'Pattern 2 found {count2} times - expected 1')

with open('src/pages/Quran.tsx', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print('Saved')
