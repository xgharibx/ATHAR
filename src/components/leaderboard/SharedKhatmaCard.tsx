/**
 * «الختمة الجماعية» — one khatma shared by friends, each on their own phone.
 *
 * The khatma lives on the server (functions/khatma): everyone sees the same
 * 30 juz, takes the ones they will read, and ticks them; the one who created
 * it can also give a juz to someone by name (a grandmother without the app),
 * tick it for them, start a new round, or delete the khatma. The page checks
 * for others' progress every 20 seconds and whenever the app comes back.
 *
 * A khatma made before this, kept on one phone only, is still shown, with a
 * way to make it shared in one step.
 */
import * as React from "react";
import toast from "react-hot-toast";
import { BookMarked, Check, Loader2, LogOut, RefreshCw, Share2, Trash2, UserPlus, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { arNum } from "@/lib/formatNumber";
import { vibrate } from "@/lib/haptics";
import { shareOrCopy } from "@/lib/shareTargets";
import { useNoorStore, type SharedKhatmaKeys } from "@/store/noorStore";
import {
  createKhatma,
  fetchKhatma,
  formatKhatmaCode,
  isKhatmaCode,
  joinKhatma,
  khatmaAction,
  khatmaErrorText,
  khatmaLink,
  normalizeKhatmaCode,
  type KhatmaPart,
  type SharedKhatma,
} from "@/lib/groupKhatma";

const POLL_MS = 20_000;
const COLORS = ["#fbbf24", "#34d399", "#f472b6", "#60a5fa", "#a78bfa", "#fb923c", "#2dd4bf", "#f87171"];

function colorFor(name: string | null): string {
  if (!name) return "var(--stroke)";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return COLORS[h % COLORS.length]!;
}

/** Keeps one khatma in step with the server. */
function useSharedKhatma(keys: SharedKhatmaKeys) {
  const [khatma, setKhatma] = React.useState<SharedKhatma | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [missing, setMissing] = React.useState(false);
  const keysRef = React.useRef(keys);
  React.useEffect(() => {
    keysRef.current = keys;
  }, [keys]);

  const refresh = React.useCallback(async () => {
    const result = await fetchKhatma(keysRef.current);
    if (result.ok) {
      setKhatma(result.data.khatma);
      setError(null);
      setMissing(false);
    } else if (result.error === "not_found") {
      setMissing(true);
    } else {
      setError(khatmaErrorText(result.error));
    }
  }, []);

  React.useEffect(() => {
    let timer = 0;
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    void refresh();
    timer = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh, keys.code]);

  return { khatma, setKhatma, error, missing, refresh };
}

function JuzSheet({
  part,
  khatma,
  keys,
  onClose,
  onChanged,
}: {
  part: KhatmaPart;
  khatma: SharedKhatma;
  keys: SharedKhatmaKeys;
  onClose: () => void;
  onChanged: (k: SharedKhatma) => void;
}) {
  const haptics = useNoorStore((s) => s.prefs.enableHaptics !== false);
  const [busy, setBusy] = React.useState(false);
  const [guestName, setGuestName] = React.useState("");
  const mine = part.memberId !== null && part.memberId === khatma.you.memberId;
  const owner = khatma.you.isOwner;
  const free = !part.holder;

  const run = async (body: Parameters<typeof khatmaAction>[1], success?: string) => {
    setBusy(true);
    const result = await khatmaAction(keys, body);
    setBusy(false);
    if (!result.ok) {
      toast.error(khatmaErrorText(result.error));
      return;
    }
    if (result.data.khatma) onChanged(result.data.khatma);
    if (success) toast.success(success, { duration: 1600 });
    onClose();
  };

  return (
    <Modal open onClose={onClose} ariaLabel={`الجزء ${arNum(part.juz)}`}>
      <div className="px-4 pt-2 pb-5 stack-y-3" dir="rtl">
        <div className="text-base font-semibold">الجزء {arNum(part.juz)}</div>
        <div className="text-sm text-(--muted)">
          {free ? "لم يأخذه أحد بعد" : part.done ? `قرأه ${part.holder} ✓` : `مع ${part.holder}`}
        </div>

        {free && khatma.you.memberId && (
          <Button className="w-full" disabled={busy} onClick={() => void run({ action: "claim", juz: part.juz }, "أخذتَ هذا الجزء")}>
            سأقرأ هذا الجزء
          </Button>
        )}
        {(mine || (owner && part.holder)) && (
          <Button
            className="w-full"
            disabled={busy}
            onClick={() => {
              if (haptics && !part.done) vibrate([15, 60, 30]);
              void run({ action: "done", juz: part.juz, done: !part.done }, part.done ? undefined : "تقبّل الله ✓");
            }}
          >
            {part.done ? "لم أُتمّه بعد" : mine ? "أتممتُ قراءته" : `أتمّه ${part.holder}`}
          </Button>
        )}
        {mine && (
          <Button variant="ghost" className="w-full" disabled={busy} onClick={() => void run({ action: "release", juz: part.juz })}>
            لن أقرأه، أعده لغيري
          </Button>
        )}

        {owner && (
          <div className="border-t border-(--stroke) pt-3 stack-y-2">
            <div className="text-[12px] text-(--muted)">للمنشئ: أعطِ هذا الجزء لأحد الأعضاء أو لاسمٍ لا يستخدم التطبيق</div>
            <div className="flex flex-wrap gap-1.5">
              {khatma.members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={busy || part.memberId === m.id}
                  onClick={() => void run({ action: "assign", juz: part.juz, memberId: m.id, guestName: null })}
                  className="px-3 min-h-[36px] rounded-full border border-(--stroke) text-[12px] disabled:opacity-40"
                >
                  {m.name}
                </button>
              ))}
              {part.holder && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run({ action: "assign", juz: part.juz, memberId: null, guestName: null })}
                  className="px-3 min-h-[36px] rounded-full border border-(--stroke) text-[12px] text-(--muted)"
                >
                  اجعله متاحًا
                </button>
              )}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (guestName.trim()) void run({ action: "assign", juz: part.juz, memberId: null, guestName: guestName.trim() });
              }}
            >
              <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="أو اكتب اسمًا، مثل: جدتي" aria-label="اسم من سيقرأ هذا الجزء" maxLength={40} />
              <Button type="submit" variant="secondary" disabled={busy || !guestName.trim()}>
                <UserPlus size={15} aria-hidden="true" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </Modal>
  );
}

function KhatmaView({ keys }: { keys: SharedKhatmaKeys }) {
  const forget = useNoorStore((s) => s.forgetSharedKhatma);
  const save = useNoorStore((s) => s.saveSharedKhatma);
  const { khatma, setKhatma, error, missing, refresh } = useSharedKhatma(keys);
  const [open, setOpen] = React.useState<KhatmaPart | null>(null);
  const [confirm, setConfirm] = React.useState<null | "leave" | "delete">(null);
  const [joinName, setJoinName] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (khatma && khatma.name !== keys.name) save({ ...keys, name: khatma.name });
  }, [khatma, keys, save]);

  if (missing) {
    return (
      <div className="rounded-2xl border border-(--stroke) p-3 text-sm flex items-center justify-between gap-2">
        <span className="text-(--muted)">لم تعد ختمة «{keys.name ?? formatKhatmaCode(keys.code)}» موجودة</span>
        <Button variant="ghost" onClick={() => forget(keys.code)}>إزالة</Button>
      </div>
    );
  }
  if (!khatma) {
    return (
      <div className="flex items-center gap-2 text-sm text-(--muted) py-3" role="status">
        {error ? (
          <>
            <span>{error}</span>
            <Button variant="ghost" onClick={() => void refresh()}><RefreshCw size={14} aria-hidden="true" /></Button>
          </>
        ) : (
          <>
            <Loader2 size={14} className="animate-spin" aria-hidden="true" /> جارٍ تحميل الختمة…
          </>
        )}
      </div>
    );
  }

  const pct = Math.round((khatma.done / 30) * 100);
  const share = () =>
    void shareOrCopy(
      `انضمّ إلى ختمة «${khatma.name}» في أثر 📖\nالكود: ${formatKhatmaCode(khatma.code)}\n${khatmaLink(khatma.code)}`,
      { title: khatma.name, copiedMessage: "نُسخ رابط الختمة" },
    );

  const ownerAction = async (action: "newRound" | "delete" | "leave") => {
    setBusy(true);
    const result = await khatmaAction(keys, { action });
    setBusy(false);
    setConfirm(null);
    if (!result.ok) {
      toast.error(khatmaErrorText(result.error));
      return;
    }
    if (action === "newRound" && result.data.khatma) {
      setKhatma(result.data.khatma);
      toast.success("بدأت جولة جديدة");
    } else {
      forget(keys.code);
      toast(action === "delete" ? "حُذفت الختمة" : "خرجتَ من الختمة");
    }
  };

  return (
    <div className="stack-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{khatma.name}</div>
          <div className="text-[11px] text-(--muted)">
            {khatma.round > 1 ? `الجولة ${arNum(khatma.round)}، ` : ""}
            {arNum(khatma.members.length)} {khatma.members.length > 2 && khatma.members.length < 11 ? "أعضاء" : "عضو"}، الكود <span dir="ltr">{formatKhatmaCode(khatma.code)}</span>
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button variant="secondary" onClick={share} aria-label="دعوة إلى الختمة">
            <Share2 size={14} aria-hidden="true" /> دعوة
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-(--card) overflow-hidden" role="progressbar" aria-valuenow={khatma.done} aria-valuemin={0} aria-valuemax={30} aria-label={`تقدم الختمة: ${arNum(khatma.done)} من ٣٠ جزءًا`}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "var(--ok)" }} />
        </div>
        <span className="text-xs font-semibold tabular-nums" style={{ color: khatma.completedAt ? "var(--ok)" : undefined }}>
          {arNum(khatma.done)}/٣٠
        </span>
      </div>

      {khatma.completedAt && (
        <div className="rounded-2xl p-3 text-center text-sm" style={{ background: "color-mix(in srgb, var(--ok) 12%, transparent)", color: "var(--ok)" }}>
          🎉 تمّت الختمة، تقبّل الله منكم
          {khatma.you.isOwner && (
            <div className="mt-2">
              <Button disabled={busy} onClick={() => void ownerAction("newRound")}>ابدأ جولة جديدة</Button>
            </div>
          )}
        </div>
      )}

      {!khatma.you.memberId && (
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!joinName.trim()) return;
            setBusy(true);
            const result = await joinKhatma(khatma.code, joinName.trim(), keys);
            setBusy(false);
            if (!result.ok) return void toast.error(khatmaErrorText(result.error));
            save({ ...keys, memberToken: result.data.memberToken ?? keys.memberToken });
            setKhatma(result.data.khatma);
          }}
        >
          <Input value={joinName} onChange={(e) => setJoinName(e.target.value)} placeholder="اسمك لتنضمّ وتأخذ أجزاءً" aria-label="اسمك في الختمة" maxLength={40} />
          <Button type="submit" disabled={busy || !joinName.trim()}>انضمام</Button>
        </form>
      )}

      <div className="grid grid-cols-6 gap-1.5" role="list" aria-label="أجزاء الختمة">
        {khatma.parts.map((p) => {
          const color = colorFor(p.holder);
          const mine = p.memberId !== null && p.memberId === khatma.you.memberId;
          return (
            <button
              key={p.juz}
              type="button"
              role="listitem"
              onClick={() => setOpen(p)}
              className={`relative aspect-square rounded-xl border text-xs font-semibold flex flex-col items-center justify-center transition-all ${mine ? "ring-2 ring-(--accent)" : ""}`}
              style={{
                background: p.done ? `color-mix(in srgb, ${color} 28%, var(--card))` : "var(--card)",
                borderColor: p.holder ? color : "var(--stroke)",
                borderStyle: p.holder ? "solid" : "dashed",
              }}
              aria-label={`الجزء ${arNum(p.juz)}: ${p.holder ? `${p.holder}${p.done ? "، تمّ" : ""}` : "متاح"}`}
            >
              {p.done ? <Check size={13} aria-hidden="true" strokeWidth={3} style={{ color }} /> : <span>{arNum(p.juz)}</span>}
              {p.holder && <span className="text-[8px] opacity-70 truncate max-w-full px-0.5">{p.holder.split(" ")[0]}</span>}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 text-[11px]">
        {khatma.members.map((m) => (
          <span key={m.id} className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorFor(m.name) }} aria-hidden="true" />
            <span className="opacity-80">{m.name}{m.id === khatma.you.memberId ? " (أنت)" : ""}</span>
            <span className="opacity-50 tabular-nums">{arNum(m.done)}/{arNum(m.juz.length)}</span>
          </span>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        {confirm ? (
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>إلغاء</Button>
            <Button variant="danger" disabled={busy} onClick={() => void ownerAction(confirm)}>
              {confirm === "delete" ? "حذف الختمة للجميع" : "الخروج من الختمة"}
            </Button>
          </>
        ) : khatma.you.isOwner ? (
          <button type="button" onClick={() => setConfirm("delete")} className="inline-flex items-center gap-1 text-[12px] text-(--danger) opacity-70 min-h-[36px] px-2">
            <Trash2 size={14} aria-hidden="true" /> حذف الختمة
          </button>
        ) : khatma.you.memberId ? (
          <button type="button" onClick={() => setConfirm("leave")} className="inline-flex items-center gap-1 text-[12px] opacity-60 min-h-[36px] px-2">
            <LogOut size={14} aria-hidden="true" /> الخروج
          </button>
        ) : (
          <button type="button" onClick={() => forget(keys.code)} className="text-[12px] opacity-60 min-h-[36px] px-2">إزالة من هاتفي</button>
        )}
      </div>

      {open && (
        <JuzSheet
          part={khatma.parts.find((x) => x.juz === open.juz) ?? open}
          khatma={khatma}
          keys={keys}
          onClose={() => setOpen(null)}
          onChanged={setKhatma}
        />
      )}
    </div>
  );
}

/** Turns a khatma kept on this phone into a shared one: same name, same names and progress. */
function LegacyKhatmaNotice() {
  const legacy = useNoorStore((s) => s.groupKhatma);
  const setLegacy = useNoorStore((s) => s.setGroupKhatma);
  const save = useNoorStore((s) => s.saveSharedKhatma);
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  if (!legacy) return null;

  const convert = async () => {
    if (!name.trim()) return;
    setBusy(true);
    const created = await createKhatma(legacy.groupName, name.trim());
    if (!created.ok) {
      setBusy(false);
      return void toast.error(khatmaErrorText(created.error));
    }
    const keys = { code: created.data.khatma.code, memberToken: created.data.memberToken, ownerToken: created.data.ownerToken, name: legacy.groupName };
    for (const member of legacy.members) {
      for (const juz of member.assignedJuz) {
        await khatmaAction(keys, { action: "assign", juz, memberId: null, guestName: member.name });
        if (member.completedJuz.includes(juz)) await khatmaAction(keys, { action: "done", juz, done: true });
      }
    }
    save(keys);
    setLegacy(null);
    setBusy(false);
    toast.success("صارت الختمة مشتركة، ادعُ أصحابها");
  };

  return (
    <div className="rounded-2xl border border-(--stroke) p-3 stack-y-2">
      <div className="text-sm">
        ختمة «{legacy.groupName}» محفوظة على هذا الهاتف وحده ({arNum(legacy.members.reduce((n, m) => n + m.completedJuz.length, 0))}/٣٠).
        اجعلها مشتركة ليرى كل واحد تقدّم الجميع من هاتفه.
      </div>
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" aria-label="اسمك في الختمة" maxLength={40} />
        <Button disabled={busy || !name.trim()} onClick={() => void convert()}>
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : "اجعلها مشتركة"}
        </Button>
      </div>
    </div>
  );
}

export function SharedKhatmaCard({ initialCode }: { initialCode?: string | null }) {
  const keysList = useNoorStore((s) => s.sharedKhatmas);
  const save = useNoorStore((s) => s.saveSharedKhatma);
  const [mode, setMode] = React.useState<"view" | "create" | "join">(initialCode ? "join" : "view");
  const [active, setActive] = React.useState<string | null>(null);
  const [khatmaName, setKhatmaName] = React.useState("");
  const [yourName, setYourName] = React.useState("");
  const [code, setCode] = React.useState(initialCode ?? "");
  const [busy, setBusy] = React.useState(false);

  const current = keysList.find((k) => k.code === active) ?? keysList[0] ?? null;

  const create = async () => {
    setBusy(true);
    const result = await createKhatma(khatmaName.trim(), yourName.trim());
    setBusy(false);
    if (!result.ok) return void toast.error(khatmaErrorText(result.error));
    save({ code: result.data.khatma.code, memberToken: result.data.memberToken, ownerToken: result.data.ownerToken, name: result.data.khatma.name });
    setActive(result.data.khatma.code);
    setMode("view");
    setKhatmaName("");
    toast.success("أُنشئت الختمة، ادعُ أصحابك بزر «دعوة»");
  };

  const join = async () => {
    const normalized = normalizeKhatmaCode(code);
    setBusy(true);
    const existing = keysList.find((k) => k.code === normalized) ?? null;
    const result = await joinKhatma(normalized, yourName.trim(), existing);
    setBusy(false);
    if (!result.ok) return void toast.error(khatmaErrorText(result.error));
    save({ code: normalized, memberToken: result.data.memberToken ?? existing?.memberToken ?? null, ownerToken: existing?.ownerToken ?? null, name: result.data.khatma.name });
    setActive(normalized);
    setMode("view");
    setCode("");
    toast.success(`انضممتَ إلى «${result.data.khatma.name}»`);
  };

  return (
    <Card className="p-5" id="group-khatma">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookMarked size={16} aria-hidden="true" className="text-(--accent)" />
          <div className="text-sm font-semibold">ختمة جماعية</div>
          <Users size={13} aria-hidden="true" className="opacity-40" />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setMode(mode === "create" ? "view" : "create")}>إنشاء</Button>
          <Button variant="outline" onClick={() => setMode(mode === "join" ? "view" : "join")}>انضمام</Button>
        </div>
      </div>
      <p className="text-[11px] text-(--muted) mt-1 leading-5">
        ختمة واحدة يتقاسمها أصحابها، كلٌّ من هاتفه: يأخذ أجزاءه ويُعلِّم ما أتمّه، ويرى الجميع التقدّم نفسه.
      </p>

      {mode === "create" && (
        <div id="lb-khatma-create" className="mt-4 stack-y-2 border-t border-(--stroke) pt-4">
          <Input value={khatmaName} onChange={(e) => setKhatmaName(e.target.value)} placeholder="اسم الختمة (مثال: ختمة العائلة في رمضان)" aria-label="اسم الختمة" maxLength={60} />
          <Input value={yourName} onChange={(e) => setYourName(e.target.value)} placeholder="اسمك كما يراه الأعضاء" aria-label="اسمك" maxLength={40} />
          <Button onClick={() => void create()} disabled={busy || !khatmaName.trim() || !yourName.trim()}>
            {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : "إنشاء الختمة"}
          </Button>
        </div>
      )}

      {mode === "join" && (
        <div id="lb-khatma-import" className="mt-4 stack-y-2 border-t border-(--stroke) pt-4">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="كود الختمة، مثل ABCD-EFGH" aria-label="كود الختمة" dir="ltr" autoCapitalize="characters" />
          <Input value={yourName} onChange={(e) => setYourName(e.target.value)} placeholder="اسمك كما يراه الأعضاء" aria-label="اسمك" maxLength={40} />
          <Button onClick={() => void join()} disabled={busy || !isKhatmaCode(code) || !yourName.trim()}>
            {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : "انضمام إلى الختمة"}
          </Button>
        </div>
      )}

      <div className="mt-4 stack-y-3">
        <LegacyKhatmaNotice />
        {keysList.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label="ختماتك">
            {keysList.map((k) => (
              <button
                key={k.code}
                type="button"
                role="tab"
                aria-selected={current?.code === k.code}
                onClick={() => setActive(k.code)}
                className={`shrink-0 px-3 min-h-[36px] rounded-full border text-[12px] ${current?.code === k.code ? "border-(--accent) text-(--accent)" : "border-(--stroke) opacity-70"}`}
              >
                {k.name ?? formatKhatmaCode(k.code)}
              </button>
            ))}
          </div>
        )}
        {current ? <KhatmaView key={current.code} keys={current} /> : mode === "view" && (
          <div className="text-[12px] text-(--muted)">أنشئ ختمة وادعُ أصحابك، أو انضمّ بكود أرسله لك أحدهم.</div>
        )}
      </div>
    </Card>
  );
}
