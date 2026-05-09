import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'
files = {
    'src/pages/Insights.tsx': [1327,1328,1329,1330,1331,1332, 1335,1336,1337,1338,1339, 1349,1350,1351,1352,1353,1354, 1366,1367,1368,1369,1370],
    'src/components/video/YouTubeCoursePlayer.tsx': [263,264,265,266,267,268, 304,305,306,307,308, 348,349,350,351,352, 393,394,395,396,397, 427,428,429,430,431,432,433, 438,439,440,441,442,443, 449,450,451,452,453],
    'src/pages/HadithBookView.tsx': [115,116,117,118,119,120,121,122, 228,229,230,231,232,233,234,235,236,237,238,239,240,241],
    'src/pages/Home.tsx': [166,167,168,169,170,171,172],
}
for path_rel, lns in files.items():
    path = os.path.join(base, path_rel)
    name = path_rel.split('/')[-1]
    print(f'=== {name} ===')
    with open(path, encoding='utf-8') as f:
        all_lines = f.readlines()
    for ln in lns:
        if ln-1 < len(all_lines):
            print(f'{ln}: {repr(all_lines[ln-1].rstrip())}')
    print()
