"""Phase 55a: Add <nav> landmarks to AppShell sidebar sections."""
import pathlib, sys

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")

# ── AppShell.tsx ─────────────────────────────────────────────────────────────
f = root / "src/components/layout/AppShell.tsx"
src = f.read_text(encoding="utf-8")

# 1. Wrap main nav links section with <nav>
old1 = '''      {/* Main navigation links */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-4 gap-2">'''

new1 = '''      {/* Main navigation links */}
      <nav aria-label="القائمة الرئيسية">
      <div className="px-4 py-3">
        <div className="grid grid-cols-4 gap-2">'''

if old1 not in src:
    print("SKIP1: main nav marker not found"); sys.exit(1)
src = src.replace(old1, new1, 1)

# Close the nav after the </div></div> pair at end of that block
# Looking at the structure: </div></div>  then <div className="h-px mx-5 ...">
old1_end = '''        </div>
      </div>

      <div className="h-px mx-5 bg-[var(--stroke)]" />

      {/* Sections list */}'''

new1_end = '''        </div>
      </div>
      </nav>

      <div className="h-px mx-5 bg-[var(--stroke)]" />

      {/* Sections list */}'''

if old1_end not in src:
    print("SKIP1end: closing div marker not found"); sys.exit(1)
src = src.replace(old1_end, new1_end, 1)

# 2. Wrap sections list with <nav>
old2 = '''      {/* Sections list */}
      <div className="px-3 pt-3 pb-2">
        <div className="px-2 mb-2 text-[11px] font-semibold opacity-45 uppercase tracking-wider">الأقسام</div>
      </div>
      <div
        className="flex-1 overflow-auto overscroll-contain px-3 pb-6 space-y-1 drawer-stagger"
        style={props.mobile ? undefined : { maxHeight: "calc(100dvh - 400px)" }}
      >
        {db.sections.map((s) => (
          <SidebarItem key={s.id} s={s} onNavigate={props.onNavigate} />
        ))}
      </div>
    </div>'''

new2 = '''      {/* Sections list */}
      <nav aria-label="أقسام الأذكار">
      <div className="px-3 pt-3 pb-2">
        <div className="px-2 mb-2 text-[11px] font-semibold opacity-45 uppercase tracking-wider">الأقسام</div>
      </div>
      <div
        className="flex-1 overflow-auto overscroll-contain px-3 pb-6 space-y-1 drawer-stagger"
        style={props.mobile ? undefined : { maxHeight: "calc(100dvh - 400px)" }}
      >
        {db.sections.map((s) => (
          <SidebarItem key={s.id} s={s} onNavigate={props.onNavigate} />
        ))}
      </div>
      </nav>
    </div>'''

if old2 not in src:
    print("SKIP2: sections list marker not found"); sys.exit(1)
src = src.replace(old2, new2, 1)

f.write_text(src, encoding="utf-8")
print("PATCHED AppShell.tsx with nav landmarks")
