/**
 * What you can do with a track: play it next, add it to the queue, keep it
 * in your favourites, put it in one of your lists (or a new one).
 */
import * as React from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { BookOpen, CloudDownload, Heart, ListEnd, ListPlus, ListStart, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ListenTrack } from "@/lib/listen/catalog";
import { enqueue, playNext } from "@/lib/listen/player";
import { useListenStore } from "@/lib/listen/store";
import { canDownloadListening, downloadTracks, removeDownloadedTracks } from "@/lib/listen/downloads";

export function TrackActions({ track, onClose }: { track: ListenTrack; onClose: () => void }) {
  const navigate = useNavigate();
  const favorite = useListenStore((s) => Boolean(s.favorites[track.id]));
  const toggleFavorite = useListenStore((s) => s.toggleFavorite);
  const playlists = useListenStore((s) => s.playlists);
  const addToPlaylist = useListenStore((s) => s.addToPlaylist);
  const createPlaylist = useListenStore((s) => s.createPlaylist);
  const downloaded = useListenStore((s) => Boolean(s.downloads[track.id]));
  const [picking, setPicking] = React.useState(false);
  const [newName, setNewName] = React.useState("");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const done = (message: string) => {
    toast.success(message, { duration: 1600 });
    onClose();
  };

  return createPortal(
    <div className="ls-sheet" role="presentation" onClick={onClose}>
      <div className="ls-sheet-body" role="dialog" aria-modal="true" aria-label={track.title} onClick={(e) => e.stopPropagation()}>
        <div className="ls-sheet-title">
          {track.title}
          <div className="text-[12px] font-normal text-(--muted) mt-1">{track.artist}</div>
        </div>
        {!picking ? (
          <>
            <button type="button" className="ls-option" onClick={() => { playNext(track); done("سيُتلى بعد الحالي"); }}>
              <ListStart size={19} aria-hidden="true" /> تشغيل بعد الحالي
            </button>
            <button type="button" className="ls-option" onClick={() => { enqueue(track); done("أُضيف إلى قائمة التشغيل"); }}>
              <ListEnd size={19} aria-hidden="true" /> إضافة إلى قائمة التشغيل
            </button>
            <button type="button" className={`ls-option ${favorite ? "is-on" : ""}`} onClick={() => { toggleFavorite(track); done(favorite ? "أُزيل من المفضّلة" : "أُضيف إلى المفضّلة"); }}>
              <Heart size={19} aria-hidden="true" fill={favorite ? "currentColor" : "none"} /> {favorite ? "إزالة من المفضّلة" : "إضافة إلى المفضّلة"}
            </button>
            <button type="button" className="ls-option" onClick={() => setPicking(true)}>
              <ListPlus size={19} aria-hidden="true" /> إضافة إلى قائمة من قوائمك
            </button>
            {canDownloadListening() ? (
              downloaded ? (
                <button
                  type="button"
                  className="ls-option"
                  onClick={() => { void removeDownloadedTracks([track]); done("حُذف التنزيل"); }}
                >
                  <Trash2 size={19} aria-hidden="true" /> حذف التنزيل من الهاتف
                </button>
              ) : (
                <button
                  type="button"
                  className="ls-option"
                  onClick={() => {
                    done("بدأ التنزيل — يكمل في الخلفية");
                    void downloadTracks([track], { title: track.title }).then((r) => {
                      if (r && r.saved >= r.total) toast.success(`حُفظت «${track.title}» للاستماع دون إنترنت`, { duration: 2200 });
                      else if (r) toast.error("تعذّر التنزيل، أعد المحاولة عند توفر الاتصال");
                    });
                  }}
                >
                  <CloudDownload size={19} aria-hidden="true" /> تنزيل للاستماع دون إنترنت
                </button>
              )
            ) : null}
            {track.surah ? (
              <button type="button" className="ls-option" onClick={() => { onClose(); navigate(`/mushaf?surah=${track.surah}&ayah=1`); }}>
                <BookOpen size={19} aria-hidden="true" /> قراءتها في المصحف
              </button>
            ) : null}
          </>
        ) : (
          <>
            {playlists.map((p) => (
              <button key={p.id} type="button" className="ls-option" onClick={() => { addToPlaylist(p.id, track); done(`أُضيف إلى «${p.name}»`); }}>
                <ListPlus size={19} aria-hidden="true" /> {p.name}
                <span className="mr-auto text-[12px] text-(--muted)">{p.tracks.length}</span>
              </button>
            ))}
            <form
              className="flex gap-2 mt-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = newName.trim();
                if (!name) return;
                createPlaylist(name, [track]);
                done(`أُنشئت «${name}»`);
              }}
            >
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="اسم قائمة جديدة، مثل: سور الصباح"
                aria-label="اسم القائمة الجديدة"
                className="flex-1 h-11 rounded-xl px-3 bg-(--card) border border-(--stroke) text-sm outline-none"
              />
              <button type="submit" className="ls-play-btn" style={{ height: 44, padding: "0 16px" }} aria-label="إنشاء القائمة">
                <Plus size={18} aria-hidden="true" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
