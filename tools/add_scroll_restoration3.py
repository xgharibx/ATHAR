"""Add useScrollRestoration to Quran, Search, QuranPlans, VideoLibrary pages."""
import os

ROOT = r"C:\Users\Amrab\Downloads\noor-adhkar\src\pages"

FIXES = [
    {
        "file": "Quran.tsx",
        "import_after": 'import { QURAN_RECITERS } from "@/lib/quranReciters";\n',
        "import_line": 'import { useScrollRestoration } from "@/hooks/useScrollRestoration";\n',
        "hook_after": 'export function QuranPage() {\n  const navigate = useNavigate();\n',
        "hook_line": '  useScrollRestoration();\n',
    },
    {
        "file": "Search.tsx",
        "import_after": 'import { useHadithPack } from "@/data/useHadithBook";\n',
        "import_line": 'import { useScrollRestoration } from "@/hooks/useScrollRestoration";\n',
        "hook_after": '  const navigate = useNavigate();\n  const [q, setQ] = React.useState("");\n',
        "hook_line": '  useScrollRestoration();\n',
    },
    {
        "file": "QuranPlans.tsx",
        "import_after": 'import toast from "react-hot-toast";\n',
        "import_line": 'import { useScrollRestoration } from "@/hooks/useScrollRestoration";\n',
        "hook_after": 'export function QuranPlansPage() {\n  const navigate = useNavigate();\n',
        "hook_line": '  useScrollRestoration();\n',
    },
    {
        "file": "VideoLibrary.tsx",
        "import_after": 'import { useNoorStore } from "@/store/noorStore";\n',
        "import_line": 'import { useScrollRestoration } from "@/hooks/useScrollRestoration";\n',
        "hook_after": 'export function VideoLibraryPage() {\n  const navigate = useNavigate();\n',
        "hook_line": '  useScrollRestoration();\n',
    },
]

for fix in FIXES:
    path = os.path.join(ROOT, fix["file"])
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    changed = False

    # Add import after specified line
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

    # Add hook call
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
