#!/usr/bin/env python3
"""Patch Mushaf.tsx with surah completion toast feature."""
import sys

with open('src/pages/Mushaf.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Insertion 1: add quranDBRef + sessionSurahCompletedRef after useQuranPageMap
old1 = (
    '  const { data: pmData, isLoading: pmLoading } = useQuranPageMap();\n'
    '\n'
    '  const prefs'
)
new1 = (
    '  const { data: pmData, isLoading: pmLoading } = useQuranPageMap();\n'
    '  // Keep a ref so audio callbacks can access latest DB without closure stale-ness\n'
    '  const quranDBRef = React.useRef(quranDB);\n'
    '  React.useEffect(() => { quranDBRef.current = quranDB; }, [quranDB]);\n'
    '  // Track which surahs we\'ve already toasted a completion for this session\n'
    '  const sessionSurahCompletedRef = React.useRef(new Set<number>());\n'
    '\n'
    '  const prefs'
)

count1 = content.count(old1)
if count1 == 1:
    content = content.replace(old1, new1, 1)
    print('Insertion 1 OK')
else:
    print(f'Insertion 1 FAILED - found {count1} occurrences')
    sys.exit(1)

# Insertion 2: surah completion check in audio.onended
old2 = (
    '        if (!pst.active) { setPlayingKey(null); return; }\n'
    '        if (pst.loop) {'
)
new2 = (
    '        if (!pst.active) { setPlayingKey(null); return; }\n'
    '        // Surah completion celebration (once per surah per session)\n'
    '        const surahInfo = quranDBRef.current?.find((s) => s.id === surahId);\n'
    '        if (surahInfo && originalAyah === surahInfo.ayahs.length && !sessionSurahCompletedRef.current.has(surahId)) {\n'
    '          sessionSurahCompletedRef.current.add(surahId);\n'
    '          toast.success(`\u0623\u062a\u0645\u0645\u062a \u0633\u0648\u0631\u0629 ${surahInfo.name} \U0001f31f`, { duration: 3500 });\n'
    '        }\n'
    '        if (pst.loop) {'
)

count2 = content.count(old2)
if count2 == 1:
    content = content.replace(old2, new2, 1)
    print('Insertion 2 OK')
else:
    print(f'Insertion 2 FAILED - found {count2} occurrences')
    sys.exit(1)

with open('src/pages/Mushaf.tsx', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print('File saved successfully')
