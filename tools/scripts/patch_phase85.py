"""Phase 85: aria-live on Leaderboard sync badge, aria-pressed on HadithMemo add button, fix Home loading"""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

changes = 0

# --- Leaderboard.tsx: add aria-live to syncState span ---
lb_path = os.path.join(WORKSPACE, 'src', 'pages', 'Leaderboard.tsx')
with open(lb_path, encoding='utf-8') as f:
    content = f.read()

old = '''          <span className={cn(
            "inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border",
            syncState === "ok"'''
new = '''          <span aria-live="polite" aria-atomic="true" className={cn(
            "inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border",
            syncState === "ok"'''
if old in content:
    content = content.replace(old, new, 1)
    print('OK: Leaderboard syncState span got aria-live')
    changes += 1
else:
    print('FAIL: Leaderboard syncState span not found')

with open(lb_path, 'w', encoding='utf-8') as f:
    f.write(content)

# --- HadithMemo.tsx: aria-pressed on add-to-deck button + aria-live on progress ---
memo_path = os.path.join(WORKSPACE, 'src', 'pages', 'HadithMemo.tsx')
with open(memo_path, encoding='utf-8') as f:
    content = f.read()

# Add aria-live to progress "X / Y" span
old2 = '          <div className="flex items-center justify-between mb-1">\n            <span className="text-xs text-[var(--muted)] font-arabic">\n              {cardIndex + 1} / {currentCards.length}\n            </span>'
new2 = '          <div className="flex items-center justify-between mb-1">\n            <span className="text-xs text-[var(--muted)] font-arabic" aria-live="polite" aria-atomic="true">\n              {cardIndex + 1} / {currentCards.length}\n            </span>'
if old2 in content:
    content = content.replace(old2, new2, 1)
    print('OK: HadithMemo progress counter got aria-live')
    changes += 1
else:
    print('FAIL: HadithMemo progress counter not found')

# Add aria-pressed + aria-label to add-to-deck button
old3 = '''          {viewMode === "add" && (
            <button type="button"
              onClick={() => cardKey && addHadithMemoCard(cardKey)}
              className="w-full rounded-2xl py-2.5 text-sm font-arabic transition glass-hover press-effect"'''
new3 = '''          {viewMode === "add" && (
            <button type="button"
              onClick={() => cardKey && addHadithMemoCard(cardKey)}
              aria-pressed={isAdded}
              aria-label={isAdded ? "\u0625\u0644\u063a\u0627\u0621 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u062d\u062f\u064a\u062b \u0644\u0644\u062d\u0641\u0638" : "\u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u062d\u062f\u064a\u062b \u0644\u0644\u062d\u0641\u0638"}
              className="w-full rounded-2xl py-2.5 text-sm font-arabic transition glass-hover press-effect"'''
if old3 in content:
    content = content.replace(old3, new3, 1)
    print('OK: HadithMemo add-to-deck button got aria-pressed + aria-label')
    changes += 1
else:
    print('FAIL: HadithMemo add-to-deck button not found')

with open(memo_path, 'w', encoding='utf-8') as f:
    f.write(content)

# --- Home.tsx: role=status on quran loading text ---
home_path = os.path.join(WORKSPACE, 'src', 'pages', 'Home.tsx')
with open(home_path, encoding='utf-8') as f:
    content = f.read()

old4 = '              {quran.isLoading ? (\n                <div className="mt-4 text-sm opacity-65">... \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0648\u0631\u062f</div>'
new4 = '              {quran.isLoading ? (\n                <div className="mt-4 text-sm opacity-65" role="status" aria-live="polite">\u062c\u0627\u0631\u064d \u062a\u062d\u0645\u064a\u0644 \u0648\u0631\u062f \u0627\u0644\u064a\u0648\u0645\u2026</div>'
if old4 in content:
    content = content.replace(old4, new4, 1)
    print('OK: Home.tsx quran loading div got role=status + aria-live')
    changes += 1
else:
    print('FAIL: Home.tsx quran loading div not found')

with open(home_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nTotal changes: {changes}')
