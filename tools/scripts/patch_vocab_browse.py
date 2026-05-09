#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Add browse/list mode to QuranVocab.tsx."""

import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/QuranVocab.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

print(f'File size: {len(content)} bytes')

# 1. Add List to imports
old_import = 'import { ArrowRight, Shuffle, RotateCcw, CheckCircle2, BookOpen, Share2, Copy, Star } from "lucide-react";'
new_import = 'import { ArrowRight, Shuffle, RotateCcw, CheckCircle2, BookOpen, Share2, Copy, Star, List, CreditCard } from "lucide-react";'
if old_import in content:
    content = content.replace(old_import, new_import, 1)
    print('Import updated')
else:
    print('Import not found')

# 2. Add browseMode state after the reviewMode state
old_state = '  const [reviewMode, setReviewMode] = React.useState(false);'
new_state = '  const [reviewMode, setReviewMode] = React.useState(false);\n  const [browseMode, setBrowseMode] = React.useState(false);'
if old_state in content:
    content = content.replace(old_state, new_state, 1)
    print('State added')
else:
    print('State not found')

# 3. Add browse toggle button in header action row (after the Star/daily-word button closing)
old_action_end = '''              )}
            </div>
          </div>
        </Card>
      </div>'''
new_action_end = '''              )}
              <button type="button"
                onClick={() => setBrowseMode((v) => !v)}
                className="p-2 rounded-xl transition-colors mr-auto"
                style={{
                  background: browseMode ? "color-mix(in srgb, #0ea5e9 15%, transparent)" : "var(--card)",
                  color: browseMode ? "#0ea5e9" : "var(--fg)",
                  border: browseMode ? "1px solid rgba(14,165,233,0.35)" : "1px solid transparent",
                }}
                aria-label="\u062a\u0635\u0641\u062d \u0627\u0644\u0642\u0627\u0626\u0645\u0629"
                aria-pressed={browseMode}
                title="\u0639\u0631\u0636 \u062c\u0645\u064a\u0639 \u0627\u0644\u0643\u0644\u0645\u0627\u062a"
              >
                {browseMode ? <CreditCard size={16} aria-hidden="true" /> : <List size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </Card>
      </div>'''

if old_action_end in content:
    content = content.replace(old_action_end, new_action_end, 1)
    print('Browse button added')
else:
    print('Action end not found, searching...')
    idx = content.find('</div>\n          </div>\n        </Card>\n      </div>')
    print(f'Alternative found at {idx}')

# 4. Wrap the flashcard section with a conditional
# Replace: "      {/* Flashcard */}"
# With a conditional block that either shows the browse list or the flashcard
old_flashcard_start = '      {/* Flashcard */}'
new_flashcard_start = '''      {/* Browse list mode */}
      {browseMode && (
        <div className="px-4 pt-4 pb-32 space-y-2">
          {QURAN_VOCAB.map((word) => (
            <button
              key={word.id}
              type="button"
              onClick={() => {
                const idx = deck.findIndex((w) => w.id === word.id);
                if (idx >= 0) {
                  setCardIndex(idx);
                  setFlipped(false);
                  setReviewMode(false);
                }
                setBrowseMode(false);
              }}
              className="w-full flex items-center gap-3 rounded-2xl p-3.5 text-right transition-all active:scale-[0.99]"
              style={{ background: "var(--card)", border: `1px solid ${learned.has(word.id) ? "color-mix(in srgb, var(--ok) 30%, transparent)" : "var(--stroke)"}` }}
              aria-label={`\u0627\u0644\u0627\u0646\u062a\u0642\u0627\u0644 \u0625\u0644\u0649 \u0643\u0644\u0645\u0629 ${word.arabic}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base font-bold" style={{ fontFamily: "var(--font-arabic, inherit)", color: word.id === dailyWordId ? "var(--accent)" : "var(--fg)" }}>{word.arabic}</span>
                  {word.id === dailyWordId && <Star size={10} style={{ color: "var(--accent)", flexShrink: 0 }} />}
                  {learned.has(word.id) && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "color-mix(in srgb, var(--ok) 18%, transparent)", color: "var(--ok)" }}>\u2713</span>}
                </div>
                <p className="text-xs opacity-60 line-clamp-1 text-right">{word.meaning.split('\u2014').slice(-1)[0]?.trim() ?? word.meaning}</p>
              </div>
              <span className="text-[10px] opacity-35 tabular-nums shrink-0">{word.frequency.toLocaleString("ar-EG")}\u00d7</span>
            </button>
          ))}
        </div>
      )}
      {/* Flashcard */}
      {!browseMode && ('''
if old_flashcard_start in content:
    content = content.replace(old_flashcard_start, new_flashcard_start, 1)
    print('Flashcard section wrapped')
else:
    print('Flashcard section not found')

# 5. Close the new conditional — find the end of the flashcard section
# The page ends with:   );
# which closes the return. We need to wrap the flashcard content in {!browseMode && (...)}
# Find the last return statement closing
# Since we added {!browseMode && ( before the flashcard section,
# we need to add )} before the last </div> </div> )
# The original structure ends with:
#       </div>
#     </div>
#   );
# We need to add )} before the last </div>

# Find the original ending
old_ending = '      </div>\n    </div>\n  );\n}'
new_ending = '      </div>\n    )}\n    </div>\n  );\n}'
if old_ending in content:
    # Count how many times it appears
    ct = content.count(old_ending)
    print(f'Ending pattern found {ct} times')
    content = content.replace(old_ending, new_ending, 1)
    print('Ending updated')
else:
    print('Ending not found')
    # Try to find similar
    idx = content.rfind('      </div>\n    </div>')
    print(f'Alternative ending at {idx}')

with open('src/pages/QuranVocab.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
