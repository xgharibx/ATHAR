"""Phase 61b — aria-hidden on DhikrCard, DhikrList, Sebha, Leaderboard icons."""
import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

BASE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def patch_file(rel_path, patches):
    path = os.path.join(BASE, rel_path)
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    ok = 0
    fail = 0
    for old, new, label in patches:
        if old in content:
            content = content.replace(old, new)
            print(f'  OK  [{label}]')
            ok += 1
        else:
            print(f'  MISS[{label}]')
            fail += 1
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    return ok, fail

# ── DhikrCard.tsx ───────────────────────────────────────────────────────────
print('=== DhikrCard.tsx ===')
ok1, f1 = patch_file('src/components/dhikr/DhikrCard.tsx', [
    ('<Copy size={16} className="opacity-80" />',
     '<Copy size={16} aria-hidden="true" className="opacity-80" />',
     'Copy size 16'),
    ('<Share2 size={16} className="opacity-80" />',
     '<Share2 size={16} aria-hidden="true" className="opacity-80" />',
     'Share2 size 16'),
    ('<ImageDown size={16} className="opacity-80" />',
     '<ImageDown size={16} aria-hidden="true" className="opacity-80" />',
     'ImageDown size 16'),
    ('<ZoomOut size={14} className="opacity-80" />',
     '<ZoomOut size={14} aria-hidden="true" className="opacity-80" />',
     'ZoomOut size 14'),
    ('<ZoomIn size={14} className="opacity-80" />',
     '<ZoomIn size={14} aria-hidden="true" className="opacity-80" />',
     'ZoomIn size 14'),
    ('<Heart size={16} className={cn(fav ? "text-[var(--accent)]" : "opacity-80")} />',
     '<Heart size={16} aria-hidden="true" className={cn(fav ? "text-[var(--accent)]" : "opacity-80")} />',
     'Heart size 16'),
    ('<ExternalLink size={16} className="opacity-80" />',
     '<ExternalLink size={16} aria-hidden="true" className="opacity-80" />',
     'ExternalLink size 16'),
    ('<BookOpen size={11} />\n                أقل القليل',
     '<BookOpen size={11} aria-hidden="true" />\n                أقل القليل',
     'BookOpen size 11 badge'),
    ('<BookOpen size={12} />\n            <span>{sourceLabel}</span>',
     '<BookOpen size={12} aria-hidden="true" />\n            <span>{sourceLabel}</span>',
     'BookOpen size 12 source'),
    ('<ExternalLink size={12} />\n            <span>{sourceLabel}</span>',
     '<ExternalLink size={12} aria-hidden="true" />\n            <span>{sourceLabel}</span>',
     'ExternalLink size 12 source link'),
    ('<Minus size={18} className="opacity-80" />',
     '<Minus size={18} aria-hidden="true" className="opacity-80" />',
     'Minus size 18'),
    ('<RotateCcw size={16} className="opacity-70" />',
     '<RotateCcw size={16} aria-hidden="true" className="opacity-70" />',
     'RotateCcw size 16'),
])

# ── DhikrList.tsx ────────────────────────────────────────────────────────────
print('\n=== DhikrList.tsx ===')
ok2, f2 = patch_file('src/components/dhikr/DhikrList.tsx', [
    # Plus in button with text "إضافة"
    ('<Button variant="primary" onClick={() => setAddOpen(true)}>\n                <Plus size={16} />\n                إضافة',
     '<Button variant="primary" onClick={() => setAddOpen(true)}>\n                <Plus size={16} aria-hidden="true" />\n                إضافة',
     'Plus add button (header)'),
    # Focus in aria-labeled button
    ('<Focus size={16} />',
     '<Focus size={16} aria-hidden="true" />',
     'Focus size 16'),
    # Square in aria-labeled stop button (inline with timer text)
    ('<Square size={14} />\n                  إيقاف',
     '<Square size={14} aria-hidden="true" />\n                  إيقاف',
     'Square size 14'),
    # MoreHorizontal in aria-labeled button
    ('<MoreHorizontal size={16} />',
     '<MoreHorizontal size={16} aria-hidden="true" />',
     'MoreHorizontal size 16'),
    # RotateCcw in "تأكيد التصفير" button with text
    ('<RotateCcw size={16} />\n                      تأكيد التصفير',
     '<RotateCcw size={16} aria-hidden="true" />\n                      تأكيد التصفير',
     'RotateCcw confirm reset'),
    # RotateCcw in "تصفير" button with text
    ('<RotateCcw size={16} />\n                    تصفير',
     '<RotateCcw size={16} aria-hidden="true" />\n                    تصفير',
     'RotateCcw reset'),
    # RotateCcw in aria-labeled icon button (reorder reset)
    ('<RotateCcw size={16} />\n                  </Button>',
     '<RotateCcw size={16} aria-hidden="true" />\n                  </Button>',
     'RotateCcw reorder reset'),
    # CheckCheck in "تأكيد الإكمال" button with text
    ('<CheckCheck size={16} />\n                      تأكيد الإكمال',
     '<CheckCheck size={16} aria-hidden="true" />\n                      تأكيد الإكمال',
     'CheckCheck confirm complete'),
    # CheckCheck in "إكمال" button with text
    ('<CheckCheck size={16} />\n                    إكمال',
     '<CheckCheck size={16} aria-hidden="true" />\n                    إكمال',
     'CheckCheck complete'),
    # Copy in "نسخ الكل" button with text
    ('<Copy size={16} />\n                  {copiedAll ? "تم ✓" : "نسخ الكل"}',
     '<Copy size={16} aria-hidden="true" />\n                  {copiedAll ? "تم ✓" : "نسخ الكل"}',
     'Copy copy all'),
    # List in aria-labeled button
    ('<List size={16} />\n                  </Button>',
     '<List size={16} aria-hidden="true" />\n                  </Button>',
     'List compact toggle'),
    # ArrowUpDown in "ترتيب" button with text
    ('<ArrowUpDown size={16} />\n                  ترتيب',
     '<ArrowUpDown size={16} aria-hidden="true" />\n                  ترتيب',
     'ArrowUpDown sort'),
    # Timer in aria-labeled button with text "تلقائي"
    ('<Timer size={14} />\n                      تلقائي',
     '<Timer size={14} aria-hidden="true" />\n                      تلقائي',
     'Timer auto read'),
    # ChevronsDown in aria-labeled button
    ('<ChevronsDown size={16} />',
     '<ChevronsDown size={16} aria-hidden="true" />',
     'ChevronsDown size 16'),
    # Lock inline with text span
    ('<Lock size={11} />',
     '<Lock size={11} aria-hidden="true" />',
     'Lock size 11'),
    # Plus in add button with text
    ('<Button className="mt-4" onClick={() => setAddOpen(true)}>\n                <Plus size={16} />\n                إضافة ذكر',
     '<Button className="mt-4" onClick={() => setAddOpen(true)}>\n                <Plus size={16} aria-hidden="true" />\n                إضافة ذكر',
     'Plus add dhikr'),
    # MoveUp/MoveDown in aria-labeled buttons
    ('<MoveUp size={15} />',
     '<MoveUp size={15} aria-hidden="true" />',
     'MoveUp size 15'),
    ('<MoveDown size={15} />',
     '<MoveDown size={15} aria-hidden="true" />',
     'MoveDown size 15'),
    # Plus FAB (aria-labeled button)
    ('<Plus size={22} />',
     '<Plus size={22} aria-hidden="true" />',
     'Plus FAB size 22'),
    # Plus in "حفظ الذكر" button with text
    ('<Button className="mt-4 w-full" onClick={addMyDhikr}>\n                <Plus size={16} />\n                حفظ الذكر',
     '<Button className="mt-4 w-full" onClick={addMyDhikr}>\n                <Plus size={16} aria-hidden="true" />\n                حفظ الذكر',
     'Plus save dhikr'),
    # ChevronRight/Left in prev/next section buttons (with text)
    ('<ChevronRight size={16} className="opacity-60 shrink-0" />',
     '<ChevronRight size={16} aria-hidden="true" className="opacity-60 shrink-0" />',
     'ChevronRight next section'),
    ('<ChevronLeft size={16} className="opacity-60 shrink-0" />',
     '<ChevronLeft size={16} aria-hidden="true" className="opacity-60 shrink-0" />',
     'ChevronLeft prev section'),
])

# ── Sebha.tsx ────────────────────────────────────────────────────────────────
print('\n=== Sebha.tsx ===')
ok3, f3 = patch_file('src/pages/Sebha.tsx', [
    # ArrowRight in aria-labeled back button
    ('<ArrowRight size={18} />\n            </IconButton>',
     '<ArrowRight size={18} aria-hidden="true" />\n            </IconButton>',
     'ArrowRight back button'),
    # Sparkles header inline with span
    ('<Sparkles size={15} className="text-[var(--accent)]" />\n                <span>سبحة ذكية</span>',
     '<Sparkles size={15} aria-hidden="true" className="text-[var(--accent)]" />\n                <span>سبحة ذكية</span>',
     'Sparkles header'),
    # Target inline with span
    ('<Target size={11} className="text-[var(--accent)] shrink-0" />',
     '<Target size={11} aria-hidden="true" className="text-[var(--accent)] shrink-0" />',
     'Target size 11'),
    # RotateCw in aria-labeled button
    ('<RotateCw size={17} />',
     '<RotateCw size={17} aria-hidden="true" />',
     'RotateCw size 17'),
    # History header inline with span
    ('<History size={15} className="text-[var(--accent)]" />',
     '<History size={15} aria-hidden="true" className="text-[var(--accent)]" />',
     'History size 15'),
    # Flag/CheckCircle2 in session log row
    ('<Flag size={12} className="text-[var(--accent)] shrink-0" />',
     '<Flag size={12} aria-hidden="true" className="text-[var(--accent)] shrink-0" />',
     'Flag size 12'),
    # RotateCw in "تصفير الحالي" button with text
    ('<RotateCw size={16} />\n              تصفير الحالي',
     '<RotateCw size={16} aria-hidden="true" />\n              تصفير الحالي',
     'RotateCw reset current'),
    # Timer/Target/CheckCircle2 in conditional status inline
    ('<><Timer size={17} className="text-[var(--accent)]" /><span>عد حر',
     '<><Timer size={17} aria-hidden="true" className="text-[var(--accent)]" /><span>عد حر',
     'Timer tally mode'),
    ('<><CheckCircle2 size={17} className="text-[var(--ok)]" />',
     '<><CheckCircle2 size={17} aria-hidden="true" className="text-[var(--ok)]" />',
     'CheckCircle2 completed'),
    ('<><Target size={17} className="text-[var(--accent)]" />',
     '<><Target size={17} aria-hidden="true" className="text-[var(--accent)]" />',
     'Target size 17'),
    # Pencil in aria-labeled span button
    ('<Pencil size={13} />\n                </span>',
     '<Pencil size={13} aria-hidden="true" />\n                </span>',
     'Pencil edit custom'),
    # Plus decorative (add custom dhikr card)
    ('<Plus size={20} className="opacity-40" />',
     '<Plus size={20} aria-hidden="true" className="opacity-40" />',
     'Plus add custom placeholder'),
    # Pencil header inline with span
    ('<Pencil size={15} className="text-[var(--accent)]" />\n            <span>ذكر مخصص</span>',
     '<Pencil size={15} aria-hidden="true" className="text-[var(--accent)]" />\n            <span>ذكر مخصص</span>',
     'Pencil custom dhikr header'),
])

# ── Leaderboard.tsx ──────────────────────────────────────────────────────────
print('\n=== Leaderboard.tsx ===')
ok4, f4 = patch_file('src/pages/Leaderboard.tsx', [
    # Trophy decorative in identity header
    ('<Trophy size={18} className="text-[var(--accent)]" />',
     '<Trophy size={18} aria-hidden="true" className="text-[var(--accent)]" />',
     'Trophy size 18'),
    # ShieldCheck inline with span
    ('<ShieldCheck size={14} className="text-[var(--accent)]" />',
     '<ShieldCheck size={14} aria-hidden="true" className="text-[var(--accent)]" />',
     'ShieldCheck size 14'),
    # Send conditional in sync button
    (': <Send size={16} />}',
     ': <Send size={16} aria-hidden="true" />}',
     'Send size 16'),
    # RotateCw in "تحديث" button with text
    ('<RotateCw size={16} className={boardLoadState === "loading" ? "animate-spin" : ""} />\n            تحديث',
     '<RotateCw size={16} aria-hidden="true" className={boardLoadState === "loading" ? "animate-spin" : ""} />\n            تحديث',
     'RotateCw refresh'),
    # Status indicator icons (inline after conditional)
    ('{syncState === "syncing" && <Loader2 size={10} className="animate-spin" />}',
     '{syncState === "syncing" && <Loader2 size={10} aria-hidden="true" className="animate-spin" />}',
     'Loader2 size 10'),
    ('{syncState === "ok" && <CheckCircle2 size={10} />}',
     '{syncState === "ok" && <CheckCircle2 size={10} aria-hidden="true" />}',
     'CheckCircle2 size 10'),
    ('{syncState === "error" && <AlertCircle size={10} />}',
     '{syncState === "error" && <AlertCircle size={10} aria-hidden="true" />}',
     'AlertCircle size 10'),
    ('{syncState === "cooldown" && <Clock size={10} />}',
     '{syncState === "cooldown" && <Clock size={10} aria-hidden="true" />}',
     'Clock size 10'),
    # ShieldCheck admin section header
    ('<ShieldCheck size={16} className="text-[var(--accent)]" />',
     '<ShieldCheck size={16} aria-hidden="true" className="text-[var(--accent)]" />',
     'ShieldCheck size 16'),
    # Loader2/RotateCw conditional in admin buttons
    ('{loadingSnapshot ? <Loader2 size={16} className="animate-spin" /> : <RotateCw size={16} />}\n                تحديث الإدارة',
     '{loadingSnapshot ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <RotateCw size={16} aria-hidden="true" />}\n                تحديث الإدارة',
     'Loader2/RotateCw admin refresh'),
    ('{loadingUser ? <Loader2 size={16} className="animate-spin" /> : <RotateCw size={16} />}\n                      تحميل الحالة',
     '{loadingUser ? <Loader2 size={16} aria-hidden="true" className="animate-spin" /> : <RotateCw size={16} aria-hidden="true" />}\n                      تحميل الحالة',
     'Loader2/RotateCw load user'),
    # Users section header
    ('<Users size={16} className="text-[var(--accent)]" />',
     '<Users size={16} aria-hidden="true" className="text-[var(--accent)]" />',
     'Users size 16'),
    # Check/Copy in aria-labeled button (conditional)
    ('{copied ? <Check size={14} /> : <Copy size={14} />}\n              </Button>',
     '{copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}\n              </Button>',
     'Check/Copy code button'),
    # Plus in "إضافة" button with text
    ('<Plus size={14} />\n                إضافة',
     '<Plus size={14} aria-hidden="true" />\n                إضافة',
     'Plus add friend'),
    # BookMarked section header
    ('<BookMarked size={16} className="text-[var(--accent)]" />',
     '<BookMarked size={16} aria-hidden="true" className="text-[var(--accent)]" />',
     'BookMarked size 16'),
    # Check/Copy in khatma share button (conditional)
    ('{copied ? <Check size={14} /> : <Copy size={14} />}\n              {copied ? "تم" : "كود المشاركة"}',
     '{copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}\n              {copied ? "تم" : "كود المشاركة"}',
     'Check/Copy khatma share'),
    # Check in juz cell button (conditional)
    ('{done ? <Check size={10} strokeWidth={3} style={{ color }} /> : juz.toLocaleString("ar-EG")}',
     '{done ? <Check size={10} aria-hidden="true" strokeWidth={3} style={{ color }} /> : juz.toLocaleString("ar-EG")}',
     'Check juz cell'),
    # Calendar challenge section header
    ('<Calendar size={15} className="text-[var(--accent)]" />',
     '<Calendar size={15} aria-hidden="true" className="text-[var(--accent)]" />',
     'Calendar size 15'),
    # Check in weekly challenge (conditional)
    (': <Check size={12} strokeWidth={3} style={{ color: "var(--ok)" }} />',
     ': <Check size={12} aria-hidden="true" strokeWidth={3} style={{ color: "var(--ok)" }} />',
     'Check challenge done'),
])

total_ok = ok1 + ok2 + ok3 + ok4
total_fail = f1 + f2 + f3 + f4
print(f'\nTotal: {total_ok} patched, {total_fail} missed')
