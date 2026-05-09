$path = "c:\Users\Amrab\Downloads\noor-adhkar\src\store\noorStore.ts"
$c = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

Write-Host "File size: $($c.Length)"
Write-Host "Has setSebhaTarget: $($c.Contains('setSebhaTarget'))"

# ─── Fix 1: Add sebhaTarget/setSebhaTarget to NoorState type ────────────────
$old1 = @"
  // Sebha custom dhikr
  sebhaCustom: { phrase: string; target: number } | null;
  setSebhaCustom: (v: { phrase: string; target: number } | null) => void;

  // Prayer log (P9)
"@

$new1 = @"
  // Sebha custom dhikr
  sebhaCustom: { phrase: string; target: number } | null;
  setSebhaCustom: (v: { phrase: string; target: number } | null) => void;

  // Sebha persisted preferences
  sebhaTarget: number;
  setSebhaTarget: (t: number) => void;
  sebhaSelected: string;
  setSebhaSelected: (k: string) => void;

  // Prayer log (P9)
"@

if ($c.Contains($old1)) {
    $c = $c.Replace($old1, $new1)
    Write-Host "Fix 1 applied: NoorState type"
} else {
    Write-Host "Fix 1 SKIPPED: pattern not found (may already be applied)"
}

# ─── Fix 2: Add implementation ──────────────────────────────────────────────
$old2 = @"
      sebhaCustom: null,
      setSebhaCustom: (v) => set({ sebhaCustom: v }),

      prayerLog: {},
"@

$new2 = @"
      sebhaCustom: null,
      setSebhaCustom: (v) => set({ sebhaCustom: v }),

      sebhaTarget: 100,
      setSebhaTarget: (t) => set({ sebhaTarget: t }),
      sebhaSelected: "subhanallah",
      setSebhaSelected: (k) => set({ sebhaSelected: k }),

      prayerLog: {},
"@

if ($c.Contains($old2)) {
    $c = $c.Replace($old2, $new2)
    Write-Host "Fix 2 applied: implementation"
} else {
    Write-Host "Fix 2 SKIPPED: pattern not found (may already be applied)"
}

# ─── Fix 3: Bump version 26 → 27 ────────────────────────────────────────────
$old3 = "      version: 26,"
$new3 = "      version: 27,"

if ($c.Contains($old3)) {
    $c = $c.Replace($old3, $new3)
    Write-Host "Fix 3 applied: version 26->27"
} else {
    Write-Host "Fix 3 SKIPPED: already at 27 or not found"
}

# ─── Fix 4: Add sebhaTarget/sebhaSelected to migrate ────────────────────────
$old4 = @"
          sebhaCustom: (state as Partial<NoorState>).sebhaCustom ?? null,
          // hadith user-state fields are NOT in persist
"@

$new4 = @"
          sebhaCustom: (state as Partial<NoorState>).sebhaCustom ?? null,
          sebhaTarget: (state as Partial<NoorState>).sebhaTarget ?? 100,
          sebhaSelected: (state as Partial<NoorState>).sebhaSelected ?? "subhanallah",
          // hadith user-state fields are NOT in persist
"@

if ($c.Contains($old4)) {
    $c = $c.Replace($old4, $new4)
    Write-Host "Fix 4 applied: migrate defaults"
} else {
    Write-Host "Fix 4 SKIPPED: pattern not found (may already be applied)"
}

# ─── Write back ─────────────────────────────────────────────────────────────
[System.IO.File]::WriteAllText($path, $c, [System.Text.Encoding]::UTF8)
Write-Host "Done. New file size: $($c.Length)"
Write-Host "setSebhaTarget now present: $($c.Contains('setSebhaTarget'))"
