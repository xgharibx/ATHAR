"""Phase 56c: Add role=list to Quran.tsx surah list container and CustomAdhkar packs list."""
import pathlib

root = pathlib.Path(r"c:\Users\Amrab\Downloads\noor-adhkar")

# --- Quran.tsx ---
f = root / "src/pages/Quran.tsx"
src = f.read_text(encoding="utf-8")

old_quran = '          {/* ── Surah list — clean full-width rows ─────────────── */}\n          <div>'
new_quran = '          {/* ── Surah list — clean full-width rows ─────────────── */}\n          <div role="list" aria-label="قائمة السور">'

if old_quran in src:
    src = src.replace(old_quran, new_quran, 1)
    print("  patched Quran.tsx surah list role=list")
else:
    print("SKIP: Quran.tsx surah list pattern not found")

f.write_text(src, encoding="utf-8")

# --- CustomAdhkar.tsx ---
f2 = root / "src/pages/CustomAdhkar.tsx"
src2 = f2.read_text(encoding="utf-8")

# Wrap the customPacks.map in a container with role="list"
old_packs = '      {customPacks.map((pack) =>\n        editingPack?.id === pack.id && showForm ? null : (\n          <PackCard\n            key={pack.id}\n            pack={pack}\n            onNavigate={() => navigate(`/c/${pack.id}`)}\n            onDelete={() => deleteCustomPack(pack.id)}\n            onEdit={() => handleEdit(pack)}\n          />\n        ),\n      )}'
new_packs = '      <div role="list" aria-label="الحزمات المخصصة" className="space-y-3">\n        {customPacks.map((pack) =>\n          editingPack?.id === pack.id && showForm ? null : (\n            <div key={pack.id} role="listitem">\n              <PackCard\n                pack={pack}\n                onNavigate={() => navigate(`/c/${pack.id}`)}\n                onDelete={() => deleteCustomPack(pack.id)}\n                onEdit={() => handleEdit(pack)}\n              />\n            </div>\n          ),\n        )}\n      </div>'

if old_packs in src2:
    src2 = src2.replace(old_packs, new_packs, 1)
    print("  patched CustomAdhkar.tsx packs role=list")
else:
    print("SKIP: CustomAdhkar.tsx packs pattern not found")

f2.write_text(src2, encoding="utf-8")
print("DONE")
