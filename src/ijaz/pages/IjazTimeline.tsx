
import { useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Link } from 'react-router-dom';
import { miracles } from '@/ijaz/data/miracles';
import { TimelineEvent } from '@/ijaz/types';
import { getVisualizationColor, getCategoryLabel } from '@/ijaz/lib/utils';

// Build timeline events from miracles data
const timelineEvents: TimelineEvent[] = [
  {
    id: 'quran-revelation',
    year: 610,
    yearEnd: 632,
    titleAr: 'نزول القرآن الكريم',
    title: 'Revelation of the Quran',
    descriptionAr: 'نزل القرآن الكريم على النبي محمد ﷺ متضمناً حقائق علمية لم يكتشفها البشر إلا بعد قرون',
    description: 'The Quran was revealed to Prophet Muhammad ﷺ containing scientific facts not discovered until centuries later',
    category: 'prophecies',
    miracleId: undefined,
    color: '#d4a853',
  },
  {
    id: 'expansion-discovery',
    year: 1929,
    titleAr: 'اكتشاف توسع الكون — هابل',
    title: 'Hubble discovers universe expansion',
    descriptionAr: 'أثبت إدوين هابل أن الكون يتوسع، وهو ما ذكره القرآن قبل 1300 عام: "وَالسَّمَاءَ بَنَيْنَاهَا بِأَيْدٍ وَإِنَّا لَمُوسِعُونَ"',
    description: 'Edwin Hubble proved the universe is expanding, as stated in the Quran 1300 years earlier',
    category: 'cosmological',
    miracleId: 'universe-expansion',
    color: '#4A90D9',
  },
  {
    id: 'big-bang-1965',
    year: 1965,
    titleAr: 'اكتشاف إشعاع الخلفية الكونية',
    title: 'Cosmic Microwave Background discovered',
    descriptionAr: 'اكتشاف إشعاع الخلفية الكونية الذي أكد نظرية الانفجار العظيم — دخان السماء',
    description: 'CMB radiation confirmed Big Bang theory — the cosmic smoke',
    category: 'cosmological',
    miracleId: 'big-bang',
    color: '#4A90D9',
  },
  {
    id: 'embryology-moore',
    year: 1982,
    titleAr: 'كيث مور يؤكد مراحل الجنين القرآنية',
    title: 'Keith Moore confirms Quranic embryology stages',
    descriptionAr: 'أكد البروفيسور كيث مور أن مراحل تطور الجنين المذكورة في القرآن تتطابق تماماً مع العلم الحديث',
    description: 'Professor Keith Moore confirmed that Quranic embryology stages match modern science precisely',
    category: 'biological',
    miracleId: 'embryology-stages',
    color: '#2dd4a8',
  },
  {
    id: 'mountains-pegs',
    year: 1966,
    titleAr: 'اكتشاف جذور الجبال العميقة',
    title: 'Discovery of deep mountain roots',
    descriptionAr: 'أثبت علم الجيولوجيا الحديث أن للجبال جذوراً عميقة تشبه الأوتاد كما وصفها القرآن',
    description: 'Modern geology proved mountains have deep peg-like roots as described in the Quran',
    category: 'earth-sciences',
    miracleId: 'mountains-pegs',
    color: '#e67e22',
  },
  {
    id: 'deep-sea-darkness',
    year: 1990,
    titleAr: 'تأكيد ظلمات أعماق البحار',
    title: 'Deep sea darkness confirmed',
    descriptionAr: 'أكدت الأبحاث البحرية وجود طبقات من الظلام في أعماق المحيطات كما وصفها القرآن بدقة',
    description: 'Marine research confirmed layers of darkness in ocean depths as precisely described in the Quran',
    category: 'earth-sciences',
    miracleId: 'deep-sea-darkness',
    color: '#e67e22',
  },
  {
    id: 'honey-research',
    year: 2007,
    titleAr: 'الأبحاث الحديثة تؤكد شفاء العسل',
    title: 'Modern research confirms honey healing',
    descriptionAr: 'أكدت الأبحاث الطبية الحديثة الخصائص العلاجية للعسل كما ذكرها القرآن',
    description: 'Modern medical research confirmed the therapeutic properties of honey as mentioned in the Quran',
    category: 'biological',
    miracleId: 'honey-healing',
    color: '#2dd4a8',
  },
  {
    id: 'fine-tuning',
    year: 2010,
    titleAr: 'الضبط الدقيق للكون يتأكد',
    title: 'Fine-tuning of the universe confirmed',
    descriptionAr: 'تتراكم الأدلة على أن ثوابت الكون مضبوطة بدقة متناهية لتسمح بالحياة — دليل على الخالق المدبر',
    description: 'Mounting evidence shows universal constants are precisely tuned for life — evidence of purposeful design',
    category: 'logical-philosophical',
    miracleId: 'fine-tuning',
    color: '#9b59b6',
  },
];

export default function TimelinePage() {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <main className="min-h-screen pt-28 pb-20">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-16">
          <h1 className="font-amiri text-4xl md:text-5xl font-bold mb-4 gold-gradient-text">
            الخط الزمني
          </h1>
          <p className="text-text-secondary font-tajawal text-base max-w-3xl mx-auto">
            رحلة عبر الزمن تُظهر كيف أثبت العلم الحديث ما ذكره القرآن قبل أكثر من 1400 عام
          </p>
        </motion.div>

        {/* Timeline */}
        <div ref={containerRef} className="relative max-w-4xl mx-auto">
          {/* Vertical Line */}
          <div className="absolute right-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-gold-primary/50 via-gold-primary/20 to-transparent" />

          {timelineEvents.map((event, i) => {
            const isLeft = i % 2 === 0;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: isLeft ? 30 : -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className={`relative flex items-center mb-16 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
              >
                {/* Content Card */}
                <div className={`w-[calc(50%-2rem)] ${isLeft ? 'text-left pl-8' : 'text-right pr-8'}`}>
                  <button
                    onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                    className="w-full text-right"
                  >
                    <div
                      className={`glass-card p-6 transition-all hover:scale-[1.02] ${
                        selectedEvent?.id === event.id ? 'ring-1 shadow-lg' : ''
                      }`}
                      style={{
                        borderColor: selectedEvent?.id === event.id ? event.color + '50' : undefined,
                        boxShadow: selectedEvent?.id === event.id ? `0 0 30px ${event.color}20` : undefined,
                      }}
                    >
                      {/* Year */}
                      <div
                        className="inline-block px-3 py-1 rounded-lg text-sm font-bold font-tajawal mb-3"
                        style={{ background: `${event.color}15`, color: event.color }}
                      >
                        {event.year} م
                        {event.yearEnd && ` - ${event.yearEnd} م`}
                      </div>

                      <h3 className="font-amiri text-lg font-bold text-text-primary mb-1">
                        {event.titleAr}
                      </h3>
                      <p className="text-text-muted text-xs font-tajawal mb-3">{event.title}</p>

                      {selectedEvent?.id === event.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="overflow-hidden"
                        >
                          <p className="text-text-secondary text-sm font-tajawal leading-relaxed">
                            {event.descriptionAr}
                          </p>
                          {event.miracleId && (
                            <Link
                              to={`/ijaz/miracles/${miracles.find((m) => m.id === event.miracleId)?.slug || '#'}`}
                              className="inline-flex items-center gap-1 mt-3 text-xs font-tajawal font-bold transition-colors"
                              style={{ color: event.color }}
                            >
                              اقرأ المعجزة كاملة
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="m15 18-6-6 6-6" />
                              </svg>
                            </Link>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </button>
                </div>

                {/* Center Dot */}
                <div className="absolute right-1/2 translate-x-1/2 z-10">
                  <div
                    className="w-5 h-5 rounded-full border-2 border-vanta"
                    style={{
                      background: event.color,
                      boxShadow: `0 0 15px ${event.color}60`,
                    }}
                  />
                </div>

                {/* Spacer */}
                <div className="w-[calc(50%-2rem)]" />
              </motion.div>
            );
          })}

          {/* End marker */}
          <div className="absolute right-1/2 translate-x-1/2 bottom-0">
            <div className="w-3 h-3 rounded-full bg-gold-primary/30" />
          </div>
        </div>

        {/* Legend */}
        <div className="max-w-4xl mx-auto mt-12 flex flex-wrap justify-center gap-4">
          {[
            { label: 'كوني', color: '#4A90D9' },
            { label: 'أحيائي', color: '#2dd4a8' },
            { label: 'أرضي', color: '#e67e22' },
            { label: 'عقلي', color: '#9b59b6' },
            { label: 'تاريخي', color: '#d4a853' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
              <span className="text-text-muted text-xs font-tajawal">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
