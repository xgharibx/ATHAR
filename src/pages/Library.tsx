import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpenText } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { IconButton } from "@/components/ui/IconButton";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { cn } from "@/lib/utils";

type LibrarySection = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  accent: string;
  route: string;
  badge?: string;
  featured?: boolean;
};

const LIBRARY_SECTIONS: LibrarySection[] = [
  {
    id: "companion",
    title: "رفيق أثر",
    subtitle: "مرشدك الذكي الشخصي",
    description: "رفيق ذكي يعرف رحلتك اليومية ويقترح خطوتك التالية، مع محادثة مؤصلة بالمصادر وضوابط شرعية.",
    icon: "🤝",
    accent: "#c96f4a",
    route: "/companion",
    badge: "جديد",
    featured: true,
  },
  {
    id: "sharh",
    title: "الموسوعة الحديثية",
    subtitle: "شرح علمي لكل حديث",
    description: "آلاف الأحاديث مع الشرح والفوائد وغريب الألفاظ ودرجة الحديث — بإشراف علمي مُراجع، وتُحفظ لقراءتها دون اتصال.",
    icon: "📖",
    accent: "#2ec4b6",
    route: "/library/sharh",
    badge: "جديد",
    featured: true,
  },
  {
    id: "tasmee",
    title: "التسميع",
    subtitle: "اختبر حفظك للقرآن",
    description: "أخفِ الآيات وسمِّع من حفظك — كشف تدريجي كلمة بكلمة، ومتابعة صوتية حيّة حيث يدعمها جهازك.",
    icon: "🎙️",
    accent: "#7b6cf6",
    route: "/tasmee",
    badge: "جديد",
    featured: true,
  },
  {
    id: "asma",
    title: "أسماء الله الحسنى",
    subtitle: "تدبر ومعانٍ مختصرة",
    description: "أسماء الله الحسنى في بطاقات هادئة تساعد على الحفظ والتأمل والعمل.",
    icon: "✨",
    accent: "#eab308",
    route: "/asma",
    featured: true,
  },
  {
    id: "hadith",
    title: "أحاديث",
    subtitle: "كتب الحديث والمختارات النبوية",
    description: "كل بطاقات الحديث داخل مكان واحد: كتب الحديث، المختارات، البحث، الفوائد، والتصفية بالموضوع.",
    icon: "📚",
    accent: "#10b981",
    route: "/hadith",
    badge: "المكتبة الحديثية",
  },
  {
    id: "stories",
    title: "قصص الأنبياء",
    subtitle: "قصص مرتبة بفصول ودروس",
    description: "رحلة إيمانية مع الأنبياء عليهم السلام بأسلوب بطاقات قابلة للفتح والحفظ والمشاركة.",
    icon: "🕌",
    accent: "#f59e0b",
    route: "/stories",
  },
  {
    id: "seerah",
    title: "السيرة النبوية",
    subtitle: "16 كتاباً في حياة النبي ﷺ",
    description: "السيرة المفصلة من النسب والولادة إلى الوفاة الشريفة، فصلاً فصلاً داخل بطاقات منظمة.",
    icon: "🌙",
    accent: "#10b981",
    route: "/seerah",
  },
  {
    id: "companions",
    title: "الصحابة",
    subtitle: "سير موجزة لأصحاب النبي ﷺ",
    description: "بطاقات تعريفية بروح تربوية عن الصحابة الكرام ومواقفهم وأثرهم.",
    icon: "🌟",
    accent: "#f97316",
    route: "/companions",
  },
  {
    id: "islam-pillars",
    title: "أركان الإسلام",
    subtitle: "الدعائم الخمس للإسلام",
    description: "شرح أركان الإسلام الخمسة من الشهادتين إلى الحج بالأدلة من الكتاب والسنة الصحيحة.",
    icon: "🕋",
    accent: "#10b981",
    route: "/islam-pillars",
  },
  {
    id: "faith-pillars",
    title: "أركان الإيمان",
    subtitle: "الأصول الستة للإيمان",
    description: "أركان الإيمان الستة من حديث جبريل: الإيمان بالله وملائكته وكتبه ورسله واليوم الآخر والقدر.",
    icon: "💎",
    accent: "#f59e0b",
    route: "/faith-pillars",
  },
  {
    id: "angels",
    title: "الملائكة",
    subtitle: "عالم الملائكة ووظائفهم",
    description: "تعرّف على الملائكة الواردين في القرآن والسنة وما أخبر به النبي ﷺ عنهم ووظائف كلٍّ منهم.",
    icon: "�",
    accent: "#38bdf8",
    route: "/angels",
  },
  {
    id: "divine-books",
    title: "الكتب السماوية",
    subtitle: "كتب الله وأنبياؤها",
    description: "الكتب التي أنزلها الله على رسله: القرآن والتوراة والإنجيل والزبور والصحف، ومن أُنزلت عليه.",
    icon: "📜",
    accent: "#a78bfa",
    route: "/divine-books",
  },
  {
    id: "faith-branches",
    title: "شُعَب الإيمان",
    subtitle: "بضعٌ وسبعون شعبة",
    description: "شُعب الإيمان من حديث النبي ﷺ مقسّمة إلى أعمال القلب واللسان والجوارح.",
    icon: "🌿",
    accent: "#22c55e",
    route: "/faith-branches",
  },
  {
    id: "major-sins",
    title: "الكبائر",
    subtitle: "أعظم الذنوب والتحذير منها",
    description: "تعريف الكبائر والسبع الموبقات وأمهات الذنوب بالأدلة، تذكيرًا وتحذيرًا للنفس.",
    icon: "⚠️",
    accent: "#ef4444",
    route: "/major-sins",
  },
  {
    id: "wudu",
    title: "الوضوء",
    subtitle: "خطوات الطهارة العملية",
    description: "دليل واضح ومتدرج لأعمال الوضوء والسنن والتنبيهات المهمة.",
    icon: "💧",
    accent: "#06b6d4",
    route: "/wudu",
  },
  {
    id: "prayer-guide",
    title: "كيفية الصلاة",
    subtitle: "تعلم الصلاة خطوة بخطوة",
    description: "دليل عملي من التكبير إلى التسليم مع ترتيب يساعد على الفهم والمراجعة.",
    icon: "🧎",
    accent: "#8b5cf6",
    route: "/prayer-guide",
  },
  {
    id: "quran-vocab",
    title: "مفردات القرآن",
    subtitle: "معاني قرآنية قريبة",
    description: "مفردات مختارة من القرآن الكريم مع المعنى والسياق لتقريب التدبر.",
    icon: "📖",
    accent: "#22c55e",
    route: "/quran-vocab",
  },
  {
    id: "hadith-memo",
    title: "حفظ الحديث",
    subtitle: "مراجعة وتثبيت الأحاديث",
    description: "مساحة مخصصة لحفظ الأحاديث ومراجعتها بطريقة منظمة داخل التطبيق.",
    icon: "🏅",
    accent: "#ec4899",
    route: "/hadith/memo",
  },
  {
    id: "duas",
    title: "الأدعية",
    subtitle: "أدعية جامعة ومأثورة",
    description: "مجموعة أدعية مرتبة للقراءة اليومية والمواقف المتكررة.",
    icon: "🤲",
    accent: "#14b8a6",
    route: "/duas",
  },
  {
    id: "ruqyah",
    title: "الرقية الشرعية",
    subtitle: "آيات وأدعية مأثورة",
    description: "الفاتحة، آية الكرسي، المعوذات، وأدعية نبوية للرقية الشرعية.",
    icon: "🛡️",
    accent: "#6366f1",
    route: "/ruqyah",
  },
];

function LibraryHubCard({ section }: { section: LibrarySection }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(section.route)}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 text-right transition press-effect cv-auto",
        section.featured ? "col-span-full min-h-[150px]" : "min-h-[168px]"
      )}
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${section.accent} 18%, var(--card)), var(--card))`,
        borderColor: `color-mix(in srgb, ${section.accent} 35%, var(--stroke))`,
      }}
    >
      <div className="pointer-events-none absolute inset-0 dhikr-card-stars opacity-45" aria-hidden="true" />
      <div className="relative flex h-full flex-col">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
            style={{
              background: `color-mix(in srgb, ${section.accent} 16%, transparent)`,
              border: `1px solid color-mix(in srgb, ${section.accent} 28%, transparent)`,
            }}
            aria-hidden="true"
          >
            {section.icon}
          </div>
          <ArrowRight size={16} className="mt-2 shrink-0 rotate-180 opacity-35 transition group-hover:opacity-70" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          {section.badge && (
            <div
              className="mb-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{ background: `color-mix(in srgb, ${section.accent} 16%, transparent)`, color: section.accent }}
            >
              {section.badge}
            </div>
          )}
          <h2 className="font-arabic text-base font-bold leading-7" style={{ color: section.accent }}>
            {section.title}
          </h2>
          <p className="mt-0.5 text-xs font-semibold opacity-60">{section.subtitle}</p>
          <p className="mt-3 text-xs leading-6 opacity-65 line-clamp-3">{section.description}</p>
        </div>
      </div>
    </button>
  );
}

function LibraryHubView() {
  const navigate = useNavigate();
  const featured = LIBRARY_SECTIONS.find((section) => section.featured);
  const sections = LIBRARY_SECTIONS.filter((section) => !section.featured);

  return (
    <div className="space-y-4 page-enter" dir="rtl">
      <Card className="relative overflow-hidden p-5">
        <div className="pointer-events-none absolute inset-0 dhikr-card-stars opacity-45" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-0 opacity-45"
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, #10b981 13%, transparent), color-mix(in srgb, #f59e0b 9%, transparent))",
          }}
          aria-hidden="true"
        />
        <div className="relative flex items-start gap-3">
          <IconButton aria-label="رجوع" onClick={() => navigate(-1)}><ArrowRight size={18} /></IconButton>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <BookOpenText size={19} aria-hidden="true" className="text-[var(--accent)]" />
              <span className="text-xs opacity-60">مكتبة أثر</span>
            </div>
            <h1 className="text-xl font-bold">المكتبة الإسلامية</h1>
            <p className="mt-2 text-sm leading-7 opacity-70">
              كل أبواب المحتوى في مكان واحد: حديث، سيرة، قصص، أدعية، عبادات، وحفظ.
            </p>
          </div>
        </div>
      </Card>

      {featured && <LibraryHubCard section={featured} />}

      <div className="grid grid-cols-2 gap-3" role="list" aria-label="أقسام المكتبة">
        {sections.map((section) => (
          <div key={section.id} role="listitem">
            <LibraryHubCard section={section} />
          </div>
        ))}
      </div>
    </div>
  );
}


export function LibraryPage() {
  useScrollRestoration();
  return <LibraryHubView />;
}
