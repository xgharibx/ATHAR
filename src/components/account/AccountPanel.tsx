/**
 * Account panel — sign in / out, and account deletion.
 *
 * Core reading and local features remain available without sign-in; accounts
 * enable cloud sync and Companion replies. When Supabase credentials are absent
 * the whole thing hides itself instead of showing a button that cannot work.
 *
 * The delete flow is deliberately two-step and spells out what is lost: Google
 * Play requires an in-app account-deletion path for any app offering accounts,
 * and an accidental one-tap wipe of someone's years of dhikr history would be
 * the worst possible bug in this app.
 */
import * as React from "react";
import { toast } from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import { LogIn, LogOut, Mail, ShieldCheck, Trash2, Loader2, Check, RefreshCw, CloudOff, AlertTriangle } from "lucide-react";

import {
  canSignInWithApple,
  deleteAccount,
  displayNameOf,
  isAuthConfigured,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
  signOut,
} from "@/lib/authClient";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useSyncStatus } from "@/hooks/useCloudSync";
import { flushCloudSync, syncNow } from "@/lib/syncClient";

/** "منذ 3 دقائق" — relative, because an absolute timestamp tells the user
 *  nothing about whether sync is actually keeping up. */
function relativeTime(ms: number | null): string {
  if (!ms) return "لم تتم بعد";
  const secs = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (secs < 60) return "الآن";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.round(hours / 24)} يوم`;
}

export function AccountPanel() {
  const { session, loading, configured } = useAuthSession();
  const sync = useSyncStatus();
  const [email, setEmail] = React.useState("");
  const [busy, setBusy] = React.useState<null | "apple" | "google" | "email" | "out" | "delete">(null);
  const [linkSent, setLinkSent] = React.useState(false);
  const [confirmDeleteFor, setConfirmDeleteFor] = React.useState<string | null>(null);
  const [showSignOutAnyway, setShowSignOutAnyway] = React.useState(false);

  React.useEffect(() => {
    setShowSignOutAnyway(false);
    setConfirmDeleteFor(null);
  }, [session?.user?.id]);

  if (!configured || !isAuthConfigured()) return null;

  // App Store guideline 4.8: an app that offers a third-party login must also offer Sign in with
  // Apple. The iPhone app now has it (native sheet), so Google is offered there too.
  const showApple = canSignInWithApple();
  const showGoogle = showApple || Capacitor.getPlatform() !== "ios";

  const user = session?.user ?? null;
  const confirmDelete = Boolean(user?.id && confirmDeleteFor === user.id);

  const doGoogle = async () => {
    setBusy("google");
    const res = await signInWithGoogle();
    setBusy(null);
    if (!res.ok) toast.error(res.error ?? "تعذّر تسجيل الدخول");
  };

  const doApple = async () => {
    setBusy("apple");
    const res = await signInWithApple();
    setBusy(null);
    if (!res.ok && res.error) toast.error(res.error);
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

  const doSignOut = async (keepLocalOnly = false) => {
    setBusy("out");
    // Push anything still sitting in the debounce window first, or the last few
    // minutes of dhikr would only exist on this device.
    const flushed = keepLocalOnly ? false : await flushCloudSync();
    if (!flushed && !keepLocalOnly) {
      setBusy(null);
      setShowSignOutAnyway(true);
      toast.error("لم تكتمل المزامنة بعد. ابقَ مسجّل الدخول وأعد المحاولة عند توفر الاتصال.");
      return;
    }
    const res = await signOut();
    setBusy(null);
    if (res.ok) {
      setShowSignOutAnyway(false);
      toast(keepLocalOnly
        ? "تم تسجيل الخروج — بقيت تغييراتك على هذا الجهاز وستُزامن عند دخولك مجددًا"
        : "تم تسجيل الخروج — بياناتك على هذا الجهاز كما هي", { icon: "👋" });
    }
    else toast.error(res.error ?? "تعذّر تسجيل الخروج");
  };

  const doDelete = async () => {
    const confirmedUserId = confirmDeleteFor;
    if (!confirmedUserId || confirmedUserId !== user?.id) return;
    setBusy("delete");
    // Deletion has its own verified identity handoff. Do not make account
    // deletion depend on flushing unrelated app data, which may be large or
    // temporarily unsyncable.
    const res = await deleteAccount(confirmedUserId);
    setBusy(null);
    setConfirmDeleteFor(null);
    if (res.ok) toast.success("تم حذف الحساب وبياناته من السحابة");
    else toast.error(res.error ?? "تعذّر حذف الحساب");
  };

  return (
    <div className="rounded-2xl border border-(--stroke) bg-(--card) p-4" dir="rtl">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-(--accent)" aria-hidden="true" />
        <div className="font-semibold">الحساب والمزامنة</div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-2 text-sm text-(--muted)">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>جارٍ التحقق…</span>
        </div>
      ) : user ? (
        <>
          <p className="text-sm text-(--fg)">
            مسجَّل الدخول باسم <span className="font-semibold text-(--accent)">{displayNameOf(user)}</span>
          </p>

          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-(--stroke) bg-(--card-2) px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              {sync.phase === "syncing" ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-(--accent)" aria-hidden="true" />
              ) : sync.phase === "offline" ? (
                <CloudOff className="h-3.5 w-3.5 shrink-0 text-(--muted)" aria-hidden="true" />
              ) : sync.phase === "error" ? (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-(--danger)" aria-hidden="true" />
              ) : (
                <Check className="h-3.5 w-3.5 shrink-0 text-(--accent)" aria-hidden="true" />
              )}
              <span className="truncate text-xs text-(--muted)">
                {sync.phase === "syncing"
                  ? "جارٍ المزامنة…"
                  : sync.phase === "offline"
                    ? "بدون اتصال — ستُزامن تلقائيًا عند عودة الشبكة"
                    : sync.phase === "error"
                      ? sync.error ?? "تعذّرت المزامنة — نعيد المحاولة تلقائيًا"
                      : sync.pending
                        ? "سنحفظ تغييراتك خلال لحظات…"
                        : `المزامنة تلقائية، آخر مزامنة ${relativeTime(sync.lastSyncedAt)}`}
              </span>
            </div>
            {/* Deliberately quiet: sync is automatic on edit, on focus, on
                reconnect and on a timer, and retries itself after a failure.
                This is an escape hatch for the impatient, not a step anyone
                has to remember — so it must not look like a required action. */}
            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={sync.phase === "syncing"}
              aria-label="زامن الآن"
              title="المزامنة تتم تلقائيًا — هذا للتحديث الفوري فقط"
              className="inline-flex shrink-0 items-center rounded-lg p-1.5 text-(--muted-2) transition hover:text-(--accent) active:scale-95 disabled:opacity-40"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("athar-request-data-import"))}
              disabled={busy !== null}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-(--stroke) bg-(--card-2) px-3 py-2 text-xs font-semibold transition active:scale-95 disabled:opacity-50"
            >
              نسخ بيانات الجهاز إلى الحساب
            </button>

            <button
              type="button"
              onClick={() => void doSignOut()}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-xl border border-(--stroke) bg-(--card-2) px-3 py-2 text-xs font-semibold transition active:scale-95 disabled:opacity-50"
            >
              {busy === "out" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <LogOut className="h-3.5 w-3.5" aria-hidden="true" />}
              تسجيل الخروج
            </button>

            <button
              type="button"
              onClick={() => setConfirmDeleteFor((current) => current === user.id ? null : user.id)}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-xl border border-danger-30 bg-danger-15 px-3 py-2 text-xs font-semibold text-(--danger) transition active:scale-95 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              حذف الحساب
            </button>
          </div>

          {showSignOutAnyway && (
            <div className="mt-3 rounded-xl border border-(--stroke) bg-(--card-2) p-3" role="status">
              <p className="text-xs leading-relaxed text-(--muted)">
                لم تُرفع أحدث التغييرات بعد. يمكنك إعادة المحاولة أو تسجيل الخروج مع إبقائها على هذا الجهاز.
              </p>
              <button
                type="button"
                onClick={() => void doSignOut(true)}
                disabled={busy !== null}
                className="mt-2 min-h-[44px] rounded-xl border border-(--stroke) px-3 py-2 text-xs font-semibold disabled:opacity-50"
              >
                تسجيل الخروج مع الاحتفاظ بالتغييرات هنا
              </button>
            </div>
          )}

          {confirmDelete ? (
            <div className="mt-3 rounded-xl border border-danger-30 bg-danger-15 p-3">
              <p className="text-xs leading-relaxed text-(--fg)">
                سيُحذف حسابك وكل ما هو محفوظ في السحابة نهائيًا ولا يمكن التراجع.
                <br />
                بيانات هذا الجهاز ستبقى كما هي — لن تفقد أذكارك المحفوظة محليًا.
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={doDelete}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-(--danger) px-3 py-1.5 text-xs font-bold text-white transition active:scale-95 disabled:opacity-50"
                >
                  {busy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                  نعم، احذف نهائيًا
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteFor(null)}
                  className="rounded-lg border border-(--stroke) px-3 py-1.5 text-xs"
                >
                  تراجع
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-(--muted)">
            سجّل الدخول لتُحفظ أذكارك وسلسلتك ومفضلتك وتذكيراتك، وتعود معك على أي جهاز.
            يمكنك استخدام القرآن والأذكار و«أثر» دون حساب؛ الحساب اختياري لمزامنة بياناتك بين أجهزتك.
          </p>

          {showApple && (
            <button
              type="button"
              onClick={doApple}
              disabled={busy !== null}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2.5 min-h-[44px] text-sm font-semibold text-black transition active:scale-95 disabled:opacity-50"
            >
              {busy === "apple" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <svg viewBox="0 0 384 512" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                </svg>
              )}
              المتابعة باستخدام Apple
            </button>
          )}
          {showGoogle && (<>
          <button
            type="button"
            onClick={doGoogle}
            disabled={busy !== null}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-(--accent) px-4 py-2.5 text-sm font-bold text-(--on-accent,#0a0a0c) transition active:scale-95 disabled:opacity-50"
          >
            {busy === "google" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
            المتابعة عبر Google
          </button>

          <div className="my-3 flex items-center gap-2 text-[10px] text-(--muted-2)">
            <span className="h-px flex-1 bg-(--stroke)" />
            أو عبر البريد
            <span className="h-px flex-1 bg-(--stroke)" />
          </div>
          </>)}

          {linkSent ? (
            <div className="flex items-center gap-2 rounded-xl border border-accent-35 bg-accent-15 px-3 py-2.5 text-xs text-(--accent)">
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
                className="form-field-readable min-w-0 flex-1 rounded-xl border border-(--stroke) bg-(--card-2) px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={doEmail}
                disabled={busy !== null || !email.trim()}
                aria-label="أرسل رابط الدخول"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-(--stroke) bg-(--card-2) px-3 py-2 text-xs font-semibold transition active:scale-95 disabled:opacity-40"
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
