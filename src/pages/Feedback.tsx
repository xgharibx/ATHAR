import * as React from "react";

type Category = "problem" | "feature" | "suggestion" | "content" | "other";
const categories: Array<{ value: Category; label: string }> = [
  { value: "problem", label: "مشكلة واجهتني" },
  { value: "feature", label: "ميزة أتمنّاها" },
  { value: "suggestion", label: "اقتراح لتطوير أثر" },
  { value: "content", label: "ملاحظة على المحتوى" },
  { value: "other", label: "رسالة أخرى" },
];
const FEEDBACK_ENDPOINT = "https://ojstudhmcypoqfnwugbf.supabase.co/functions/v1/athar-feedback";

/** Fallback for cached/older PWA navigation; main public page lives at /feedback/index.html. */
export function FeedbackPage() {
  const [category, setCategory] = React.useState<Category>("suggestion");
  const [message, setMessage] = React.useState("");
  const [senderName, setSenderName] = React.useState("");
  const [contact, setContact] = React.useState("");
  const [shareConsent, setShareConsent] = React.useState(false);
  const [website, setWebsite] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<{ success: boolean; message: string } | null>(null);

  React.useLayoutEffect(() => {
    // Keep the standalone and React fallback looking identical without loading
    // page-specific theme CSS anywhere else in ATHAR.
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/feedback/feedback.css";
    stylesheet.setAttribute("data-athar-feedback-style", "");
    document.head.appendChild(stylesheet);

    // The shared script configures a user-initiated app-opening link only.
    const returnScript = document.createElement("script");
    returnScript.src = "/feedback/return.js";
    returnScript.defer = true;
    document.body.appendChild(returnScript);

    return () => {
      stylesheet.remove();
      returnScript.remove();
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || message.trim().length < 10) return;
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), 15000);
    setSending(true);
    setResult(null);
    try {
      const response = await fetch(FEEDBACK_ENDPOINT, {
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
        if (response.status === 429) throw new Error("وصلت إلى الحد اليومي من الرسائل. جرّب غدًا إن شاء الله.");
        throw new Error("تعذّر إرسال الرسالة الآن. يُرجى المحاولة مرة أخرى.");
      }
      setResult({ success: true, message: "وصلتنا رسالتك، جزاك الله خيرًا على اهتمامك بأثر." });
      setCategory("suggestion");
      setMessage("");
      setSenderName("");
      setContact("");
      setShareConsent(false);
      setWebsite("");
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "تعذّر الإرسال. جرّب مرة أخرى.",
      });
    } finally {
      globalThis.clearTimeout(timeout);
      setSending(false);
    }
  }

  return (
    <main className="af-page" dir="rtl" aria-label="صندوق رسائل أثر">
      <div className="af-stars" aria-hidden="true" />
      <div className="af-wrap">
        <header className="af-hero">
          <a className="af-wordmark" href="/" aria-label="أثر — الصفحة الرئيسية">
            <svg className="af-fingerprint" viewBox="-112 -91 224 219" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="none">
              <g stroke="#d8ba78" strokeLinecap="round">
                <path d="M -86 -4 C -56 -66,56 -66,86 -4" strokeWidth="5.5" />
                <path d="M -92 18 C -60 -56,60 -56,92 18" strokeWidth="5" />
                <path d="M -86 42 C -54 -38,54 -38,86 42" strokeWidth="4.5" />
                <path d="M -72 66 C -42 -22,42 -22,72 66" strokeWidth="4" />
                <path d="M -52 86 C -28 -8,28 -8,52 86" strokeWidth="3.5" />
                <path d="M -28 102 C -14 18,14 18,28 102" strokeWidth="3" />
              </g>
            </svg>
            <span className="af-signature">أثر</span>
          </a>
          <div className="af-kicker">مساحة للإصغاء</div>
          <h1>صوتك يترك أثرًا</h1>
          <p>لعلّ كلمةً منك تُصلح شيئًا، أو تفتح بابًا لنفعٍ جديد. أخبرنا بما واجهته أو بما تتمنّاه في أثر، على راحتك وبلا حاجة لذكر اسمك.</p>
        </header>
        <section className="af-panel" aria-label="إرسال ملاحظة إلى مطوّر أثر">
          <p className="af-intro">كل رسالة محلّ عناية، وكل اقتراح قد يصنع فرقًا.</p>
          <form onSubmit={(event) => void submit(event)} autoComplete="off">
            <fieldset className="af-fieldset">
              <legend className="af-legend">ما الذي تحب أن تخبرنا به؟</legend>
              <div className="af-choices">
                {categories.map((option) => (
                  <label className="af-choice" key={option.value}>
                    <input type="radio" name="category" required checked={category === option.value} value={option.value} onChange={() => setCategory(option.value)} />
                    <span className="af-choice-text">{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="af-field">
              <label className="af-label" htmlFor="feedback-message">رسالتك *</label>
              <textarea className="af-textarea" id="feedback-message" required minLength={10} maxLength={3000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="اكتب ما في خاطرك بكل وضوح…" />
              <p className="af-hint">الحد الأدنى 10 أحرف، والحد الأقصى 3000 حرف.</p>
            </div>
            <div className="af-field">
              <label className="af-label" htmlFor="feedback-name">اسمك <span className="af-hint">(اختياري)</span></label>
              <input className="af-input" id="feedback-name" maxLength={80} value={senderName} onChange={(event) => setSenderName(event.target.value)} placeholder="يمكنك تركه فارغًا" />
            </div>
            <div className="af-field">
              <label className="af-label" htmlFor="feedback-contact">وسيلة للرد عليك <span className="af-hint">(اختياري)</span></label>
              <input className="af-input" id="feedback-contact" maxLength={160} value={contact} onChange={(event) => setContact(event.target.value)} placeholder="البريد الإلكتروني أو وسيلة تواصل مناسبة" />
              <p className="af-hint">لا يلزمك ترك أي بيانات للتواصل، إلا إذا أحببت أن نتواصل معك.</p>
            </div>
            <fieldset className="af-share">
              <legend>هل تسمح لنا بمشاركة نص رسالتك في مجموعة أثر على واتساب؟</legend>
              <p className="af-hint">المشاركة ليست تلقائية، وسنراجع الرسالة ونزيل أي معلومات شخصية قبل نشرها. لا تُنشر أسماء أو وسائل تواصل.</p>
              <label className="af-radio">
                <input type="radio" name="share_consent" checked={!shareConsent} onChange={() => setShareConsent(false)} />
                <span>لا، أفضّل أن تبقى رسالتي خاصة.</span>
              </label>
              <label className="af-radio">
                <input type="radio" name="share_consent" checked={shareConsent} onChange={() => setShareConsent(true)} />
                <span>نعم، أسمح بمشاركة نصها بعد إخفاء هويتي.</span>
              </label>
            </fieldset>
            <div className="af-privacy-escape" aria-hidden="true">
              <label htmlFor="feedback-website">Website</label>
              <input id="feedback-website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
            </div>
            <p className="af-note">خصوصيتك أمانة. لا تُعرض رسالتك للمستخدمين الآخرين، وتُحفظ لدى خدمة استضافة أثر لمراجعتها. يُرجى عدم إرسال كلمات مرور أو معلومات شديدة الحساسية.</p>
            <button className="af-submit" type="submit" disabled={sending}>{sending ? "جارٍ إرسال الرسالة…" : "إرسال الرسالة"}</button>
            <p className="af-status" data-success={result?.success ? "true" : undefined} role="status" aria-live="polite">{result?.message ?? ""}</p>
          </form>
        </section>
        <footer className="af-footer">
          <a className="af-back" data-af-return href="/">العودة إلى أثر <span aria-hidden="true">←</span></a>
          <p className="af-footer-sign">هَمْسَةٌ تُطَمْئِنُ قَلْبَكَ، وَتَتْرُكُ أَثَرًا</p>
        </footer>
      </div>
    </main>
  );
}
