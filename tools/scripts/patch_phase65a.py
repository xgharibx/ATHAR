"""Phase 65a: Add aria-hidden=true to decorative emoji spans/divs across all pages."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'

def patch(rel, patches):
    path = os.path.join(base, rel)
    with open(path, encoding='utf-8') as f:
        c = f.read()
    changed = False
    for old, new, label in patches:
        if old in c:
            c = c.replace(old, new)
            print(f'  OK  [{rel}] {label}')
            changed = True
        else:
            print(f'  MISS[{rel}] {label}')
    if changed:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(c)

# AsmaAlHusna: decorative header ✨ + memorized 🧠 badge
patch('src/pages/AsmaAlHusna.tsx', [
    ('<span className="text-lg">✨</span>',
     '<span className="text-lg" aria-hidden="true">✨</span>',
     'header ✨'),
    ('<span className="text-xs mt-1" title="محفوظة">🧠</span>',
     '<span className="text-xs mt-1" role="img" aria-label="محفوظة">🧠</span>',
     'memorized 🧠'),
])

# Duas: decorative header 🤲
patch('src/pages/Duas.tsx', [
    ('<span className="text-lg">🤲</span>',
     '<span className="text-lg" aria-hidden="true">🤲</span>',
     'header 🤲'),
])

# HadithBooks: decorative header ✨
patch('src/pages/HadithBooks.tsx', [
    ('<span className="text-lg">✨</span>',
     '<span className="text-lg" aria-hidden="true">✨</span>',
     'header ✨'),
])

# PrayerGuide: decorative header 🕌
patch('src/pages/PrayerGuide.tsx', [
    ('<span className="text-lg">🕌</span>',
     '<span className="text-lg" aria-hidden="true">🕌</span>',
     'header 🕌'),
])

# ProphetStories: decorative header 📜
patch('src/pages/ProphetStories.tsx', [
    ('<span className="text-lg">📜</span>',
     '<span className="text-lg" aria-hidden="true">📜</span>',
     'header 📜'),
])

# QuranVocab: decorative header 📖
patch('src/pages/QuranVocab.tsx', [
    ('<span className="text-lg">📖</span>',
     '<span className="text-lg" aria-hidden="true">📖</span>',
     'header 📖'),
])

# WuduGuide: decorative header 💧 + completion 💧
patch('src/pages/WuduGuide.tsx', [
    ('<span className="text-lg">💧</span>',
     '<span className="text-lg" aria-hidden="true">💧</span>',
     'header 💧'),
    ('<p className="text-lg">💧</p>',
     '<p className="text-lg" aria-hidden="true">💧</p>',
     'completion 💧'),
])

# Insights: stat emojis + perfect day ✨
patch('src/pages/Insights.tsx', [
    ('<span className="text-lg leading-none mb-0.5">📿</span>',
     '<span className="text-lg leading-none mb-0.5" aria-hidden="true">📿</span>',
     'stat 📿'),
    ('<span className="text-lg leading-none mb-0.5">📖</span>',
     '<span className="text-lg leading-none mb-0.5" aria-hidden="true">📖</span>',
     'stat 📖'),
    ('<span className="text-base leading-none">✨</span>',
     '<span className="text-base leading-none" aria-hidden="true">✨</span>',
     'perfect day ✨'),
    ('<span className="text-base">📿</span>',
     '<span className="text-base" aria-hidden="true">📿</span>',
     'stat2 📿'),
])

# Home: quran progress 📖, custom adhkar strip 📝, content library 📚
patch('src/pages/Home.tsx', [
    ('<span className="text-xs opacity-60">📖</span>',
     '<span className="text-xs opacity-60" aria-hidden="true">📖</span>',
     'quran progress 📖'),
    ('<span className="text-[22px] leading-none">📝</span>',
     '<span className="text-[22px] leading-none" aria-hidden="true">📝</span>',
     'strip 📝'),
    ('<span className="text-base">📚</span>',
     '<span className="text-base" aria-hidden="true">📚</span>',
     'content library 📚'),
])

# Settings: content library 📚
patch('src/pages/Settings.tsx', [
    ('<span className="text-base">📚</span>',
     '<span className="text-base" aria-hidden="true">📚</span>',
     'content library 📚'),
])

# NearbyMosques: header 🕌 + empty state 🕌
patch('src/pages/NearbyMosques.tsx', [
    ('<span className="text-2xl">🕌</span>',
     '<span className="text-2xl" aria-hidden="true">🕌</span>',
     'header 🕌'),
    ('<div className="text-4xl mb-2">🕌</div>',
     '<div className="text-4xl mb-2" aria-hidden="true">🕌</div>',
     'empty state 🕌'),
])

# VideoLibrary: search empty 🔍, seed warning 🔄, no videos 📚, no courses 🎓, not found 🎥
patch('src/pages/VideoLibrary.tsx', [
    ('<div className="text-3xl mb-2">🔍</div>',
     '<div className="text-3xl mb-2" aria-hidden="true">🔍</div>',
     'search empty 🔍'),
    ('<div className="text-2xl mt-0.5">🔄</div>',
     '<div className="text-2xl mt-0.5" aria-hidden="true">🔄</div>',
     'seed warning 🔄'),
    ('<div className="text-3xl mb-2">📚</div>',
     '<div className="text-3xl mb-2" aria-hidden="true">📚</div>',
     'no videos 📚'),
    ('<div className="text-3xl mb-2">🎓</div>',
     '<div className="text-3xl mb-2" aria-hidden="true">🎓</div>',
     'no courses 🎓'),
    ('<div className="text-3xl mb-2">🎥</div>',
     '<div className="text-3xl mb-2" aria-hidden="true">🎥</div>',
     'not found 🎥'),
])

# CustomAdhkar: pack icon 📝 + empty state 📝
patch('src/pages/CustomAdhkar.tsx', [
    ('<span className="text-2xl">📝</span>',
     '<span className="text-2xl" aria-hidden="true">📝</span>',
     'pack icon 📝'),
    ('<div className="text-3xl mb-2">📝</div>',
     '<div className="text-3xl mb-2" aria-hidden="true">📝</div>',
     'empty state 📝'),
])

# QuranPlans: no active plan 📖
patch('src/pages/QuranPlans.tsx', [
    ('<div className="text-3xl">📖</div>',
     '<div className="text-3xl" aria-hidden="true">📖</div>',
     'no active plan 📖'),
])

# Mushaf: tafsir sheet 📖, inline tafsir 📖, khatma complete 📅, plans link 📅, session card 📖
patch('src/pages/Mushaf.tsx', [
    ('<span style={{ color: "var(--accent)" }}>📖</span>',
     '<span style={{ color: "var(--accent)" }} aria-hidden="true">📖</span>',
     'tafsir sheet 📖'),
    ('<span className="text-base">📖</span>',
     '<span className="text-base" aria-hidden="true">📖</span>',
     'inline tafsir 📖'),
    ('<span className="text-2xl">📅</span>',
     '<span className="text-2xl" aria-hidden="true">📅</span>',
     'khatma complete 📅'),
    ('<span className="opacity-55 text-lg">📅</span>',
     '<span className="opacity-55 text-lg" aria-hidden="true">📅</span>',
     'plans link 📅'),
    ('<div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📖</div>',
     '<div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }} aria-hidden="true">📖</div>',
     'session card 📖'),
])

# CommandPalette: all emoji icon spans
patch('src/components/layout/CommandPalette.tsx', [
    ('<span className="text-base">🏠</span>',
     '<span className="text-base" aria-hidden="true">🏠</span>',
     '🏠'),
    ('<span className="text-base">📖</span>',
     '<span className="text-base" aria-hidden="true">📖</span>',
     '📖'),
    ('<span className="text-base">📿</span>',
     '<span className="text-base" aria-hidden="true">📿</span>',
     '📿'),
    ('<span className="text-base">🕌</span>',
     '<span className="text-base" aria-hidden="true">🕌</span>',
     '🕌'),
    ('<span className="text-base">🔍</span>',
     '<span className="text-base" aria-hidden="true">🔍</span>',
     '🔍'),
    ('<span className="text-base">❤️</span>',
     '<span className="text-base" aria-hidden="true">❤️</span>',
     '❤️'),
    ('<span className="text-base">📊</span>',
     '<span className="text-base" aria-hidden="true">📊</span>',
     '📊'),
    ('<span className="text-base">🏆</span>',
     '<span className="text-base" aria-hidden="true">🏆</span>',
     '🏆'),
    ('<span className="text-base">⚙️</span>',
     '<span className="text-base" aria-hidden="true">⚙️</span>',
     '⚙️'),
    ('<span className="text-base">✨</span>',
     '<span className="text-base" aria-hidden="true">✨</span>',
     '✨'),
    ('<span className="text-base">🤲</span>',
     '<span className="text-base" aria-hidden="true">🤲</span>',
     '🤲'),
    ('<span className="text-base">📚</span>',
     '<span className="text-base" aria-hidden="true">📚</span>',
     '📚'),
    ('<span className="text-base">🧎</span>',
     '<span className="text-base" aria-hidden="true">🧎</span>',
     '🧎'),
    ('<span className="text-base">💧</span>',
     '<span className="text-base" aria-hidden="true">💧</span>',
     '💧'),
    ('<span className="text-base">🕌</span>',
     '<span className="text-base" aria-hidden="true">🕌</span>',
     '🕌 cmd2'),
])

print('\nDone.')
