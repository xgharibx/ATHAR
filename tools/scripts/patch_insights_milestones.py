#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Phase 47: Quran milestone achievements card in Insights.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/Insights.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Add quranMilestones memo after topReadSurahs memo (before quranJuzCompletion)
MEMO_ANCHOR = '  const quranJuzCompletion = React.useMemo(() => {'
MILESTONE_MEMO = '''  // Quran milestone achievements
  const quranMilestones = React.useMemo(() => {
    const pct = overallQuranProgress;
    const completed = quranStats.completed;
    const totalRead = quranStats.totalAyahs;
    return [
      { id: 'start',  icon: '\\u{1F331}', label: '\\u0628\\u062F\\u0623\\u062A \\u0627\\u0644\\u0631\\u062D\\u0644\\u0629',     unlocked: totalRead >= 1 },
      { id: 'q10',    icon: '\\u2B50',    label: '\\u0642\\u0631\\u0623\\u062A 10\\u066A',         unlocked: pct >= 10 },
      { id: 'q25',    icon: '\\u{1F319}', label: '\\u0631\\u0628\\u0639 \\u0627\\u0644\\u0642\\u0631\\u0622\\u0646',        unlocked: pct >= 25 },
      { id: 'q50',    icon: '\\u{1F31F}', label: '\\u0646\\u0635\\u0641 \\u0627\\u0644\\u0642\\u0631\\u0622\\u0646',        unlocked: pct >= 50 },
      { id: 'q75',    icon: '\\u2728',    label: '\\u062B\\u0644\\u0627\\u062B\\u0629 \\u0623\\u0631\\u0628\\u0627\\u0639',       unlocked: pct >= 75 },
      { id: 'q100',   icon: '\\u{1F3C6}', label: '\\u062E\\u062A\\u0645\\u062A \\u0627\\u0644\\u0642\\u0631\\u0622\\u0646',       unlocked: pct >= 100 },
      { id: 's1',     icon: '\\u{1F4D6}', label: '\\u0623\\u0648\\u0644 \\u0633\\u0648\\u0631\\u0629 \\u0645\\u0643\\u062A\\u0645\\u0644\\u0629',   unlocked: completed >= 1 },
      { id: 's10',    icon: '\\u{1F4DA}', label: '10 \\u0633\\u0648\\u0631 \\u0645\\u0643\\u062A\\u0645\\u0644\\u0629',     unlocked: completed >= 10 },
      { id: 's30',    icon: '\\u{1F393}', label: '30 \\u0633\\u0648\\u0631\\u0629 \\u0645\\u0643\\u062A\\u0645\\u0644\\u0629',    unlocked: completed >= 30 },
      { id: 's114',   icon: '\\u{1F451}', label: '\\u0643\\u0644 \\u0633\\u0648\\u0631 \\u0627\\u0644\\u0642\\u0631\\u0622\\u0646',          unlocked: completed >= 114 },
      { id: 'str7',   icon: '\\u{1F525}', label: '7 \\u0623\\u064A\\u0627\\u0645 \\u0645\\u062A\\u0648\\u0627\\u0635\\u0644\\u0629',    unlocked: quranStreak >= 7 },
      { id: 'str30',  icon: '\\u{1F48E}', label: '30 \\u064A\\u0648\\u0645\\u0627\\u064B \\u0645\\u062A\\u0648\\u0627\\u0635\\u0644\\u0627\\u064B',  unlocked: quranStreak >= 30 },
    ];
  }, [overallQuranProgress, quranStats, quranStreak]);

'''
c1 = content.count(MEMO_ANCHOR)
print(f'1. Memo anchor: {c1}')
if c1 == 1:
    content = content.replace(MEMO_ANCHOR, MILESTONE_MEMO + MEMO_ANCHOR, 1)

# 2. Add milestone card after topReadSurahs card, before prayer card
# Anchor: the comment "I2: Prayer consistency chart"
CARD_ANCHOR = '      {/* I2: Prayer consistency chart (28 days) */}'
MILESTONE_CARD = '''      {/* I5: Quran milestone achievements */}
      {quranStats.totalAyahs > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span aria-hidden="true" className="text-base leading-none">\\u{1F3C5}</span>
            <div className="font-semibold text-sm">\\u0625\\u0646\\u062C\\u0627\\u0632\\u0627\\u062A\\u0643 \\u0641\\u064A \\u0627\\u0644\\u0642\\u0631\\u0622\\u0646</div>
            <span className="text-[11px] opacity-50 mr-auto tabular-nums">
              {quranMilestones.filter((m) => m.unlocked).length} / {quranMilestones.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {quranMilestones.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all"
                style={
                  m.unlocked
                    ? {
                        background: "color-mix(in srgb, var(--ok) 15%, var(--card))",
                        color: "var(--ok)",
                        border: "1px solid color-mix(in srgb, var(--ok) 30%, transparent)",
                      }
                    : {
                        background: "color-mix(in srgb, var(--fg) 5%, var(--card))",
                        color: "var(--fg)",
                        opacity: 0.35,
                        border: "1px solid color-mix(in srgb, var(--fg) 10%, transparent)",
                      }
                }
                aria-label={m.unlocked ? `\\u0645\\u0641\\u062A\\u0648\\u062D: ${m.label}` : `\\u0645\\u063A\\u0644\\u0642: ${m.label}`}
              >
                <span aria-hidden="true">{m.icon}</span>
                <span>{m.label}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

'''
c2 = content.count(CARD_ANCHOR)
print(f'2. Card anchor: {c2}')
if c2 == 1:
    content = content.replace(CARD_ANCHOR, MILESTONE_CARD + CARD_ANCHOR, 1)

with open('src/pages/Insights.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
