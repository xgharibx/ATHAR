import os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
path = os.path.join(WORKSPACE, 'src', 'pages', 'Search.tsx')

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

orig_len = len(content)
changes = 0

# ============================
# LIST 1: Adhkar results (simple block map)
# results.map((r) => { return ( <button type="button" key={r.key} ...>
# ============================
old1a = (
    '              return (\n'
    '                <button type="button"\n'
    '                  key={r.key}\n'
    '                  onClick={() => navigate(`/c/${r.sectionId}?focus=${r.index}`)}\n'
)
new1a = (
    '              return (\n'
    '                <div key={r.key} role="listitem">\n'
    '                <button type="button"\n'
    '                  onClick={() => navigate(`/c/${r.sectionId}?focus=${r.index}`)}\n'
)
if old1a in content:
    content = content.replace(old1a, new1a, 1)
    changes += 1
    print('Search change 1a: adhkar button open PATCHED')
else:
    print('Search change 1a: NOT FOUND')

# Close after the adhkar button
old1b = (
    '                </button>\n'
    '              );\n'
    '            })}\n'
    '          </div>\n'
    '        )}\n'
    '      </Card>\n'
    '      )}\n'
    '\n'
    '      {/* \u2500\u2500 Quran results'
)
new1b = (
    '                </button>\n'
    '                </div>\n'
    '              );\n'
    '            })}\n'
    '          </div>\n'
    '        )}\n'
    '      </Card>\n'
    '      )}\n'
    '\n'
    '      {/* \u2500\u2500 Quran results'
)
if old1b in content:
    content = content.replace(old1b, new1b, 1)
    changes += 1
    print('Search change 1b: adhkar button close PATCHED')
else:
    print('Search change 1b: NOT FOUND')
    # debug
    idx = content.find('adhkar button open')
    idx2 = content.find('Quran results')
    if idx2 >= 0:
        print('Quran results context:', repr(content[idx2-200:idx2+20]))

# ============================
# LIST 2: Quran results (ternary map)
# quranResults.map((r, idx) => r.type === "surah" ? (<button key={...}>) : (<button key={...}>))
# Change to block-style with wrapper div
# ============================
old2a = (
    '            {quranResults.map((r, idx) =>\n'
    '              r.type === "surah" ? (\n'
    '                <button type="button"\n'
    '                  key={`s-${r.surah.id}`}\n'
    '                  onClick={() => navigate(`/quran/${r.surah.id}`)}\n'
)
new2a = (
    '            {quranResults.map((r, idx) => {\n'
    '              const _qKey = r.type === "surah" ? `s-${r.surah.id}` : `a-${r.surah.id}-${r.ayahIndex}-${idx}`;\n'
    '              return (\n'
    '                <div key={_qKey} role="listitem">\n'
    '              {r.type === "surah" ? (\n'
    '                <button type="button"\n'
    '                  onClick={() => navigate(`/quran/${r.surah.id}`)}\n'
)
if old2a in content:
    content = content.replace(old2a, new2a, 1)
    changes += 1
    print('Search change 2a: quran open PATCHED')
else:
    print('Search change 2a: NOT FOUND')

# Remove key from the ayah branch button
old2b = (
    '              ) : (\n'
    '                <button type="button"\n'
    '                  key={`a-${r.surah.id}-${r.ayahIndex}-${idx}`}\n'
    '                  onClick={() => navigate(`/quran/${r.surah.id}?a=${r.ayahIndex}`)}\n'
)
new2b = (
    '              ) : (\n'
    '                <button type="button"\n'
    '                  onClick={() => navigate(`/quran/${r.surah.id}?a=${r.ayahIndex}`)}\n'
)
if old2b in content:
    content = content.replace(old2b, new2b, 1)
    changes += 1
    print('Search change 2b: quran ayah key removed PATCHED')
else:
    print('Search change 2b: NOT FOUND')

# Close the quran map — original ends with ")\n            )}\n          </div>"
old2c = (
    '                </button>\n'
    '              )\n'
    '            )}\n'
    '          </div>\n'
    '        )}\n'
    '      </Card>\n'
    '      )}\n'
    '\n'
    '      {/* \u2500\u2500 Library results'
)
new2c = (
    '                </button>\n'
    '              )}\n'
    '                </div>\n'
    '              );\n'
    '            })}\n'
    '          </div>\n'
    '        )}\n'
    '      </Card>\n'
    '      )}\n'
    '\n'
    '      {/* \u2500\u2500 Library results'
)
if old2c in content:
    content = content.replace(old2c, new2c, 1)
    changes += 1
    print('Search change 2c: quran close PATCHED')
else:
    print('Search change 2c: NOT FOUND')

# ============================
# LIST 3: Library results (arrow map with parentheses)
# libraryResults.map((entry) => ( <button type="button" key={entry.key} ...>
# ============================
old3a = (
    '            {libraryResults.map((entry) => (\n'
    '              <button type="button"\n'
    '                key={entry.key}\n'
    '                onClick={() => navigate(`/library/${entry.collectionId}/${entry.id}`)}\n'
)
new3a = (
    '            {libraryResults.map((entry) => (\n'
    '              <div key={entry.key} role="listitem">\n'
    '              <button type="button"\n'
    '                onClick={() => navigate(`/library/${entry.collectionId}/${entry.id}`)}\n'
)
if old3a in content:
    content = content.replace(old3a, new3a, 1)
    changes += 1
    print('Search change 3a: library button open PATCHED')
else:
    print('Search change 3a: NOT FOUND')

# Close library button — original: "</button>\n            ))}\n"
old3b = (
    '              </button>\n'
    '            ))}\n'
    '          </div>\n'
    '        )}\n'
    '      </Card>\n'
    '      )}\n'
    '\n'
    '      {/* \u2500\u2500 Hadith results'
)
new3b = (
    '              </button>\n'
    '              </div>\n'
    '            ))}\n'
    '          </div>\n'
    '        )}\n'
    '      </Card>\n'
    '      )}\n'
    '\n'
    '      {/* \u2500\u2500 Hadith results'
)
if old3b in content:
    content = content.replace(old3b, new3b, 1)
    changes += 1
    print('Search change 3b: library button close PATCHED')
else:
    print('Search change 3b: NOT FOUND')

# ============================
# LIST 4: Hadith results (block map)
# hadithResults.map((h) => { return ( <button type="button" key={h.n} ...>
# ============================
old4a = (
    '              return (\n'
    '                <button type="button"\n'
    '                  key={h.n}\n'
    '                  dir="rtl"\n'
    '                  onClick={() => navigate(`/hadith/${hadithBookKey}/${h.n}`)}\n'
)
new4a = (
    '              return (\n'
    '                <div key={h.n} role="listitem">\n'
    '                <button type="button"\n'
    '                  dir="rtl"\n'
    '                  onClick={() => navigate(`/hadith/${hadithBookKey}/${h.n}`)}\n'
)
if old4a in content:
    content = content.replace(old4a, new4a, 1)
    changes += 1
    print('Search change 4a: hadith button open PATCHED')
else:
    print('Search change 4a: NOT FOUND')

# Close hadith button — near end of file
old4b = (
    '                </button>\n'
    '              );\n'
    '            })}\n'
    '          </div>\n'
    '        )}\n'
    '      </Card>\n'
    '      )}\n'
    '    </div>\n'
    '  );\n'
    '}'
)
new4b = (
    '                </button>\n'
    '                </div>\n'
    '              );\n'
    '            })}\n'
    '          </div>\n'
    '        )}\n'
    '      </Card>\n'
    '      )}\n'
    '    </div>\n'
    '  );\n'
    '}'
)
if old4b in content:
    content = content.replace(old4b, new4b, 1)
    changes += 1
    print('Search change 4b: hadith button close PATCHED')
else:
    print('Search change 4b: NOT FOUND')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\nTotal changes: {changes}/8')
print(f'File size: {orig_len} -> {len(content)}')
