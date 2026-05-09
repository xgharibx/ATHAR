"""Fix text-black on dynamic accent backgrounds in VideoLibrary.tsx"""
import re

fp = r"src\pages\VideoLibrary.tsx"

with open(fp, encoding="utf-8") as f:
    content = f.read()

# The pattern is always:
#   ? "text-black border-transparent" : ...
# with a corresponding style that sets background to some accent variable
# We need to:
# 1. Remove text-black from the className ternary
# 2. Add color: contrastText(xxx) to the corresponding style

# Map of style background expressions to their contrastText arg
replacements = [
    # searchChannelFilter chip
    (
        'searchChannelFilter === ch.id ? "text-black border-transparent" : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"}}\n                  style={searchChannelFilter === ch.id ? { background: ch.accent } : { borderColor: `${ch.accent}40` }}>',
        'searchChannelFilter === ch.id ? "border-transparent" : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"}}\n                  style={searchChannelFilter === ch.id ? { background: ch.accent, color: contrastText(ch.accent) } : { borderColor: `${ch.accent}40` }}>',
    ),
    # topicFilter "all" button (channel view)
    (
        '!topicFilter ? "text-black border-transparent" : "bg-[var(--card)] border-[var(--stroke)]",\n            )}\n            style={!topicFilter ? { background: channel.accent } : undefined}',
        '!topicFilter ? "border-transparent" : "bg-[var(--card)] border-[var(--stroke)]",\n            )}\n            style={!topicFilter ? { background: channel.accent, color: contrastText(channel.accent) } : undefined}',
    ),
    # topicFilter === t.id chip (channel view)
    (
        'topicFilter === t.id ? "text-black border-transparent" : "bg-[var(--card)] border-[var(--stroke)]",\n              )}\n              style={topicFilter === t.id ? { background: t.accent } : undefined}',
        'topicFilter === t.id ? "border-transparent" : "bg-[var(--card)] border-[var(--stroke)]",\n              )}\n              style={topicFilter === t.id ? { background: t.accent, color: contrastText(t.accent) } : undefined}',
    ),
    # sortKey chip in channel view (uses channel.accent)
    (
        'sortKey === sk ? "text-black border-transparent" : "bg-[var(--card)] border-[var(--stroke)]"}}\n                style={sortKey === sk ? { background: channel.accent } : undefined}>',
        'sortKey === sk ? "border-transparent" : "bg-[var(--card)] border-[var(--stroke)]"}}\n                style={sortKey === sk ? { background: channel.accent, color: contrastText(channel.accent) } : undefined}>',
    ),
    # sortKey chip in course view (uses accent)
    (
        'sortKey === sk ? "text-black border-transparent" : "bg-[var(--card)] border-[var(--stroke)]"}}\n                style={sortKey === sk ? { background: accent } : undefined}>',
        'sortKey === sk ? "border-transparent" : "bg-[var(--card)] border-[var(--stroke)]"}}\n                style={sortKey === sk ? { background: accent, color: contrastText(accent) } : undefined}>',
    ),
    # channelFilter === null chip (topic screen)
    (
        'channelFilter === null ? "text-black border-transparent" : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"}}\n            style={channelFilter === null ? { background: topic.accent } : {}}',
        'channelFilter === null ? "border-transparent" : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"}}\n            style={channelFilter === null ? { background: topic.accent, color: contrastText(topic.accent) } : {}}',
    ),
    # channelFilter === id chip (topic screen)
    (
        'channelFilter === id ? "text-black border-transparent" : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"}}\n              style={channelFilter === id ? { background: channel.accent } : { borderColor: `${channel.accent}40` }}',
        'channelFilter === id ? "border-transparent" : "bg-[var(--card)] border-[var(--stroke)] hover:bg-[var(--card-2)]"}}\n              style={channelFilter === id ? { background: channel.accent, color: contrastText(channel.accent) } : { borderColor: `${channel.accent}40` }}',
    ),
    # sortKey chip in topic screen (uses topic.accent)
    (
        'sortKey === sk ? "text-black border-transparent" : "bg-[var(--card)] border-[var(--stroke)]"}}\n                style={sortKey === sk ? { background: topic.accent } : undefined}>',
        'sortKey === sk ? "border-transparent" : "bg-[var(--card)] border-[var(--stroke)]"}}\n                style={sortKey === sk ? { background: topic.accent, color: contrastText(topic.accent) } : undefined}>',
    ),
]

count = 0
for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f"[OK] Replaced: {old[:60].strip()!r}")
        count += 1
    else:
        print(f"[MISS] Not found: {old[:60].strip()!r}")

with open(fp, "w", encoding="utf-8") as f:
    f.write(content)

print(f"\nDone. {count}/{len(replacements)} replacements applied.")
