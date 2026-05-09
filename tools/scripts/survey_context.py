import sys, os
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
base = r'c:\Users\Amrab\Downloads\noor-adhkar'

lines_to_show = {
    'src/pages/HadithBooks.tsx': [142,143,144,145,146,147,148,149,150,151,156,157,158,159,160,161,322,323,324,325,326,327,369,370,371,372,373,374,375,376,377,378,379,380],
    'src/components/layout/CommandPalette.tsx': [215,216,217,218,219,220, 248,249,250,251,252,253,254, 260,261,262,263,264,265, 267,268,269,270,271,272],
    'src/pages/Ruqyah.tsx': [147,148,149,150,151, 169,170,171,172,173,174,175,176,177],
    'src/pages/Quran.tsx': [614,615,616,617,618,619,620, 655,656,657,658,659,660,661, 783,784,785,786,787,788],
    'src/pages/CustomAdhkar.tsx': [113,114,115,116,117,118, 158,159,160,161,162,163,164, 204,205,206,207,208,209, 265,266,267,268,269,270, 285,286,287,288,289,290],
    'src/components/layout/AppShell.tsx': [225,226,227,228,229,230, 287,288,289,290,291,292, 474,475,476,477,478,479,480, 502,503,504,505,506,507,508, 527,528,529,530,531,532,533],
    'src/pages/Sources.tsx': [82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108, 141,142,143,144,145,146,147],
    'src/pages/Mushaf.tsx': [2203,2204,2205,2206,2207,2208,2209,2210,2211,2212,2213],
}

for path_rel, lns in lines_to_show.items():
    path = os.path.join(base, path_rel)
    print(f'=== {path_rel.split("/")[-1]} ===')
    with open(path, encoding='utf-8') as f:
        all_lines = f.readlines()
    for ln in lns:
        if ln-1 < len(all_lines):
            print(f'{ln}: {repr(all_lines[ln-1].rstrip())}')
    print()
