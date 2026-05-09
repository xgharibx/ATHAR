"""Phase 18: Fix React hooks violations in VideoLibrary.tsx.
Three components (SheikhScreen, CourseScreen, TopicScreen) call useMemo/useState
after conditional returns, violating Rules of Hooks.
This script moves those hooks before the early-return guards.
"""

with open('src/pages/VideoLibrary.tsx', encoding='utf-8') as f:
    content = f.read()

# ─── SheikhScreen ────────────────────────────────────────────────────────────

OLD_SHEIKH = '''\
  React.useEffect(() => { setVideoPage(1); }, [topicFilter, channelId, sortKey]);

  if (!channel) {
    return (
      <div className="page-enter p-6 text-center opacity-60" dir="rtl">
        الشيخ غير موجود
      </div>
    );
  }

  const channelVideos = data.videosByChannel.get(channelId) ?? [];
  const channelCourses = data.coursesByChannel.get(channelId) ?? [];
  const stats = aggregateProgress(channelVideos, progress);
  const initials = channel.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
  const [sheikhAvatarErr, setSheikhAvatarErr] = React.useState(false);

  const channelTopicIds = new Set(channelVideos.flatMap((v) => v.topicIds as string[]));
  const channelTopics = data.db.topics.filter((t) => channelTopicIds.has(t.id));
  const filteredVideos = topicFilter
    ? channelVideos.filter((v) => (v.topicIds as string[]).includes(topicFilter))
    : channelVideos;
  const visibleVideos = React.useMemo(() => {
    const arr = filteredVideos.slice();
    if (sortKey === "newest") arr.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    else if (sortKey === "oldest") arr.sort((a, b) => (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""));
    else if (sortKey === "duration-desc") arr.sort((a, b) => b.durationSeconds - a.durationSeconds);
    else if (sortKey === "duration-asc") arr.sort((a, b) => a.durationSeconds - b.durationSeconds);
    else if (sortKey === "alpha") arr.sort((a, b) => a.title.localeCompare(b.title, "ar"));
    return arr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredVideos, sortKey]);'''

NEW_SHEIKH = '''\
  React.useEffect(() => { setVideoPage(1); }, [topicFilter, channelId, sortKey]);

  // Hooks must be called unconditionally — before any early return
  const [sheikhAvatarErr, setSheikhAvatarErr] = React.useState(false);
  const channelVideos = React.useMemo(() => data.videosByChannel.get(channelId) ?? [], [data.videosByChannel, channelId]);
  const channelCourses = React.useMemo(() => data.coursesByChannel.get(channelId) ?? [], [data.coursesByChannel, channelId]);
  const stats = React.useMemo(() => aggregateProgress(channelVideos, progress), [channelVideos, progress]);
  const channelTopics = React.useMemo(() => {
    const ids = new Set(channelVideos.flatMap((v) => v.topicIds as string[]));
    return data.db.topics.filter((t) => ids.has(t.id));
  }, [channelVideos, data.db.topics]);
  const filteredVideos = React.useMemo(
    () => topicFilter ? channelVideos.filter((v) => (v.topicIds as string[]).includes(topicFilter)) : channelVideos,
    [channelVideos, topicFilter]
  );
  const visibleVideos = React.useMemo(() => {
    const arr = filteredVideos.slice();
    if (sortKey === "newest") arr.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    else if (sortKey === "oldest") arr.sort((a, b) => (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""));
    else if (sortKey === "duration-desc") arr.sort((a, b) => b.durationSeconds - a.durationSeconds);
    else if (sortKey === "duration-asc") arr.sort((a, b) => a.durationSeconds - b.durationSeconds);
    else if (sortKey === "alpha") arr.sort((a, b) => a.title.localeCompare(b.title, "ar"));
    return arr;
  }, [filteredVideos, sortKey]);

  if (!channel) {
    return (
      <div className="page-enter p-6 text-center opacity-60" dir="rtl">
        الشيخ غير موجود
      </div>
    );
  }

  const initials = channel.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);'''

if OLD_SHEIKH in content:
    content = content.replace(OLD_SHEIKH, NEW_SHEIKH, 1)
    print('SheikhScreen: fix applied')
else:
    print('SheikhScreen: OLD text NOT found!')

# ─── CourseScreen ────────────────────────────────────────────────────────────

OLD_COURSE = '''\
  if (!course) {
    return (
      <div className="page-enter p-6 text-center opacity-60" dir="rtl">
        الدورة غير موجودة
      </div>
    );
  }

  const lastWatched = courseVideos.find((v) => { const p = progress[v.id]; return p && !p.completed && (p.seconds ?? 0) > 30; });
  const nextToDo = courseVideos.find((v) => !progress[v.id]?.completed);
  const continueTarget = lastWatched ?? nextToDo;

  const sortedLessons = React.useMemo(() => {
    const arr = courseVideos.slice();
    if (sortKey === "newest") arr.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    else if (sortKey === "oldest") arr.sort((a, b) => (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""));
    else if (sortKey === "duration-desc") arr.sort((a, b) => b.durationSeconds - a.durationSeconds);
    else if (sortKey === "duration-asc") arr.sort((a, b) => a.durationSeconds - b.durationSeconds);
    else if (sortKey === "alpha") arr.sort((a, b) => a.title.localeCompare(b.title, "ar"));
    return arr;
  }, [courseVideos, sortKey]);'''

NEW_COURSE = '''\
  // Hook must be before early return (Rules of Hooks)
  const sortedLessons = React.useMemo(() => {
    const arr = courseVideos.slice();
    if (sortKey === "newest") arr.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    else if (sortKey === "oldest") arr.sort((a, b) => (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""));
    else if (sortKey === "duration-desc") arr.sort((a, b) => b.durationSeconds - a.durationSeconds);
    else if (sortKey === "duration-asc") arr.sort((a, b) => a.durationSeconds - b.durationSeconds);
    else if (sortKey === "alpha") arr.sort((a, b) => a.title.localeCompare(b.title, "ar"));
    return arr;
  }, [courseVideos, sortKey]);

  if (!course) {
    return (
      <div className="page-enter p-6 text-center opacity-60" dir="rtl">
        الدورة غير موجودة
      </div>
    );
  }

  const lastWatched = courseVideos.find((v) => { const p = progress[v.id]; return p && !p.completed && (p.seconds ?? 0) > 30; });
  const nextToDo = courseVideos.find((v) => !progress[v.id]?.completed);
  const continueTarget = lastWatched ?? nextToDo;'''

if OLD_COURSE in content:
    content = content.replace(OLD_COURSE, NEW_COURSE, 1)
    print('CourseScreen: fix applied')
else:
    print('CourseScreen: OLD text NOT found!')

# ─── TopicScreen ────────────────────────────────────────────────────────────

OLD_TOPIC = '''\
  if (!topic) {
    return (
      <div className="page-enter p-6 text-center opacity-60" dir="rtl">
        الموضوع غير موجود
      </div>
    );
  }

  const topicVideos = data.db.videos.filter((v) => (v.topicIds as string[]).includes(topicId));
  const topicCourses = data.db.courses.filter((c) => (c.topicIds as string[]).includes(topicId) && !c.isGenerated);
  const channelIds = [...new Set(topicVideos.map((v) => v.channelId))];
  const channelChips = channelIds
    .map((id) => ({ id, channel: data.channelById.get(id)!, count: topicVideos.filter((v) => v.channelId === id).length }))
    .filter((c) => c.channel);

  const filteredVideos = channelFilter
    ? topicVideos.filter((v) => v.channelId === channelFilter)
    : topicVideos;

  const visibleVideos = React.useMemo(() => {
    const arr = filteredVideos.slice();
    if (sortKey === "newest") arr.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    else if (sortKey === "oldest") arr.sort((a, b) => (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""));
    else if (sortKey === "duration-desc") arr.sort((a, b) => b.durationSeconds - a.durationSeconds);
    else if (sortKey === "duration-asc") arr.sort((a, b) => a.durationSeconds - b.durationSeconds);
    else if (sortKey === "alpha") arr.sort((a, b) => a.title.localeCompare(b.title, "ar"));
    return arr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredVideos, sortKey]);'''

NEW_TOPIC = '''\
  // Hooks must be before early return (Rules of Hooks)
  const topicVideos = React.useMemo(
    () => data.db.videos.filter((v) => (v.topicIds as string[]).includes(topicId)),
    [data.db.videos, topicId]
  );
  const topicCourses = React.useMemo(
    () => data.db.courses.filter((c) => (c.topicIds as string[]).includes(topicId) && !c.isGenerated),
    [data.db.courses, topicId]
  );
  const { channelIds, channelChips } = React.useMemo(() => {
    const channelIds = [...new Set(topicVideos.map((v) => v.channelId))];
    const channelChips = channelIds
      .map((id) => ({ id, channel: data.channelById.get(id)!, count: topicVideos.filter((v) => v.channelId === id).length }))
      .filter((c) => c.channel);
    return { channelIds, channelChips };
  }, [topicVideos, data.channelById]);
  const filteredVideos = React.useMemo(
    () => channelFilter ? topicVideos.filter((v) => v.channelId === channelFilter) : topicVideos,
    [topicVideos, channelFilter]
  );
  const visibleVideos = React.useMemo(() => {
    const arr = filteredVideos.slice();
    if (sortKey === "newest") arr.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
    else if (sortKey === "oldest") arr.sort((a, b) => (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""));
    else if (sortKey === "duration-desc") arr.sort((a, b) => b.durationSeconds - a.durationSeconds);
    else if (sortKey === "duration-asc") arr.sort((a, b) => a.durationSeconds - b.durationSeconds);
    else if (sortKey === "alpha") arr.sort((a, b) => a.title.localeCompare(b.title, "ar"));
    return arr;
  }, [filteredVideos, sortKey]);

  if (!topic) {
    return (
      <div className="page-enter p-6 text-center opacity-60" dir="rtl">
        الموضوع غير موجود
      </div>
    );
  }'''

if OLD_TOPIC in content:
    content = content.replace(OLD_TOPIC, NEW_TOPIC, 1)
    print('TopicScreen: fix applied')
else:
    print('TopicScreen: OLD text NOT found!')

with open('src/pages/VideoLibrary.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('\nAll done. Run: npx tsc --noEmit')
