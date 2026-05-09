with open('src/pages/Mushaf.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('mushaf-session-card')
if idx < 0:
    print('Not found')
    exit(1)

# Find the end of this block - look for the closing pattern
# Search for </div>  </> after the button
search_from = idx + len('mushaf-session-card')
# Find the </div> closing the card, then </> closing the fragment, then )} closing the conditional
end_marker = '          </div>\n        </>\n      )}\n'
end_idx = content.find(end_marker, search_from)
if end_idx < 0:
    print('End marker not found, trying alternative...')
    # Try other variants
    for sep in ['\r\n', '\n']:
        em = f'          </div>{sep}        </>{sep}      )}}{sep}'
        ei = content.find(em, search_from)
        if ei >= 0:
            end_idx = ei
            end_marker = em
            print(f'Found with sep: {repr(sep)}')
            break
    if end_idx < 0:
        # Print a chunk to see what's there
        chunk_near = content[search_from:search_from+600]
        print('Chunk near search_from:', repr(chunk_near))
        exit(1)

# Get the full old block (from the div opening back to className=)
# Find actual start of <div className="mushaf-session-card"...>
div_start = content.rfind('<div', 0, idx)
print(f'Block from {div_start} to {end_idx + len(end_marker)}')
old_block = content[div_start:end_idx + len(end_marker)]
print('Old block:', repr(old_block[:300]))
