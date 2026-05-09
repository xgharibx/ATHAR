"""Add useScrollRestoration hook to pages that are missing it."""
import os

ROOT = r"C:\Users\Amrab\Downloads\noor-adhkar\src\pages"

FIXES = [
    # ProphetStories.tsx: insert import + hook
    {
        "file": "ProphetStories.tsx",
        "import_after": 'import toast from "react-hot-toast";\n',
        "import_line": 'import { useScrollRestoration } from "@/hooks/useScrollRestoration";\n',
        "hook_after": 'export function ProphetStoriesPage() {\n  const navigate = useNavigate();\n',
        "hook_line": '  useScrollRestoration();\n',
    },
    # PrayerGuide.tsx: insert import + hook
    {
        "file": "PrayerGuide.tsx",
        "import_after": 'import { PRAYER_STEPS } from "@/data/prayerGuide";\n',
        "import_line": 'import { useScrollRestoration } from "@/hooks/useScrollRestoration";\n',
        "hook_after": 'export function PrayerGuidePage() {\n  const navigate = useNavigate();\n  const [expandedId, setExpandedId] = React.useState<number | null>(1);\n',
        "hook_line": '  useScrollRestoration();\n',
    },
    # WuduGuide.tsx: insert import + hook
    {
        "file": "WuduGuide.tsx",
        "import_after": 'import { WUDU_STEPS } from "@/data/wuduGuide";\n',
        "import_line": 'import { useScrollRestoration } from "@/hooks/useScrollRestoration";\n',
        "hook_after": 'export function WuduGuidePage() {\n  const navigate = useNavigate();\n  const [done, setDone] = React.useState<Set<number>>(new Set());\n',
        "hook_line": '  useScrollRestoration();\n',
    },
    # Ruqyah.tsx: insert import + hook
    {
        "file": "Ruqyah.tsx",
        "import_after": 'import { cn } from "@/lib/utils";\n',
        "import_line": 'import { useScrollRestoration } from "@/hooks/useScrollRestoration";\n',
        "hook_after": 'export function RuqyahPage() {\n  const navigate = useNavigate();\n',
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
            print(f"  {fix['file']}: import_after not found! -> {repr(fix['import_after'][:50])}")
    else:
        print(f"  {fix['file']}: import already present")

    # Add hook call after specified function opening lines
    if fix["hook_after"] + fix["hook_line"] not in content:
        if fix["hook_after"] in content:
            content = content.replace(
                fix["hook_after"],
                fix["hook_after"] + fix["hook_line"]
            )
            changed = True
            print(f"  {fix['file']}: added hook call")
        else:
            print(f"  {fix['file']}: hook_after not found! -> {repr(fix['hook_after'][:50])}")
    else:
        print(f"  {fix['file']}: hook already present")

    if changed:
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  {fix['file']}: SAVED")
    print()

print("Done!")
