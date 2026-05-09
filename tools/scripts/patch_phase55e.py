"""Phase 55e: Sources packs role=list + additional list semantics cleanup."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")

# ── Sources.tsx ───────────────────────────────────────────────────────────────
f = root / "src/pages/Sources.tsx"
src = f.read_text(encoding="utf-8")

old1 = '''          <div className="mt-4 space-y-2">
            {packs.map((p) => (
              <div
                key={p.packId}
                className="glass rounded-3xl p-4 border border-[var(--stroke)] flex items-center justify-between gap-3"
              >'''

new1 = '''          <div className="mt-4 space-y-2" role="list" aria-label="الحزم المستوردة">
            {packs.map((p) => (
              <div
                key={p.packId}
                role="listitem"
                className="glass rounded-3xl p-4 border border-[var(--stroke)] flex items-center justify-between gap-3"
              >'''

if old1 in src:
    src = src.replace(old1, new1, 1)
    print("  patched Sources packs role=list+listitem")
else:
    print("SKIP1: Sources packs pattern not found")

f.write_text(src, encoding="utf-8")
print("PATCHED Sources.tsx")

# ── Library.tsx LibraryEntryCard - ArrowUpRight aria-hidden ──────────────────
f2 = root / "src/pages/Library.tsx"
src2 = f2.read_text(encoding="utf-8")

old2 = '        <ArrowUpRight size={17} className="opacity-45 shrink-0 mt-1" />'
new2 = '        <ArrowUpRight size={17} className="opacity-45 shrink-0 mt-1" aria-hidden="true" />'

if old2 in src2:
    src2 = src2.replace(old2, new2, 1)
    print("  patched Library ArrowUpRight aria-hidden")
else:
    print("SKIP2: Library ArrowUpRight not found")

f2.write_text(src2, encoding="utf-8")
print("PATCHED Library.tsx")
