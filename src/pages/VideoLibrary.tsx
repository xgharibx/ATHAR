import * as React from "react";
import Fuse from "fuse.js";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  Clapperboard,
  Clock,
  GraduationCap,
  Play,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";

import { YouTubeCoursePlayer } from "@/components/video/YouTubeCoursePlayer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { useVideoLibraryDB } from "@/data/useVideoLibraryDB";
import type { VideoLibraryChannel, VideoLibraryCourse, VideoLibraryProgress, VideoLibraryTopic, VideoLibraryVideo } from "@/data/videoLibraryTypes";
import { stripDiacritics } from "@/lib/arabic";
import { cn } from "@/lib/utils";
import { useNoorStore } from "@/store/noorStore";

function formatDuration(seconds: number) {
  if (!seconds) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}س ${m}د`;
  return `${Math.max(1, m)}د`;
}

function aggregateProgress(videos: VideoLibraryVideo[], progress: Record<string, VideoLibraryProgress>) {
  if (videos.length === 0) return { percent: 0, done: 0, total: 0, seconds: 0 };
  let done = 0;
  let percentTotal = 0;
  let seconds = 0;
  for (const video of videos) {
    const p = progress[video.id];
    if (p?.completed) done++;
    percentTotal += p?.completed ? 100 : (p?.percent ?? 0);
    seconds += p?.seconds ?? 0;
  }
  return { percent: Math.round(percentTotal / videos.length), done, total: videos.length, seconds };
}

function ProgressBar({ percent, accent = "var(--accent)" }: { percent: number; accent?: string }) {
  return (
    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, percent))}%`, background: accent }} />
    </div>
  );
}

function ChannelCard({ channel, videos, progress, onClick }: {
  channel: VideoLibraryChannel;
  videos: VideoLibraryVideo[];
  progress: Record<string, VideoLibraryProgress>;
  onClick: () => void;
}) {
  const stats = aggregateProgress(videos, progress);
  return (
    <button type="button" onClick={onClick} className="text-right press-effect rounded-3xl glass-strong border border-white/10 p-4 overflow-hidden relative">
      <div className="absolute inset-y-0 right-0 w-1.5" style={{ background: channel.accent }} />
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-xl border border-white/10" style={{ background: `${channel.accent}22` }}>
          <UserRound size={22} style={{ color: channel.accent }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold line-clamp-1" style={{ color: channel.accent }}>{channel.displayName}</div>
          <div className="text-xs opacity-55 line-clamp-2 mt-1">{channel.description}</div>
        </div>
        <ChevronLeft size={16} className="opacity-45 shrink-0 mt-1" />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        <div className="rounded-2xl bg-white/6 p-2"><div className="text-[10px] opacity-50">الفيديوهات</div><div className="font-bold tabular-nums">{videos.length}</div></div>
        <div className="rounded-2xl bg-white/6 p-2"><div className="text-[10px] opacity-50">المكتمل</div><div className="font-bold tabular-nums">{stats.done}</div></div>
        <div className="rounded-2xl bg-white/6 p-2"><div className="text-[10px] opacity-50">التقدم</div><div className="font-bold tabular-nums">{stats.percent}%</div></div>
      </div>
      <div className="mt-3"><ProgressBar percent={stats.percent} accent={channel.accent} /></div>
    </button>
  );
}

function CourseCard({ course, channel, videos, progress, onClick }: {
  course: VideoLibraryCourse;
  channel?: VideoLibraryChannel;
  videos: VideoLibraryVideo[];
  progress: Record<string, VideoLibraryProgress>;
  onClick: () => void;
}) {
  const stats = aggregateProgress(videos, progress);
  const totalSeconds = videos.reduce((sum, v) => sum + (v.durationSeconds || 0), 0);
  return (
    <button type="button" onClick={onClick} className="min-w-[250px] max-w-[280px] text-right press-effect rounded-3xl glass border border-white/10 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-[11px] opacity-50 mb-1">{channel?.displayName ?? "دورة"}</div>
          <div className="text-sm font-bold line-clamp-2 arabic-text">{course.title}</div>
        </div>
        <GraduationCap size={19} style={{ color: channel?.accent ?? "var(--accent)" }} />
      </div>
      <div className="text-xs opacity-55 line-clamp-2 leading-5 mb-3">{course.description}</div>
      <ProgressBar percent={stats.percent} accent={channel?.accent} />
      <div className="flex items-center justify-between gap-2 mt-3 text-[11px] opacity-55">
        <span>{stats.done}/{stats.total} درس</span>
        <span>{formatDuration(totalSeconds)}</span>
      </div>
    </button>
  );
}

function VideoRow({ video, channel, progress, bookmarked, onClick }: {
  video: VideoLibraryVideo;
  channel?: VideoLibraryChannel;
  progress?: VideoLibraryProgress;
  bookmarked: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="w-full text-right rounded-3xl border border-white/10 bg-white/5 hover:bg-white/8 transition p-3 press-effect">
      <div className="flex gap-3">
        <div className="w-24 h-16 rounded-2xl bg-black/30 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
          {video.thumbnail ? <img src={video.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" /> : <Play size={20} className="opacity-55" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="font-semibold text-sm leading-6 line-clamp-2 arabic-text flex-1">{video.title}</div>
            {bookmarked && <Bookmark size={14} className="fill-[var(--accent)] text-[var(--accent)] shrink-0" />}
          </div>
          <div className="text-[11px] opacity-50 mt-1 line-clamp-1">{channel?.displayName ?? "مكتبة الفيديو"}</div>
          <div className="flex items-center gap-2 mt-2 text-[11px] opacity-55">
            <Clock size={12} />
            <span>{formatDuration(video.durationSeconds)}</span>
            {progress?.completed && <span className="text-emerald-300 flex items-center gap-1"><CheckCircle2 size={12} /> مكتمل</span>}
          </div>
          <div className="mt-2"><ProgressBar percent={progress?.completed ? 100 : progress?.percent ?? 0} accent={channel?.accent} /></div>
        </div>
      </div>
    </button>
  );
}

export function VideoLibraryPage() {
  const navigate = useNavigate();
  const params = useParams<{ channelId?: string; courseId?: string; videoId?: string }>();
  const { data, isLoading, error } = useVideoLibraryDB();
  const [q, setQ] = React.useState("");
  const [topicFilter, setTopicFilter] = React.useState<string | null>(null);

  const progress = useNoorStore((s) => s.videoLibraryProgress);
  const bookmarks = useNoorStore((s) => s.videoLibraryBookmarks);
  const lastVideoId = useNoorStore((s) => s.videoLibraryLastVideoId);
  const setVideoProgress = useNoorStore((s) => s.setVideoProgress);
  const markVideoComplete = useNoorStore((s) => s.markVideoComplete);
  const toggleVideoBookmark = useNoorStore((s) => s.toggleVideoBookmark);
  const setVideoLastVideo = useNoorStore((s) => s.setVideoLastVideo);

  const fuse = React.useMemo(() => {
    if (!data) return null;
    const records = [
      ...data.db.videos.map((video) => ({ type: "video" as const, id: video.id, search: `${video.title} ${video.description}` })),
      ...data.db.courses.map((course) => ({ type: "course" as const, id: course.id, search: `${course.title} ${course.description}` })),
      ...data.db.channels.map((channel) => ({ type: "channel" as const, id: channel.id, search: `${channel.displayName} ${channel.title} ${channel.description} ${channel.handle}` })),
    ];
    return new Fuse(records, { keys: ["search"], threshold: 0.34 });
  }, [data]);

  const selectedVideo = data && params.videoId ? data.videoById.get(params.videoId) : undefined;
  const selectedChannel = selectedVideo ? data?.channelById.get(selectedVideo.channelId) : params.channelId && data ? data.channelById.get(params.channelId) : undefined;
  const selectedCourse = params.courseId && data ? data.courseById.get(params.courseId) : selectedVideo?.courseIds[0] && data ? data.courseById.get(selectedVideo.courseIds[0]) : undefined;
  const channelVideos = selectedChannel && data ? data.videosByChannel.get(selectedChannel.id) ?? [] : [];
  const courseVideos = selectedCourse && data ? data.videosByCourse.get(selectedCourse.id) ?? [] : [];
  const activeList = selectedCourse ? courseVideos : selectedChannel ? channelVideos : data?.db.videos ?? [];

  const visibleVideos = React.useMemo(() => {
    if (!data) return [] as VideoLibraryVideo[];
    if (q.trim() && fuse) {
      const ids = fuse.search(stripDiacritics(q.trim())).filter((r) => r.item.type === "video").map((r) => r.item.id);
      return ids.map((id) => data.videoById.get(id)).filter(Boolean) as VideoLibraryVideo[];
    }
    const base = activeList.length ? activeList : data.db.videos;
    return base.filter((video) => !topicFilter || video.topicIds.includes(topicFilter as never)).slice(0, 80);
  }, [activeList, data, fuse, q, topicFilter]);

  const continueVideo = data && lastVideoId ? data.videoById.get(lastVideoId) : undefined;
  const newestVideos = data?.db.videos.slice().sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")).slice(0, 12) ?? [];

  if (isLoading) return <div className="space-y-3 page-enter"><Card className="p-5"><div className="skeleton h-8 w-52 rounded-xl" /><div className="skeleton h-28 w-full rounded-3xl mt-4" /></Card></div>;
  if (error || !data) return <Card className="p-5"><div className="font-semibold">تعذر تحميل مكتبة الفيديو</div><div className="text-sm opacity-60 mt-2">تأكد من وجود ملف البيانات ثم أعد المحاولة.</div></Card>;

  if (selectedVideo) {
    const index = activeList.findIndex((v) => v.id === selectedVideo.id);
    const next = index >= 0 ? activeList[index + 1] : undefined;
    return (
      <div className="page-enter" dir="rtl">
        <YouTubeCoursePlayer
          video={selectedVideo}
          channel={selectedChannel}
          course={selectedCourse}
          progress={progress[selectedVideo.id]}
          bookmarked={!!bookmarks[selectedVideo.id]}
          onClose={() => navigate(selectedCourse ? `/video-library/course/${selectedCourse.id}` : selectedChannel ? `/video-library/${selectedChannel.id}` : "/video-library")}
          onBookmark={() => toggleVideoBookmark(selectedVideo.id)}
          onComplete={() => markVideoComplete(selectedVideo.id, selectedVideo.durationSeconds)}
          onNext={next ? () => navigate(`/video-library/watch/${next.id}`) : undefined}
          onProgress={(seconds, duration, completed) => {
            setVideoLastVideo(selectedVideo.id);
            setVideoProgress(selectedVideo.id, { seconds, duration, completed });
          }}
        />
        <div className="mt-4 space-y-2">
          {activeList.filter((v) => v.id !== selectedVideo.id).slice(0, 8).map((video) => (
            <VideoRow key={video.id} video={video} channel={data.channelById.get(video.channelId)} progress={progress[video.id]} bookmarked={!!bookmarks[video.id]} onClick={() => navigate(`/video-library/watch/${video.id}`)} />
          ))}
        </div>
      </div>
    );
  }

  const headerTitle = selectedCourse ? selectedCourse.title : selectedChannel ? selectedChannel.displayName : "مكتبة الدورات والفيديوهات";
  const headerSubtitle = selectedCourse ? selectedCourse.description : selectedChannel ? selectedChannel.description : "رحلة منظمة داخل التطبيق: شيخ، دورة، موضوع، تقدم، واستكمال بدون تشتت.";
  const headerStats = aggregateProgress(activeList, progress);

  return (
    <div className="space-y-4 page-enter" dir="rtl">
      <Card className="p-5 overflow-hidden relative">
        <div className="absolute -left-10 -top-12 w-36 h-36 rounded-full opacity-10 bg-[var(--accent)]" />
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {(selectedChannel || selectedCourse) && <IconButton aria-label="رجوع" onClick={() => navigate(selectedCourse && selectedChannel ? `/video-library/${selectedChannel.id}` : "/video-library")}><ArrowRight size={18} /></IconButton>}
            <div className="w-11 h-11 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center shrink-0"><Clapperboard size={22} className="text-[var(--accent)]" /></div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold line-clamp-2 arabic-text">{headerTitle}</h1>
              <div className="text-xs opacity-55 mt-1 line-clamp-2">{headerSubtitle}</div>
            </div>
          </div>
          <Badge className="shrink-0">{data.db.source === "seed" ? "تجهيز أولي" : "مزامنة"}</Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-2xl bg-white/6 border border-white/10 p-3"><div className="text-[10px] opacity-50">المشايخ</div><div className="text-xl font-bold tabular-nums">{data.db.channels.length}</div></div>
          <div className="rounded-2xl bg-white/6 border border-white/10 p-3"><div className="text-[10px] opacity-50">الدورات</div><div className="text-xl font-bold tabular-nums">{data.db.courses.length}</div></div>
          <div className="rounded-2xl bg-white/6 border border-white/10 p-3"><div className="text-[10px] opacity-50">الفيديوهات</div><div className="text-xl font-bold tabular-nums">{activeList.length || data.db.videos.length}</div></div>
        </div>
        <ProgressBar percent={headerStats.percent} />
        <div className="flex items-center justify-between text-xs opacity-55 mt-2"><span>{headerStats.done}/{headerStats.total} مكتمل</span><span>{headerStats.percent}%</span></div>

        {data.db.source === "seed" && data.db.videos.length === 0 && (
          <div className="mt-4 rounded-3xl bg-amber-400/10 border border-amber-300/20 p-4 text-sm leading-7">
            تم تجهيز المكتبة والبنية الكاملة. لإحضار كل فيديوهات القنوات، شغّل <span className="font-mono text-xs">tools/scripts/sync-video-library.mjs</span> بعد ضبط <span className="font-mono text-xs">YOUTUBE_API_KEY</span> محليًا.
          </div>
        )}
      </Card>

      <div className="relative">
        <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-45" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن شيخ، دورة، موضوع، أو درس..." className="pr-10" />
      </div>

      {continueVideo && (
        <Card className="p-4 border border-[var(--accent)]/25">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-[var(--accent)] mb-1"><Sparkles size={14} /> أكمل من حيث توقفت</div>
              <div className="font-semibold line-clamp-1 arabic-text">{continueVideo.title}</div>
            </div>
            <Button onClick={() => navigate(`/video-library/watch/${continueVideo.id}`)}><Play size={15} /> متابعة</Button>
          </div>
        </Card>
      )}

      {!selectedChannel && !selectedCourse && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {data.db.channels.map((channel) => <ChannelCard key={channel.id} channel={channel} videos={data.videosByChannel.get(channel.id) ?? []} progress={progress} onClick={() => navigate(`/video-library/${channel.id}`)} />)}
        </div>
      )}

      <div className="overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
        <div className="flex gap-2 pb-1" style={{ width: "max-content" }}>
          <button type="button" onClick={() => setTopicFilter(null)} className={cn("px-3 py-2 rounded-2xl border text-xs", !topicFilter ? "bg-[var(--accent)] text-black border-transparent" : "bg-white/6 border-white/10")}>الكل</button>
          {data.db.topics.map((topic: VideoLibraryTopic) => (
            <button type="button" key={topic.id} onClick={() => setTopicFilter(topic.id)} className={cn("px-3 py-2 rounded-2xl border text-xs flex items-center gap-1", topicFilter === topic.id ? "text-black border-transparent" : "bg-white/6 border-white/10")} style={topicFilter === topic.id ? { background: topic.accent } : undefined}>
              <span>{topic.icon}</span>{topic.title}
            </button>
          ))}
        </div>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">الدورات</h2>
          <span className="text-xs opacity-45">{selectedChannel ? data.coursesByChannel.get(selectedChannel.id)?.length ?? 0 : data.db.courses.length}</span>
        </div>
        <div className="overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
          <div className="flex gap-3 pb-1" style={{ width: "max-content" }}>
            {(selectedChannel ? data.coursesByChannel.get(selectedChannel.id) ?? [] : data.db.courses).map((course) => (
              <CourseCard key={course.id} course={course} channel={data.channelById.get(course.channelId)} videos={data.videosByCourse.get(course.id) ?? []} progress={progress} onClick={() => navigate(`/video-library/course/${course.id}`)} />
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{q.trim() ? "نتائج البحث" : selectedCourse ? "دروس الدورة" : selectedChannel ? "فيديوهات الشيخ" : "أحدث الدروس"}</h2>
          <span className="text-xs opacity-45">{visibleVideos.length || newestVideos.length}</span>
        </div>
        {(visibleVideos.length ? visibleVideos : newestVideos).map((video) => (
          <VideoRow key={video.id} video={video} channel={data.channelById.get(video.channelId)} progress={progress[video.id]} bookmarked={!!bookmarks[video.id]} onClick={() => navigate(`/video-library/watch/${video.id}`)} />
        ))}
        {data.db.videos.length === 0 && (
          <Card className="p-5 text-center">
            <div className="text-3xl mb-2">📚</div>
            <div className="font-semibold">المكتبة جاهزة لاستقبال المحتوى</div>
            <div className="text-sm opacity-55 mt-2 leading-7">بعد تشغيل أداة المزامنة ستظهر هنا الدورات والفيديوهات مصنفة حسب الشيخ والموضوع والدورة.</div>
          </Card>
        )}
      </section>
    </div>
  );
}