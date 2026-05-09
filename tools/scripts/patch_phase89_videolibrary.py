import os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
path = os.path.join(WORKSPACE, 'src', 'pages', 'VideoLibrary.tsx')

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# VideoLibrary: wrap VideoListRow in div[role=listitem], move key to div
old1 = (
    '            {visibleVideos.slice(0, videoPage * PAGE_SIZE).map((v) => (\n'
    '              <VideoListRow\n'
    '                key={v.id}\n'
    '                video={v}\n'
)
new1 = (
    '            {visibleVideos.slice(0, videoPage * PAGE_SIZE).map((v) => (\n'
    '              <div key={v.id} role="listitem">\n'
    '              <VideoListRow\n'
    '                video={v}\n'
)
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes += 1
    print('VideoLibrary change 1: VideoListRow open PATCHED')
else:
    print('VideoLibrary change 1: NOT FOUND')

# Close after VideoListRow — find the closing of the component
old2 = (
    '                onClick={() => navigate(`/video-library/watch/${v.id}`)}\n'
    '              />\n'
    '            ))}\n'
)
new2 = (
    '                onClick={() => navigate(`/video-library/watch/${v.id}`)}\n'
    '              />\n'
    '              </div>\n'
    '            ))}\n'
)
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes += 1
    print('VideoLibrary change 2: VideoListRow close PATCHED')
else:
    print('VideoLibrary change 2: NOT FOUND')
    # debug: show context
    idx = content.find('VideoListRow')
    while idx >= 0:
        chunk = content[idx:idx+300]
        if 'navigate' in chunk and 'onClick' in chunk:
            print('Context:', repr(chunk))
            break
        idx = content.find('VideoListRow', idx+1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Total changes: {changes}')
