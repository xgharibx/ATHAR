
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { IjazIcon } from '@/ijaz/components/ui/IjazIcon';
import { arNum } from '@/lib/formatNumber';
import { Link } from 'react-router-dom';
import { ScrollReveal } from '@/ijaz/components/effects/ScrollAnimations';
import { AnimatedGradientText } from '@/ijaz/components/effects/TextEffects';

/* Dynamic imports — no SSR */

/* ================================================================
   JOURNEY DATA
   ================================================================ */
interface JourneyStep {
  id: number;
  titleAr: string;
  titleEn: string;
  icon: string;
  gradientFrom: string;
  gradientTo: string;
  questionAr: string;
  contentAr: string;
  verseAr?: string;
  verseSurah?: string;
  evidenceAr: string[];
  linkSlug?: string;
  linkLabel?: string;
  bgVariant: 'cosmic' | 'divine' | 'deep' | 'golden';
  particleVariant: 'stars' | 'gold-dust' | 'divine-light' | 'nebula' | 'geometric';
}

export const journeySteps: JourneyStep[] = [
  {
    id: 1,
    titleAr: 'السؤال الأول',
    titleEn: 'The First Question',
    icon: 'skeptic',
    gradientFrom: '#e74c3c',
    gradientTo: '#c0392b',
    questionAr: 'هل يمكن أن يوجد شيء من لا شيء؟',
    contentAr: 'كل شيء حولك له سبب. الكرسي الذي تجلس عليه، الهاتف الذي تقرأ منه، الهواء الذي تتنفسه — كله له صانع. فما بالك بالكون بأكمله؟\n\nالعلم يقول: الكون له بداية (الانفجار العظيم — ١٣.٨ مليار سنة). ما بدأ لا بد أن بدأه شيء. وما بدأه لا بد أن يكون خارج الزمان والمكان والمادة — أي إله.',
    verseAr: 'أَمْ خُلِقُوا مِنْ غَيْرِ شَيْءٍ أَمْ هُمُ الْخَالِقُونَ',
    verseSurah: 'الطور: ٣٥',
    evidenceAr: [
      'دليل الكلام الكوني: كل ما بدأ له سبب، الكون بدأ، إذن للكون سبب',
      'قانون الديناميكا الحرارية الثاني يثبت أن الكون ليس أزليًا',
      'نظرية بورد-فيلنكين-جوث أثبتت استحالة الكون الأزلي',
    ],
    linkSlug: 'big-bang',
    linkLabel: 'اقرأ عن الانفجار العظيم',
    bgVariant: 'cosmic',
    particleVariant: 'stars',
  },
  {
    id: 2,
    titleAr: 'التصميم الدقيق',
    titleEn: 'The Fine-Tuning',
    icon: 'cosmos',
    gradientFrom: '#d4a853',
    gradientTo: '#f0d68a',
    questionAr: 'لماذا الكون مضبوط بدقة مذهلة؟',
    contentAr: 'الثوابت الكونية مضبوطة بدقة لا يمكن تصورها. لو تغيرت قوة الجاذبية بمقدار ١ من ١٠^٤٠ لما وجدت نجوم ولا حياة. لو تغيرت القوة النووية بمقدار ٢% لما تكونت ذرات.\n\nهذا ليس حظًا — هذا تصميم. والتصميم يستلزم مصممًا. حتى الفيزيائيون الملحدون يعترفون بهذا: فريد هويل قال “التفسير العقلاني يقترح عقلًا فائقًا”.',
    verseAr: 'إِنَّا كُلَّ شَيْءٍ خَلَقْنَاهُ بِقَدَرٍ',
    verseSurah: 'القمر: ٤٩',
    evidenceAr: [
      'ثابت البنية الدقيقة (α = ١/١٣٧) مضبوط بدقة ١٠^-٤٠',
      'ثابت بولتزمان ١٠^-١٢٣ مضبوط بدقة مذهلة',
      'فريد هويل وروجر بنروز اعترفا بدليل التصميم الدقيق',
    ],
    linkSlug: 'fine-tuning',
    linkLabel: 'اقرأ عن الضبط الدقيق',
    bgVariant: 'golden',
    particleVariant: 'gold-dust',
  },
  {
    id: 7,
    titleAr: 'أصل الحياة',
    titleEn: 'The Origin of Life',
    icon: 'microscopic',
    gradientFrom: '#06b6d4',
    gradientTo: '#0284c7',
    questionAr: 'كيف نشأت الحياة من مادة جامدة؟',
    contentAr: `DNA يحمل معلومات أكثر من أي مكتبة بشرية. مكتشف DNA فرانسيس كريك قال: "احتمال نشوء الحياة عشوائيًا على الأرض ضئيل للغاية لدرجة تجعله شبه مستحيل".

كمية المعلومات في الجين الواحد = 10^40,000 بت. احتمال تشكّل بروتين واحد عشوائيًا: 1/10^164. وعدد الذرات في الكون: 10^80.

الانفجار الكمبري: ظهور مفاجئ لـ 50 شعبة حيوانية دون أسلاف — معضلة يعترف بها المتخصصون.

الحياة لا تنشأ من المادة وحدها — هي تحتاج معلومة مُبرمَجة. والمعلومة تصدر دائمًا عن عقل.`,
    verseAr: 'وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ',
    verseSurah: 'الأنبياء: ٣٠',
    evidenceAr: [
      'DNA يحمل ٣.٢ مليار "حرف" من المعلومات — أكثر من موسوعة بريتانيكا بألف مرة',
      'احتمال تشكّل بروتين واحد عشوائيًا: ١/١٠^١٦٤ — أصغر من حدود الاحتمال الكوني',
      'الانفجار الكمبري: ٥٠ شعبة حيوانية ظهرت فجأة دون أسلاف تطورية معروفة',
    ],
    linkSlug: 'origin-of-life-argument',
    linkLabel: 'اقرأ عن أصل الحياة',
    bgVariant: 'deep',
    particleVariant: 'nebula',
  },
  {
    id: 3,
    titleAr: 'القرآن يتحدى',
    titleEn: 'The Quran Challenges',
    icon: 'book',
    gradientFrom: '#2dd4a8',
    gradientTo: '#10b981',
    questionAr: 'إذا كان هناك إله، فكيف نعرف أي رسالة منه؟',
    contentAr: 'إذا أرسل الله رسالة، فلا بد أن تحمل بصمته — شيئًا لا يمكن لبشر محاكاته. القرآن فعل هذا بطريقة فريدة: لم يكتفِ بأن يدّعي — بل تحدّى.\n\nتحدى كل البشر والجن أن يأتوا بمثله. ومرت ١٤٠٠ سنة — ولم يستطع أحد. لكن الأعجب: القرآن لم يكتفِ بالتحدي اللغوي — بل تضمن معلومات علمية لم تُكتشف إلا بعد قرون.',
    verseAr: 'قُل لَّئِنِ اجْتَمَعَتِ الْإِنسُ وَالْجِنُّ عَلَىٰ أَن يَأْتُوا بِمِثْلِ هَٰذَا الْقُرْآنِ لَا يَأْتُونَ بِمِثْلِهِ',
    verseSurah: 'الإسراء: ٨٨',
    evidenceAr: [
      'تحدي مفتوح منذ ١٤٠٠ سنة ولم ينجح أحد',
      'القرآن تحدى تدريجيًا: مثله → ١٠ سور → سورة واحدة',
      'عجز أبلغ عرب الفصاحة الذين حاربوا لكنهم لم يستطيعوا التقليد',
    ],
    linkSlug: 'quran-inimitability-challenge',
    linkLabel: 'اقرأ عن تحدي القرآن',
    bgVariant: 'divine',
    particleVariant: 'divine-light',
  },
  {
    id: 4,
    titleAr: 'الدليل الساحق',
    titleEn: 'The Crushing Evidence',
    icon: 'scientist',
    gradientFrom: '#4A90D9',
    gradientTo: '#2563eb',
    questionAr: 'ما الدليل على أن القرآن من الله؟',
    contentAr: 'هنا تبدأ الرحلة الحقيقية. تخيل رجلًا أُمّيًا في صحراء الجزيرة العربية في القرن السابع:\n\n• وصف توسع الكون بدقة (اكتُشف ١٩٢٩)\n• وصف مراحل الجنين بدقة (اكتُشف ١٩٧٤)\n• وصف جذور الجبال كالأوتاد (اكتُشف ١٩٠٦)\n• وصف ظلمات أعماق البحر (اكتُشف ١٩٦٠)\n• وصف منطقة الناصية في الدماغ (اكتُشف ٢٠٠٠)\n\n٥٠+ معجزة علمية. ولا خطأ واحد. احتمال الصدفة: ١/١٠^٥٠.',
    verseAr: 'سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ',
    verseSurah: 'فصلت: ٥٣',
    evidenceAr: [
      '٥٠+ معجزة علمية موثقة في الكونيات والأحياء والأرض',
      'كل معجزة سبقت العلم بمئات السنين',
      'لا يوجد خطأ علمي واحد في كل القرآن',
    ],
    linkSlug: 'universe-expansion',
    linkLabel: 'استكشف المعجزات',
    bgVariant: 'deep',
    particleVariant: 'nebula',
  },
  {
    id: 5,
    titleAr: 'النبوءات',
    titleEn: 'The Prophecies',
    icon: 'spark',
    gradientFrom: '#8b5cf6',
    gradientTo: '#6366f1',
    questionAr: 'هل يمكن لأحد أن يتنبأ بالمستقبل؟',
    contentAr: 'القرآن فعلها. وليس مرة واحدة.\n\nتنبأ بانتصار الروم في أقل من ٩ سنوات — وحدث. تنبأ بحفظ جسد فرعون — وها هو في المتحف. تنبأ بفتح القسطنطينية — وفُتحت ١٤٥٣. تنبأ بعلامات الساعة من كثرة الزلازل إلى تطاول الرعاة في البنيان.\n\nكل نبوءة إضافية تتحقق تُضعف احتمال الصدق أضعافًا مضاعفة.',
    verseAr: 'غُلِبَتِ الرُّومُ فِي أَدْنَى الْأَرْضِ وَهُم مِّن بَعْدِ غَلَبِهِمْ سَيَغْلِبُونَ',
    verseSurah: 'الروم: ٢–٣',
    evidenceAr: [
      'نبوءة انتصار الروم تحققت بالحرف',
      'جسد فرعون محفوظ في المتحف المصري كما أخبر القرآن',
      'علامات الساعة تتحقق واحدة تلو الأخرى',
    ],
    linkSlug: 'romans-victory-prophecy',
    linkLabel: 'اقرأ عن النبوءات',
    bgVariant: 'cosmic',
    particleVariant: 'geometric',
  },
  {
    id: 8,
    titleAr: 'البشارات في الكتب السماوية',
    titleEn: 'Biblical Prophecies',
    icon: 'timeline',
    gradientFrom: '#e879f9',
    gradientTo: '#a855f7',
    questionAr: 'هل يُذكر محمد ﷺ في الكتاب المقدس؟',
    contentAr: `الإجابة: نعم. وليس مرة واحدة.

• التثنية 18:18: "أقيم لهم نبيًا من إخوتهم مثلك" — الإخوة هم أبناء إسماعيل، ومثل موسى يعني نبيًا أمّيًا جاء بشريعة كاملة.
• نشيد الأناشيد 5:16: كلمة "محمداً" موجودة حرفيًا في النص العبري الأصلي.
• إشعياء 42: "عبدي الذي أنصره" — وصف مطابق للنبي ﷺ وبلاد العرب.
• يوحنا 16:7: "الباراكليت" الذي يعلّم كل شيء = البارقليطا = أحمد ﷺ.`,
    verseAr: 'الَّذِينَ يَتَّبِعُونَ الرَّسُولَ النَّبِيَّ الْأُمِّيَّ الَّذِي يَجِدُونَهُ مَكْتُوبًا عِندَهُمْ فِي التَّوْرَاةِ وَالْإِنجِيلِ',
    verseSurah: 'الأعراف: ١٥٧',
    evidenceAr: [
      'التثنية ١٨:١٨ — "من إخوتهم" تشير لبني إسماعيل، ولم تتحقق في أي نبي آخر',
      'نشيد الأناشيد ٥:١٦ — كلمة "محمداً" موجودة حرفيًا في النص العبري الأصلي',
      'يوحنا ١٦:٧ — "الباراكليت" لا ينطبق على الروح القدس بل على نبي بشري',
    ],
    linkSlug: 'prophecy-in-torah',
    linkLabel: 'اقرأ عن البشارات في الكتب السماوية',
    bgVariant: 'divine',
    particleVariant: 'divine-light',
  },
  {
    id: 6,
    titleAr: 'الخُلاصة',
    titleEn: 'The Conclusion',
    icon: 'spark',
    gradientFrom: '#d4a853',
    gradientTo: '#f0d68a',
    questionAr: 'ماذا يعني كل هذا؟',
    contentAr: 'لقد رأيت الآن:\n\n١. الكون له خالق (دليل القَلام الكوني)\n٢. الخالق ذكي وعالِم (دليل الضبط الدقيق)\n٣. محمد ﷺ لم يكن يملك هذا العلم (أُمّي في الصحراء)\n٤. القرآن يحمل علمًا لم يكن ممكنًا (٥٠+ معجزة)\n٥. النبوءات تحققت (إخبار بالغيب)\n٦. البشارات مكتوبة في الكتب السابقة\n\nالخلاصة المنطقية الوحيدة: هذا الكتاب من عند الله، ومحمد ﷺ رسوله.\n\nوإذا كان القرآن من الله — فالإسلام حق.',
    verseAr: 'وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ',
    verseSurah: 'الأنبياء: ١٠٧',
    evidenceAr: [
      'المنطق يقول: كتاب يحمل علم الخالق = من الخالق',
      'لا تفسير بديل معقول لمصدر هذا العلم',
      '١٤٠٠ سنة من التحدي المفتوح بدون إجابة',
    ],
    bgVariant: 'golden',
    particleVariant: 'gold-dust',
  },
];

/* ================================================================
   JOURNEY PAGE — CINEMATIC FULL-SCREEN EXPERIENCE
   ================================================================ */
export default function JourneyPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [unlockedSteps, setUnlockedSteps] = useState([0]);
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll();
  const headerOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);

  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= journeySteps.length) return;
      setDirection(index > currentStep ? 1 : -1);
      setCurrentStep(index);
      if (!unlockedSteps.includes(index)) {
        setUnlockedSteps((prev) => [...prev, index]);
      }
      containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    [currentStep, unlockedSteps]
  );

  const step = journeySteps[currentStep];
  const progress = ((currentStep + 1) / journeySteps.length) * 100;

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0, scale: 0.95 }),
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020617]" dir="rtl">
      {/* ===== BACKGROUND: Pure CSS stars per step (replaces WebGL for mobile performance) ===== */}
      <div className="fixed inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.bgVariant + step.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0"
          >
            <div className="absolute inset-0 dhikr-page-stars" style={{ opacity: 0.28 }} />
            <div className="absolute inset-0 dhikr-card-stars" style={{ opacity: 0.16 }} />
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 80% 55% at 50% 28%, ${step.gradientFrom}28 0%, ${step.gradientTo}0f 42%, transparent 70%)`,
              }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(2,6,23,0.06) 0%, rgba(2,6,23,0.30) 100%)' }}
            />
          </motion.div>
        </AnimatePresence>
        {/* Solid dark scrim — keeps text readable */}
        <div className="absolute inset-0 z-2" style={{ background: 'rgba(2,6,23,0.52)' }} />
        {/* Edge vignette for depth */}
        <div className="absolute inset-0 z-3 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(2,6,23,0.80)_100%)]" />
      </div>

      {/* ===== FLOATING PROGRESS BAR ===== */}
      <motion.div
        style={{ opacity: headerOpacity }}
        className="fixed top-0 left-0 right-0 z-50 bg-vanta/60 backdrop-blur-2xl border-b border-border-subtle/30"
      >
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/ijaz" className="text-gold-primary font-amiri text-lg font-bold hover:text-gold-light transition-colors">
            {'الإعجاز العلمي'}
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-text-muted text-xs font-tajawal">
              {arNum(currentStep + 1)} من {arNum(journeySteps.length)}
            </span>
            <div className="w-40 h-1 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${step.gradientFrom}, ${step.gradientTo})` }}
                animate={{ width: progress + '%' }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== SIDE DOT NAVIGATION ===== */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-4">
        {journeySteps.map((s, i) => {
          const isActive = i === currentStep;
          const isUnlocked = unlockedSteps.includes(i);
          return (
            <button
              key={s.id}
              onClick={() => isUnlocked && goToStep(i)}
              className="group relative flex items-center"
              disabled={!isUnlocked}
            >
              {/* Label on hover */}
              <span className="absolute left-10 bg-vanta/90 backdrop-blur-xs text-text-primary text-xs font-tajawal px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap border border-border-subtle/30">
                {s.titleAr}
              </span>
              {/* Dot */}
              <motion.div
                animate={{
                  scale: isActive ? 1.4 : 1,
                  boxShadow: isActive ? `0 0 16px ${s.gradientFrom}60` : '0 0 0px transparent',
                }}
                className="w-3 h-3 rounded-full border-2 transition-colors"
                style={{
                  borderColor: isActive ? s.gradientFrom : isUnlocked ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                  backgroundColor: isActive ? s.gradientFrom : isUnlocked ? 'rgba(255,255,255,0.05)' : 'transparent',
                }}
              />
              {/* Connecting line */}
              {i < journeySteps.length - 1 && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-px h-4" style={{ background: isUnlocked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div ref={containerRef} className="relative z-10 min-h-screen flex flex-col justify-center py-24 sm:py-32">
        <div className="container mx-auto px-6 max-w-3xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Step Badge */}
              <ScrollReveal variant="fade-up">
                <div className="text-center mb-8">
                  <motion.div
                    className="inline-flex items-center gap-3 px-5 py-2 rounded-full glass-premium mb-6"
                    style={{ borderColor: step.gradientFrom + '30' }}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                  >
                    <IjazIcon name={step.icon} size={26} style={{ color: step.gradientFrom }} />
                    <span className="text-sm font-tajawal font-bold" style={{ color: step.gradientFrom }}>
                      {step.titleAr}
                    </span>
                  </motion.div>

                  {/* The Question — cinematic reveal */}
                  <h1 className="font-amiri text-2xl sm:text-3xl md:text-5xl font-bold leading-relaxed">
                    <AnimatedGradientText
                      colors={[step.gradientFrom, step.gradientTo, '#ffffff', step.gradientFrom]}
                    >
                      {step.questionAr}
                    </AnimatedGradientText>
                  </h1>
                </div>
              </ScrollReveal>

              {/* Verse (if any) */}
              {step.verseAr && (
                <motion.div
                  className="text-center my-7 py-5 px-4 rounded-2xl glass-premium cosmic-border"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <p
                    className="font-amiri text-verse-green text-xl md:text-2xl leading-loose verse-glow-pulse"
                  >
                    {step.verseAr}
                  </p>
                  {step.verseSurah && (
                    <p className="text-gold-primary/50 text-xs font-tajawal mt-4">{step.verseSurah}</p>
                  )}
                </motion.div>
              )}

              {/* Content Card */}
              <motion.div
                className="holographic-card rounded-2xl p-5 sm:p-8 mb-7"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <div className="text-text-secondary font-tajawal text-base md:text-lg leading-loose whitespace-pre-line">
                  {step.contentAr}
                </div>
              </motion.div>

              {/* Evidence Points */}
              <div className="stack-y-2.5 mb-7">
                <p className="text-text-muted text-xs font-tajawal tracking-widest uppercase mb-4">
                  {'الأدلة'}
                </p>
                {step.evidenceAr.map((ev, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.12 }}
                    className="flex items-start gap-3 p-3.5 sm:p-5 rounded-xl glass-premium group hover:scale-[1.01] transition-transform"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs"
                      style={{ background: step.gradientFrom + '18', color: step.gradientFrom }}
                    >
                      {arNum(i + 1)}
                    </div>
                    <p className="text-text-secondary font-tajawal text-sm leading-relaxed">{ev}</p>
                  </motion.div>
                ))}
              </div>

              {/* Link to related miracle */}
              {step.linkSlug && (
                <motion.div
                  className="text-center mb-10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <Link
                    to={'/ijaz/miracles/' + step.linkSlug}
                    className="inline-flex items-center gap-2 text-sm font-tajawal px-5 py-2.5 rounded-xl glass-premium hover:scale-105 transition-all group"
                    style={{ borderColor: step.gradientFrom + '30' }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="group-hover:translate-x-1 transition-transform"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    <span style={{ color: step.gradientFrom }}>{step.linkLabel}</span>
                  </Link>
                </motion.div>
              )}

              {/* ===== NAVIGATION BUTTONS ===== */}
              <motion.div
                className="flex items-center justify-between gap-4 pt-8 border-t border-white/5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
              >
                <button
                  onClick={() => goToStep(currentStep - 1)}
                  disabled={currentStep === 0}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl glass-premium text-text-muted hover:text-text-primary disabled:opacity-20 disabled:cursor-not-allowed transition-all font-tajawal text-sm group"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="group-hover:translate-x-1 transition-transform"
                  >
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                  {'الخطوة السابقة'}
                </button>

                {currentStep < journeySteps.length - 1 ? (
                  <button
                    onClick={() => goToStep(currentStep + 1)}
                    className="flex items-center gap-2 px-7 py-3 rounded-xl font-tajawal text-sm font-bold text-white transition-all breathing-glow group"
                    style={{ background: `linear-gradient(135deg, ${step.gradientFrom}, ${step.gradientTo})` }}
                  >
                    {'الخطوة التالية'}
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="group-hover:-translate-x-1 transition-transform"
                    >
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </button>
                ) : (
                  <Link
                    to="/ijaz/miracles"
                    className="flex items-center gap-2 px-7 py-3 rounded-xl font-tajawal text-sm font-bold text-vanta breathing-glow"
                    style={{ background: 'linear-gradient(135deg, #d4a853, #f0d68a)' }}
                  >
                    {'استكشف جميع الأدلة'}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="m15 18-6-6 6-6" />
                    </svg>
                  </Link>
                )}
              </motion.div>

              {/* ===== SHAHADA — Final Step ===== */}
              {currentStep === journeySteps.length - 1 && (
                <motion.div
                  className="mt-16 text-center"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2, duration: 0.8 }}
                >
                  <div className="holographic-card rounded-2xl p-10 cosmic-border">
                    <p className="text-gold-primary/40 text-xs font-tajawal tracking-widest uppercase mb-8">
                      {'إذا وصلت إلى اليقين...'}
                    </p>
                    <p
                      className="font-amiri text-3xl md:text-4xl lg:text-5xl leading-loose mb-8 verse-glow-pulse"
                      style={{ color: '#d4a853', textShadow: '0 0 60px rgba(212,168,83,0.3)' }}
                    >
                      {'أشهد أن لا إله إلا الله'}
                      <br />
                      {'وأشهد أن محمدًا رسول الله'}
                    </p>
                    <div className="flex items-center justify-center gap-4 mb-8">
                      <div className="h-px w-20 bg-linear-to-r from-transparent to-gold-primary/30" />
                      <span className="text-gold-primary/30 text-2xl">{'﷽'}</span>
                      <div className="h-px w-20 bg-linear-to-l from-transparent to-gold-primary/30" />
                    </div>
                    <p className="text-text-secondary font-tajawal text-sm leading-relaxed max-w-md mx-auto mb-10">
                      {'هذه الشهادة هي الباب. إذا آمنت بما رأيت، فانطقها بقلبك أولًا. الله يسمع حتى ما لم تنطق به.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                      <Link
                        to="/ijaz/miracles"
                        className="px-7 py-3 rounded-xl font-tajawal font-bold text-sm text-vanta breathing-glow"
                        style={{ background: 'linear-gradient(135deg, #d4a853, #f0d68a)' }}
                      >
                        {'استكشف المزيد من الأدلة'}
                      </Link>
                      <Link
                        to="/ijaz/refute"
                        className="px-7 py-3 rounded-xl border border-gold-primary/30 text-gold-primary font-tajawal font-bold text-sm hover:bg-gold-primary/10 transition-all"
                      >
                        {'عندي شبهات'}
                      </Link>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* ===== MOBILE STEP DOTS ===== */}
          <div className="flex lg:hidden items-center justify-center gap-2 mt-12">
            {journeySteps.map((s, i) => (
              <button
                key={s.id}
                onClick={() => unlockedSteps.includes(i) && goToStep(i)}
                disabled={!unlockedSteps.includes(i)}
                className="w-2.5 h-2.5 rounded-full transition-all"
                style={{
                  background: i === currentStep ? s.gradientFrom : unlockedSteps.includes(i) ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                  transform: i === currentStep ? 'scale(1.4)' : 'scale(1)',
                  boxShadow: i === currentStep ? `0 0 12px ${s.gradientFrom}50` : 'none',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
