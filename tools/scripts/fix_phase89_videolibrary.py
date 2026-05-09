import os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

WORKSPACE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
path = os.path.join(WORKSPACE, 'src', 'pages', 'VideoLibrary.tsx')

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# Fix 1: Remove spurious </div> that was added after VideoThumbCard (not VideoListRow)
# VideoThumbCard uses same onClick pattern
old1 = (
    '              <VideoThumbCard\n'
    '                key={v.id}\n'
    '                video={v}\n'
    '                channel={data.channelById.get(v.channelId)}\n'
    '                progress={progress[v.id]}\n'
    '                bookmarked={!!bookmarks[v.id]}\n'
    '                onClick={() => navigate(`/video-library/watch/${v.id}`)}\n'
    '              />\n'
    '              </div>\n'
    '            ))}\n'
)
new1 = (
    '              <VideoThumbCard\n'
    '                key={v.id}\n'
    '                video={v}\n'
    '                channel={data.channelById.get(v.channelId)}\n'
    '                progress={progress[v.id]}\n'
    '                bookmarked={!!bookmarks[v.id]}\n'
    '                onClick={() => navigate(`/video-library/watch/${v.id}`)}\n'
    '              />\n'
    '            ))}\n'
)
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes += 1
    print('Fix 1: Remove spurious </div> from VideoThumbCard PATCHED')
else:
    print('Fix 1: NOT FOUND')

# Fix 2: Add missing </div> after VideoListRow in channel view
# The channel view VideoListRow map currently ends with:
#   onClick={() => navigate(`/video-library/watch/${v.id}`)}\n              />\n            ))}
# but needs </div> before ))}
old2 = (
    '              <div key={v.id} role="listitem">\n'
    '              <VideoListRow\n'
    '                video={v}\n'
    '                channel={channel}\n'
    '                progress={progress[v.id]}\n'
    '                bookmarked={!!bookmarks[v.id]}\n'
    '                onClick={() => navigate(`/video-library/watch/${v.id}`)}\n'
    '              />\n'
    '            ))}\n'
)
new2 = (
    '              <div key={v.id} role="listitem">\n'
    '              <VideoListRow\n'
    '                video={v}\n'
    '                channel={channel}\n'
    '                progress={progress[v.id]}\n'
    '                bookmarked={!!bookmarks[v.id]}\n'
    '                onClick={() => navigate(`/video-library/watch/${v.id}`)}\n'
    '              />\n'
    '              </div>\n'
    '            ))}\n'
)
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes += 1
    print('Fix 2: Add </div> after VideoListRow PATCHED')
else:
    print('Fix 2: NOT FOUND')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Total changes: {changes}')
