import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";

/**
 * The rulings behind the numbers, in plain words, so the person is not asked to
 * trust a counter on a question of religion. Kept short and attributed; where
 * scholars differ the page says so rather than choosing silently.
 */
const ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "هل قضاء الصلوات الفائتة واجب؟",
    a: "نعم عند جمهور العلماء، ومن تركها عمدًا عليه أن يتوب ويقضيها. وفي المسألة قول آخر لبعض أهل العلم، والأحوط القضاء مع التوبة.",
  },
  {
    q: "لا أعرف عدد ما فاتني، ماذا أفعل؟",
    a: "يُقدَّر العدد بغلبة الظن، ويُؤخذ بالأحوط إن تردد بين عددين، فالقضاء دَين والأحوط أن تبرأ منه. لذلك تحسب الأداة ثلاثة أرقام: الأدنى والأرجح والأحوط، وتبدأ بالأحوط.",
  },
  {
    q: "كيف أقضي بأيسر طريقة؟",
    a: "أن تصلي مع كل فرض حاضر فرضًا فائتًا مثله: تصلي الظهر ثم تقضي ظهرًا. هكذا لا يزيد عليك وقت ولا يثقل عليك الأمر. وما زاد عن المطلوب يُحتسب نافلة إن شاء الله.",
  },
  {
    q: "هل يجب الترتيب بين الفوائت؟",
    a: "الأصل أن تقضيها مرتبة، ويسقط الترتيب عند كثرة الفوائت أو مشقته. وتُنبهك الأداة إلى الترتيب فقط حين يبقى خمس صلوات أو أقل.",
  },
  {
    q: "النساء: الحيض والنفاس",
    a: "الحائض والنفساء لا تقضيان الصلاة التي فاتتهما في أيام العذر، لكنهما تقضيان الصيام. ولذلك تخصم الأداة هذه الأيام من حساب الصلاة تلقائيًا.",
  },
  {
    q: "الوتر",
    a: "واجب عند الحنفية فيدخل في القضاء، وسنة مؤكدة عند الجمهور فلا يلزم قضاؤه وإن كان حسنًا.",
  },
  {
    q: "قضاء الصيام وموعد رمضان القادم",
    a: "يجب قضاء ما أفطره الإنسان بلا عذر أو لعذر. فإن أخّره حتى جاء رمضان آخر بلا عذر فالجمهور على إطعام مسكين عن كل يوم مع القضاء، والحنفية على القضاء فقط. وقد أخذت دار الإفتاء المصرية بوجوب القضاء دون فدية.",
  },
  {
    q: "دقة التقويم الهجري",
    a: "العدّ التنازلي يعتمد على حساب فلكي تقريبي، وقد يختلف يومًا أو ثلاثة عن الرؤية. لذلك تعتبر الأداة أن رمضان يأتي قبل موعده بيومين احتياطًا.",
  },
];

export function QadaaGuidance() {
  const [open, setOpen] = React.useState<number | null>(null);
  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold mb-1">أحكام وإرشادات</h2>
      <p className="text-xs text-[var(--muted)] mb-3 leading-6">
        ملخص عملي لما استندت إليه الأداة. إن كانت حالتك خاصة فاسأل مفتيًا أو دار الإفتاء.
      </p>
      <div className="space-y-2">
        {ITEMS.map((it, i) => {
          const isOpen = open === i;
          return (
            <div key={it.q} className="rounded-2xl bg-[var(--card)]">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-right text-sm font-medium"
              >
                <span>{it.q}</span>
                <ChevronDown size={16} className={isOpen ? "rotate-180 transition" : "transition"} />
              </button>
              {isOpen && <p className="px-4 pb-4 text-sm leading-7 text-[var(--muted)]">{it.a}</p>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
