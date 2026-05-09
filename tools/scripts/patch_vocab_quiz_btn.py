#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Add quiz button to header in QuranVocab."""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/pages/QuranVocab.tsx', 'r', encoding='utf-8', errors='surrogatepass') as f:
    content = f.read()

old_end = '''\
                {browseMode ? <CreditCard size={16} aria-hidden="true" /> : <List size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>
        </Card>'''

new_end = '''\
                {browseMode ? <CreditCard size={16} aria-hidden="true" /> : <List size={16} aria-hidden="true" />}
              </button>
                <button
                  type="button"
                  onClick={() => startQuiz(QURAN_VOCAB.map((w) => w.id))}
                  className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-95"
                  style={{
                    background: quizMode ? "color-mix(in srgb, #a78bfa 15%, transparent)" : "var(--card)",
                    color: quizMode ? "#a78bfa" : "var(--fg)",
                    border: quizMode ? "1px solid rgba(167,139,250,0.35)" : "1px solid transparent",
                  }}
                  aria-pressed={quizMode}
                  aria-label="\u0627\u062e\u062a\u0628\u0627\u0631 \u0627\u0644\u0645\u0641\u0631\u062f\u0627\u062a"
                  title="\u0627\u062e\u062a\u0628\u0627\u0631 \u0627\u0644\u0645\u0641\u0631\u062f\u0627\u062a"
                >
                  <HelpCircle size={16} aria-hidden="true" />
                </button>
            </div>
          </div>
        </Card>'''

count = content.count(old_end)
print(f'Pattern found {count} times')
if count == 1:
    content = content.replace(old_end, new_end, 1)
    print('Quiz button added')

with open('src/pages/QuranVocab.tsx', 'w', encoding='utf-8', errors='surrogatepass', newline='\n') as f:
    f.write(content)
print(f'Saved ({len(content)} bytes)')
