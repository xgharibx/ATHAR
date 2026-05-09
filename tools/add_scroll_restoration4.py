"""Add useScrollRestoration to QuranVocab, Category, Leaderboard pages."""
import os

ROOT = r"C:\Users\Amrab\Downloads\noor-adhkar\src\pages"

FIXES = [
    # QuranVocab.tsx
    {
        "file": "QuranVocab.tsx",
        "import_after": 'import { QURAN_RECITERS } from "@/lib/quranReciters";\n',
        "import_line": 'import { useScrollRestoration } from "@/hooks/useScrollRestoration";\n',
        "hook_after": 'export function QuranVocabPage() {\n  const navigate = useNavigate();\n',
        "hook_line": '  useScrollRestoration();\n',
    },
    # Category.tsx
    {
        "file": "Category.tsx",
        "import_after": 'import { coerceCount, type DhikrItem } from "@/data/types";\n',
        "import_line": 'import { useScrollRestoration } from "@/hooks/useScrollRestoration";\n',
        "hook_after": 'export function CategoryPage() {\n  const navigate = useNavigate();\n',
        "hook_line": '  useScrollRestoration();\n',
    },
    # Leaderboard.tsx - no navigate, insert after data hook
    {
        "file": "Leaderboard.tsx",
        "import_after": '} from "@/lib/leaderboard";\n',
        "import_line": 'import { useScrollRestoration } from "@/hooks/useScrollRestoration";\n',
        "hook_after": 'export function LeaderboardPage() {\n  const { data } = useAdhkarDB();\n',
        "hook_line": '  useScrollRestoration();\n',
    },
]

for fix in FIXES:
    path = os.path.join(ROOT, fix["file"])
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    changed = False

    if fix["import_line"] not in content:
        if fix["import_after"] in content:
            content = content.replace(
                fix["import_after"],
                fix["import_after"] + fix["import_line"]
            )
            changed = True
            print(f"  {fix['file']}: added import")
        else:
            print(f"  {fix['file']}: import_after NOT FOUND: {repr(fix['import_after'][:60])}")
    else:
        print(f"  {fix['file']}: import already present")

    if fix["hook_after"] + fix["hook_line"] not in content:
        if fix["hook_after"] in content:
            content = content.replace(
                fix["hook_after"],
                fix["hook_after"] + fix["hook_line"]
            )
            changed = True
            print(f"  {fix['file']}: added hook call")
        else:
            print(f"  {fix['file']}: hook_after NOT FOUND: {repr(fix['hook_after'][:60])}")
    else:
        print(f"  {fix['file']}: hook already present")

    if changed:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  {fix['file']}: SAVED")
    print()

print("Done!")
