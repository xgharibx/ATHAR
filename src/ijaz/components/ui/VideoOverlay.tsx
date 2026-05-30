
import { motion, AnimatePresence } from 'framer-motion';

interface VideoOverlayProps {
  youtubeId: string;
  title: string;
  titleAr: string;
  thumbnailUrl: string;
  onClose: () => void;
}

export default function VideoOverlay({
  youtubeId,
  title,
  titleAr,
  thumbnailUrl,
  onClose,
}: VideoOverlayProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-vanta/90 backdrop-blur-xl" />

        {/* Video Container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="relative z-10 w-full max-w-5xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            type="button"
            aria-label="إغلاق الفيديو"
            onClick={onClose}
            className="absolute -top-12 left-0 flex items-center gap-2 text-text-secondary hover:text-gold-primary transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
            <span className="text-sm font-tajawal">إغلاق</span>
          </button>

          {/* Title */}
          <div className="mb-4 text-right">
            <h3 className="text-gold-primary font-amiri text-xl font-bold">{titleAr}</h3>
            <p className="text-text-secondary text-sm font-tajawal">{title}</p>
          </div>

          {/* Video Embed */}
          <div className="relative rounded-2xl overflow-hidden border border-border-gold shadow-gold-lg aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>

          {/* Source Attribution */}
          <div className="mt-4 flex items-center justify-between">
            <a
              href={`https://www.youtube.com/watch?v=${youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-text-muted text-xs font-tajawal hover:text-gold-primary transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="#0a0a0f" />
              </svg>
              شاهد على يوتيوب
            </a>
            <p className="text-text-muted text-xs font-tajawal">
              د. هيثم طلعت | Dr. Haitham Talaat
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface VideoThumbnailProps {
  youtubeId: string;
  title: string;
  titleAr: string;
  duration?: string;
  onClick: () => void;
}

export function VideoThumbnail({ youtubeId, title, titleAr, duration, onClick }: VideoThumbnailProps) {
  return (
    <button type="button" aria-label={`تشغيل ${titleAr}`} onClick={onClick} className="group block w-full text-right">
      <div className="relative rounded-xl overflow-hidden aspect-video border border-border-subtle group-hover:border-border-gold transition-all shadow-sm group-hover:shadow-gold-sm">
        <img
          src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
          alt={title}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Play overlay */}
        <div className="absolute inset-0 bg-vanta/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-gold-primary/90 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#0a0a0f">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
        {/* Duration */}
        {duration && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-vanta/80 text-text-primary text-xs font-tajawal">
            {duration}
          </span>
        )}
      </div>
      <div className="mt-2 pr-1">
        <h4 className="text-text-primary text-sm font-tajawal font-medium line-clamp-2 group-hover:text-gold-primary transition-colors">
          {titleAr}
        </h4>
        <p className="text-text-muted text-xs font-tajawal mt-0.5">د. هيثم طلعت</p>
      </div>
    </button>
  );
}
