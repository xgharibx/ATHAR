import * as React from "react";
import { Link } from "react-router-dom";

type Category = "problem" | "feature" | "suggestion" | "content" | "other";

const options: { key: Category; title: string }[] = [
  { key: "problem", title: "🛠️ مشكلة واجهتني" },
  { key: "feature", title: "✨ ميزة أتمناها" },
  { key: "suggestion", title: "🌿 اقتراح لتطوير أثر" },
  { key: "content", title: "📖 ملاحظة على المحتوى" },
  { key: "other", title: "💌 رسالة أخرى" },
];

const endpoint = "https://ojstudhmcypoqfnwugbf.supabase.co/functions/v1/athar-feedback";

export function FeedbackPage() {
  const [category, setCategory] = React.useState<Category>("suggestion");
  const [message, setMessage] = React.useState("");
  const [senderName, setSenderName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [shareConsent, setShareConsent] = React.useState(false);
  const [website, setWebsite] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || message.trim().length < 10) return;
    setSending(true);
    setResult(null);
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          category,
          message: message.trim(),
          sender_name: senderName.trim(),
          contact: contact.trim(),
          share_consent: shareConsent,
          website,
        }),
      });
      if (!response.ok) {
        if (response.status === 429) throw new Error("وصلت للحد اليومي من الرسائل. جرّب غدًا إن شاء الله.");
        throw new Error("تعذّر إرسال الرسالة الآن. حاول مرة أخرى لاحقًا.");
      }
      setResult({ ok: true, text: "وصلتنا رسالتك بنجاح 🌿 جزاك الله خيرًا على اهتمامك بأثر." });
      setCategory("suggestion");
      setMessage("");
      setSenderName("");
      setContact("");
      setShareConsent(false);
      setWebsite("");
    } catch (error) {
      setResult({
        ok: false,
        text: error instanceof Error && error.message.startsWith("وصلت") ? error.message : "تعذّر إرسال الرسالة. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.",
      });
    } finally {
      globalThis.clearTimeout(timeout);
      setSending(false);
    }
  }

  const labelClass = "mb-2 block text-sm font-bold text-[#193d2a]";
  const fieldClass = "w-full rounded-xl border border-[#d6e1d7] bg-[#fafcf9] px-4 py-3 text-[#193d2a] outline-none focus:border-[#318357] focus:ring-2 focus:ring-[#318357]/20";

  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f8f3] px-4 py-8 text-[#193d2a]" style={{ backgroundImage: "radial-gradient(ellipse at top, #e5efe4, #f7f8f3 65%)" }}>
      <div className="mx-auto max-w-xl">
        <header className="mb-7 text-center">
          <Link to="/" aria-label="العودة إلى تطبيق أثر" className="inline-flex justify-center">
            <img src="/logo.svg" alt="أثر" className="h-20 w-20 object-contain" />
          </Link>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">صوتك يترك أثرًا</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-8 text-[#587060]">
            هنا مساحتك لتخبرنا بمشكلة واجهتك أو فكرة تتمناها في أثر. يمكنك الإرسال دون تسجيل دخول أو كتابة اسمك.
          </p>
        </header>
        <form onSubmit={(event) => void submit(event)} className="rounded-3xl border border-[#dce6db] bg-white p-5 shadow-xl shadow-[#12492b]/5 sm:p-9">
          <fieldset>
            <legend className={labelClass}>تحب تقول لنا إيه؟</legend>
            <div className="mb-6 grid grid-cols-2 gap-2.5">
              {options.map((option) => (
                <label key={option.key} className={`flex min-h-[64px] cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-sm focus-within:ring-2 focus-within:ring-[#318357] ${category === option.key ? "border-[#318357] bg-[#e7f1e9] font-bold" : "border-[#dae4d9] bg-[#f9fbf8]"}`}>
                  <input className="sr-only" type="radio" name="category" value={option.key} checked={category === option.key} onChange={() => setCategory(option.key)} />
                  <span>{option.title}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className={labelClass} htmlFor="athar-feedback-message">رسالتك *</label>
          <textarea id="athar-feedback-message" className={fieldClass + " min-h-[155px] resize-y"} required minLength={10} maxLength={3000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="اكتب اللي في بالك بكل راحة ووضوح…" />
          <p className="mb-5 mt-1 text-xs text-[#677d6f]">من 10 إلى 3000 حرف.</p>
          <label className={labelClass} htmlFor="athar-feedback-name">اسمك (اختياري)</label>
          <input id="athar-feedback-name" className={fieldClass + " mb-5"} maxLength={80} autoComplete="off" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="اتركه فارغًا لو تحب تفضل مجهولًا" />
          <label className={labelClass} htmlFor="athar-feedback-contact">وسيلة للرد عليك (اختياري)</label>
          <input id="athar-feedback-contact" className={fieldClass} maxLength={160} autoComplete="off" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="بريد إلكتروني أو وسيلة تواصل" />
          <p className="mb-6 mt-1 text-xs leading-6 text-[#677d6f]">لو حابب نرد عليك، سيب لنا وسيلة تواصل. مش مطلوب رقمك أو تسجيل دخول.</p>

          <fieldset className="mb-5 rounded-2xl border border-[#d9e4d9] p-4">
            <legend className="px-1 text-sm font-bold">هل تسمح لنا بمشاركة رسالتك في جروب واتساب الخاص بأثر؟</legend>
            <p className="mb-3 text-xs leading-6 text-[#536d5b]">المشاركة اختيارية وليست تلقائية. إذا وافقت، سنراجع نص الرسالة أولًا ونحذف أي أسماء أو معلومات تعرّف بك، إلا إذا وافقت على ذكرها بشكل منفصل.</p>
            <label className="mb-3 flex cursor-pointer items-start gap-2 text-sm">
              <input type="radio" name="share_consent" className="mt-1 accent-[#246340]" checked={!shareConsent} onChange={() => setShareConsent(false)} />
              <span>لا، أفضل أن تظل رسالتي خاصة.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input type="radio" name="share_consent" className="mt-1 accent-[#246340]" checked={shareConsent} onChange={() => setShareConsent(true)} />
              <span>نعم، أوافق على مشاركة نص الرسالة بعد مراجعتها وإخفاء هويتي.</span>
            </label>
          </fieldset>
          <div className="hidden" aria-hidden="true">
            <label htmlFor="athar-feedback-website">Website</label>
            <input id="athar-feedback-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <p className="mb-5 rounded-xl bg-[#eff4ee] p-3 text-xs leading-7 text-[#4b6754]">
            🔒 رسالتك لا تظهر للمستخدمين الآخرين. تُحفظ لدى استضافة أثر لمراجعتها، وكتابة بياناتك الشخصية اختيارية. لا ترسل كلمات مرور أو معلومات شديدة الحساسية.
          </p>
          <button type="submit" disabled={sending} className="min-h-[52px] w-full rounded-xl bg-[#20583b] px-5 py-3 font-bold text-white transition-colors hover:bg-[#16452f] disabled:opacity-60">
            {sending ? "جارٍ إرسال الرسالة…" : "إرسال الرسالة"}
          </button>
          {result && <p role="status" aria-live="polite" className={`mt-4 text-center text-sm ${result.ok ? "text-[#1b753f]" : "text-red-700"}`}>{result.text}</p>}
        </form>
        <footer className="mt-7 text-center text-xs leading-7 text-[#738476]">
          أثر — همسة تطمئن قلبك وتترك أثرًا
          <br />
          <Link className="text-[#246747] underline" to="/">العودة إلى أثر</Link>
        </footer>
      </div>
    </main>
  );
}
