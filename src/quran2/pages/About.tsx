import { useQ2Text } from "../hooks";
import { MORPHOLOGY_CREDIT } from "../data/morphology";

const SOURCES = [
  {
    title: "نص المصحف",
    body: "الرسم العثماني من مشروع تنزيل، الإصدار ١٫١، محفوظ في التطبيق كما هو حرفًا حرفًا مع إشعار حقوقه، ويتحقق اختبار آلي من أن كل آية تُعرض كما وردت في الملف. التطبيق لا يغيّر فيه شيئًا.",
    link: { label: "tanzil.net", href: "https://tanzil.net" },
    licence: "رخصة المشاع الإبداعي، النسبة ٣٫٠ (نسخ حرفي دون تغيير)",
  },
  {
    title: "بيانات المصحف",
    body: "ترتيب النزول، والأجزاء، وأرباع الأحزاب، والمنازل، وصفحات مصحف المدينة، والسجدات: من بيانات مشروع تنزيل.",
    link: { label: "tanzil.net", href: "https://tanzil.net" },
    licence: "رخصة المشاع الإبداعي، النسبة ٣٫٠",
  },
  {
    title: "صرف الكلمات وإعرابها وجذورها",
    body: "من المدوّنة القرآنية العربية (الإصدار ٠٫٤)، بالنسخة العربية المنقّحة من مشروع quran-morphology. تُنزَّل عند أول استعمال وتبقى على جهازك.",
    link: { label: "corpus.quran.com", href: MORPHOLOGY_CREDIT.url },
    licence: "رخصة غنو العمومية (GPL) الإصدار ٣",
  },
  {
    title: "التلاوات وتوقيت الكلمات",
    body: "تلاوات كاملة مع توقيت كل كلمة، من Quran.com وQuranicAudio.",
    link: { label: "quran.com", href: "https://quran.com" },
    licence: "شروط مقدّم الخدمة",
  },
  {
    title: "التفاسير",
    body: "الميسّر، والسعدي، وابن كثير، والطبري، والقرطبي، والبغوي، والوسيط: عبر واجهة Quran.com، وتبقى كل آية قرأت تفسيرها على جهازك.",
    link: { label: "quran.com", href: "https://quran.com" },
    licence: "شروط مقدّم الخدمة والناشرين",
  },
];

export default function Q2About() {
  const text = useQ2Text();
  return (
    <main className="q2-main">
      <h1 className="q2-h1">عن «القرآن ٢»</h1>
      <p className="q2-soft" style={{ marginTop: 8, lineHeight: 2 }}>
        قسم قرآن ثانٍ في أثر، بُني من الصفر بمصادر مختارة من جديد وموثّقة، دون أن يأخذ شيئًا من القسم الأول. النص مقدّس: لا يُغيَّر فيه حرف،
        ولا يُعرض إلا ما في المصدر، ولا تُنشئ الآلة فيه محتوى دينيًا. كل ما تحفظه وتقرؤه يبقى على جهازك.
      </p>
      {SOURCES.map((s) => (
        <section key={s.title} className="q2-card" style={{ padding: 16, marginTop: 12 }}>
          <h2 className="q2-h2">{s.title}</h2>
          <p style={{ marginTop: 6, lineHeight: 1.9, fontSize: 15 }}>{s.body}</p>
          <p className="q2-small" style={{ marginTop: 6 }}>
            <a className="q2-link" href={s.link.href} target="_blank" rel="noreferrer"><bdi dir="ltr">{s.link.label}</bdi></a> · {s.licence}
          </p>
        </section>
      ))}
      {text.data?.notice ? (
        <details className="q2-card" style={{ padding: 16, marginTop: 12 }}>
          <summary style={{ fontWeight: 700, cursor: "pointer" }}>إشعار حقوق نص تنزيل (كما ورد)</summary>
          <pre dir="ltr" style={{ whiteSpace: "pre-wrap", fontSize: 11.5, lineHeight: 1.6, marginTop: 10, color: "var(--q2-soft)" }}>{text.data.notice}</pre>
        </details>
      ) : null}
    </main>
  );
}
