/**
 * Account panel — sign in / out, and account deletion.
 *
 * Sign-in is optional everywhere in Athar, so this renders as a calm, opt-in
 * card rather than a gate. When Supabase credentials are absent the whole thing
 * hides itself instead of showing a button that cannot work.
 *
 * The delete flow is deliberately two-step and spells out what is lost: Google
 * Play requires an in-app account-deletion path for any app offering accounts,
 * and an accidental one-tap wipe of someone's years of dhikr history would be
 * the worst possible bug in this app.
 */
import * as React from "react";
import { toast } from "react-hot-toast";
import { LogIn, LogOut, Mail, ShieldCheck, Trash2, Loader2, Check } from "lucide-react";

import {
  deleteAccount,
  displayNameOf,
  isAuthConfigured,
  signInWithEmail,
  signInWithGoogle,
  signOut,
} from "@/lib/authClient";
import { useAuthSession } from "@/hooks/useAuthSession";

export function AccountPanel() {
  const { session, loading, configured } = useAuthSession();
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState<null | "google" | "email" | "out" | "delete">(null);
  const [linkSent, setLinkSent] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  if (!configured || !isAuthConfigured()) return null;

  const user = session?.user ?? null;

  const doGoogle = async () => {
    setBusy("google");
    const res = await signInWithGoogle();
    setBusy(null);
    if (!res.ok) toast.error(res.error ?? "تعذّر تسجيل الدخول");
  };

  const doEmail = async () => {
    setBusy("email");
    const res = await signInWithEmail(email);
    setBusy(null);
    if (res.ok) {
      setLinkSent(true);
      toast.success("أرسلنا لك رابط الدخول — تفقّد بريدك");
    } else {
      toast.error(res.error ?? "تعذّر الإرسال");
    }
  };

  const doSignOut = async () => {
    setBusy("out");
    const res = await signOut();
    setBusy(null);
    if (res.ok) toast("تم تسجيل الخروج — بياناتك على هذا الجهاز كما هي", { icon: "👋" });
    else toast.error(res.error ?? "تعذّر تسجيل الخروج");
  };

  const doDelete = async () => {
    setBusy("delete");
    const res = await deleteAccount();
    setBusy(null);
    setConfirmDelete(false);
    if (res.ok) toast.success("تم حذف الحساب وبياناته من السحابة");
    else toast.error(res.error ?? "تعذّر حذف الحساب");
  };

  return (
    <div className="rounded-2xl border border-[var(--stroke)] bg-[var(--card)] p-4" dir="rtl">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
        <div className="font-semibold">الحساب والمزامنة</div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-sm text-[var(--muted)]">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>جارٍ التحقق…</span>
        </div>
      ) : user ? (
        <>
          <p className="text-sm text-[var(--fg)]">
            مسجَّل الدخول باسم <span className="font-semibold text-[var(--accent)]">{displayNameOf(user)}</span>
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            تُحفظ أذكارك وسلسلتك ومفضلتك وتذكيراتك في حسابك، وتعود معك على أي جهاز.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={doSignOut}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--stroke)] bg-[var(--card-2)] px-3 py-2 text-xs font-semibold transition active:scale-95 disabled:opacity-50"
            >
              {busy === "out" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <LogOut className="h-3.5 w-3.5" aria-hidden="true" />}
              تسجيل الخروج
            </button>

            <button
              type="button"
              onClick={() => setConfirmDelete((v) => !v)}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-xl border border-danger-30 bg-danger-15 px-3 py-2 text-xs font-semibold text-[var(--danger)] transition active:scale-95 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              حذف الحساب
            </button>
          </div>

          {confirmDelete ? (
            <div className="mt-3 rounded-xl border border-danger-30 bg-danger-15 p-3">
              <p className="text-xs leading-relaxed text-[var(--fg)]">
                سيُحذف حسابك وكل ما هو محفوظ في السحابة نهائيًا ولا يمكن التراجع.
                <br />
                بيانات هذا الجهاز ستبقى كما هي — لن تفقد أذكارك المحفوظة محليًا.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={doDelete}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--danger)] px-3 py-1.5 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50"
                >
                  {busy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                  نعم، احذف نهائيًا
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-[var(--stroke)] px-3 py-1.5 text-xs"
                >
                  تراجع
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-[var(--muted)]">
            سجّل الدخول لتُحفظ أذكارك وسلسلتك ومفضلتك وتذكيراتك، وتعود معك على أي جهاز.
            التطبيق يعمل كاملًا بدون حساب — هذا اختياري تمامًا.
          </p>

          <button
            type="button"
            onClick={doGoogle}
            disabled={busy !== null}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-[var(--on-accent,#0a0a0c)] transition active:scale-95 disabled:opacity-50"
          >
            {busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
            المتابعة عبر Google
          </button>

          <div className="my-3 flex items-center gap-2 text-[10px] text-[var(--muted-2)]">
            <span className="h-px flex-1 bg-[var(--stroke)]" />
            أو عبر البريد
            <span className="h-px flex-1 bg-[var(--stroke)]" />
          </div>

          {linkSent ? (
            <div className="flex items-center gap-2 rounded-xl border border-accent-35 bg-accent-15 px-3 py-2.5 text-xs text-[var(--accent)]">
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>أرسلنا رابط الدخول إلى {email} — افتحه من نفس الجهاز.</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && email.trim()) void doEmail(); }}
                placeholder="you@example.com"
                aria-label="البريد الإلكتروني"
                className="form-field-readable min-w-0 flex-1 rounded-xl border border-[var(--stroke)] bg-[var(--card-2)] px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={doEmail}
                disabled={busy !== null || !email.trim()}
                aria-label="أرسل رابط الدخول"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--stroke)] bg-[var(--card-2)] px-3 py-2 text-xs font-semibold transition active:scale-95 disabled:opacity-40"
              >
                {busy === "email" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Mail className="h-3.5 w-3.5" aria-hidden="true" />}
                إرسال
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
