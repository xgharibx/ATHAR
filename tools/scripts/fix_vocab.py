#!/usr/bin/env python3
"""Fix duplicate and erroneous entries in quranVocab.ts."""
import sys

with open('src/data/quranVocab.ts', 'r', encoding='utf-8') as f:
    content = f.read()

fixes = [
    # id 29: "قُلب" has wrong diacritics (qulb not qalb) AND id 144 has correct "قَلْب"
    # → Replace id 29 with "فُؤَاد" (inner heart - Quran uses both qalb and fuad)
    (
        '  { id: 29, arabic: "قُلب", meaning: "قلب — العضو الروحي مقر الإيمان", frequency: 168 },',
        '  { id: 29, arabic: "فُؤَاد", meaning: "الفؤاد — القلب الداخلي؛ مركز الإدراك والوجدان", frequency: 16 },',
    ),
    # id 30: "عَقل" duplicate of id 95 and id 145 → "بُرهَان" (proof/evidence)
    (
        '  { id: 30, arabic: "عَقل", meaning: "عقل — فكر وفهم وتدبّر", frequency: 49 },',
        '  { id: 30, arabic: "بُرهَان", meaning: "البرهان — الدليل الساطع والحجة القاطعة على الحق", frequency: 9 },',
    ),
    # id 95: "عَقل" duplicate of id 30 and id 145 → "تَفَكُّر" (deep reflection)
    (
        '  { id: 95, arabic: "عَقل", meaning: "العقل — الفهم والإدراك والتفكر", frequency: 49 },',
        '  { id: 95, arabic: "تَفَكُّر", meaning: "التفكر — إعمال الفكر في آيات الله لاستخراج العِبَر والحِكَم", frequency: 18 },',
    ),
    # id 111: "ظَلَم" duplicate of id 14 (both the same verb) → "عَصَى" (to disobey)
    (
        '  { id: 111, arabic: "ظَلَم", meaning: "ظلم — تجاوز الحد ووضع الشيء في غير موضعه", frequency: 289 },',
        '  { id: 111, arabic: "عَصَى", meaning: "عصى — خالف أمر الله وخرج عن طاعته", frequency: 33 },',
    ),
    # id 113: "كَفَر" duplicate of id 13 (both the same verb) → "غَفَل" (to be heedless)
    (
        '  { id: 113, arabic: "كَفَر", meaning: "كفر — جحد نعمة الله أو وجوده أو رسوله", frequency: 525 },',
        '  { id: 113, arabic: "غَفَل", meaning: "غفل — ذهب عن باله وانشغل عن ذكر الله والآخرة", frequency: 45 },',
    ),
]

for old, new in fixes:
    count = content.count(old)
    if count == 1:
        content = content.replace(old, new, 1)
        print(f'Fixed: {old[:60]}...')
    else:
        print(f'WARN: found {count} occurrences of: {old[:60]}...')

with open('src/data/quranVocab.ts', 'w', encoding='utf-8', newline='\n') as f:
    f.write(content)
print('quranVocab.ts saved')
