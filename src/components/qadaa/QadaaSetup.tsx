import * as React from "react";
import toast from "react-hot-toast";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/Pickers";
import { arNum } from "@/lib/formatNumber";
import { useNoorStore } from "@/store/noorStore";
import {
  CERTAINTY,
  FARD_KEYS,
  MADHHAB_LABELS,
  PRAYER_LABELS,
  estimateFastDebt,
  estimatePrayerDebt,
  fastKey,
  hijriYearOf,
  localTodayISO,
  prayerKey,
  witrIsOwed,
  type Certainty,
  type Gender,
  type Madhhab,
  type PrayerKey,
  type Scenario,
} from "@/lib/qadaa";

const SCENARIO_LABELS: Record<Scenario, string> = { min: "الأدنى", likely: "الأرجح", safe: "الأحوط" };

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        "px-3 py-2 rounded-2xl text-sm border transition min-h-[40px] " +
        (active
          ? "bg-[var(--accent)] text-[var(--on-accent)] border-transparent"
          : "bg-[var(--card)] border-[var(--stroke)]")
      }
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-2xl bg-[var(--card)] border border-[var(--stroke)] px-4 py-2.5 text-sm min-h-[44px] outline-none focus:border-[var(--accent)]";

/**
 * Two ways in: tell Athar the numbers you already know, or have it work them out
 * from a few dates. The calculator never commits on its own — it shows a range,
 * defaults to the cautious end, and applies only when the person says so.
 */
export function QadaaSetup({ onDone }: { onDone?: () => void }) {
  const setQadaaOwed = useNoorStore((s) => s.setQadaaOwed);
  const setQadaaSettings = useNoorStore((s) => s.setQadaaSettings);
  const current = useNoorStore((s) => s.qadaaSettings);

  const [mode, setMode] = React.useState<"calc" | "manual">("calc");
  const [madhhab, setMadhhab] = React.useState<Madhhab | null>(current.madhhab ?? null);
  const [includeWitr, setIncludeWitr] = React.useState<boolean>(
    current.includeWitr ?? witrIsOwed(current.madhhab ?? null),
  );

  // calculator
  const [gender, setGender] = React.useState<Gender>("male");
  const [birth, setBirth] = React.useState("");
  const [bulughAge, setBulughAge] = React.useState("15");
  const [started, setStarted] = React.useState("");
  const [prayedPct, setPrayedPct] = React.useState("0");
  const [certainty, setCertainty] = React.useState<Certainty>("approx");
  const [haydDays, setHaydDays] = React.useState("6");
  const [births, setBirths] = React.useState("0");
  const [nifasDays, setNifasDays] = React.useState("40");
  const [withFasts, setWithFasts] = React.useState(false);
  const [fastedPerRamadan, setFastedPerRamadan] = React.useState("0");
  const [scenario, setScenario] = React.useState<Scenario>("safe");

  // manual
  const [manual, setManual] = React.useState<Record<string, string>>({});
  const [manualFast, setManualFast] = React.useState("");

  const today = localTodayISO();
  const ready = !!birth && !!started;

  const prayerEst = React.useMemo(
    () =>
      ready
        ? estimatePrayerDebt({
            gender,
            birthDate: birth,
            bulughAge: Number(bulughAge),
            startedPrayingDate: started,
            prayedFraction: Math.min(100, Math.max(0, Number(prayedPct) || 0)) / 100,
            certainty,
            includeWitr,
            haydDays: Number(haydDays),
            births: Number(births),
            nifasDays: Number(nifasDays),
            today,
          })
        : null,
    [ready, gender, birth, bulughAge, started, prayedPct, certainty, includeWitr, haydDays, births, nifasDays, today],
  );
  const fastEst = React.useMemo(
    () =>
      ready && withFasts
        ? estimateFastDebt({
            gender,
            birthDate: birth,
            bulughAge: Number(bulughAge),
            startedFastingDate: started,
            fastedDaysPerRamadan: Number(fastedPerRamadan),
            certainty,
            today,
          })
        : null,
    [ready, withFasts, gender, birth, bulughAge, started, fastedPerRamadan, certainty, today],
  );

  const applyCalc = () => {
    if (!prayerEst) return;
    const patch: Record<string, number> = {};
    for (const [k, range] of Object.entries(prayerEst.perPrayer)) {
      if (range) patch[prayerKey(k as PrayerKey)] = range[scenario];
    }
    if (fastEst) for (const y of fastEst.years) if (y.days[scenario] > 0) patch[fastKey(y.year)] = y.days[scenario];
    setQadaaOwed(patch);
    setQadaaSettings({ madhhab, includeWitr, startedISO: today });
    toast.success("تم حفظ خطة القضاء");
    onDone?.();
  };

  const applyManual = () => {
    const patch: Record<string, number> = {};
    for (const k of FARD_KEYS) patch[prayerKey(k)] = Math.max(0, Math.floor(Number(manual[k]) || 0));
    if (includeWitr) patch[prayerKey("witr")] = Math.max(0, Math.floor(Number(manual.witr) || 0));
    const f = Math.max(0, Math.floor(Number(manualFast) || 0));
    // Fasts typed by hand are not tied to a particular Ramadan, so they sit
    // against the most recent one that has passed.
    if (f > 0) patch[fastKey(hijriYearOf(today) - 1)] = f;
    if (!Object.values(patch).some((v) => v > 0)) {
      toast.error("أدخل عددًا واحدًا على الأقل");
      return;
    }
    setQadaaOwed(patch);
    setQadaaSettings({ madhhab, includeWitr, startedISO: today });
    toast.success("تم حفظ خطة القضاء");
    onDone?.();
  };

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold">ابدأ قضاءك</h2>
        <p className="text-xs text-[var(--muted)] mt-1 leading-6">
          الأرقام تُحفظ على جهازك وتتزامن مع حسابك. يمكنك تعديلها في أي وقت.
        </p>
      </div>

      <div className="flex gap-2">
        <Chip active={mode === "calc"} onClick={() => setMode("calc")}>احسب لي</Chip>
        <Chip active={mode === "manual"} onClick={() => setMode("manual")}>أعرف أرقامي</Chip>
      </div>

      <Field label="المذهب (يحدد الوتر وحكم الفدية)">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(MADHHAB_LABELS) as Madhhab[]).map((m) => (
            <Chip
              key={m}
              active={madhhab === m}
              onClick={() => {
                setMadhhab(m);
                setIncludeWitr(witrIsOwed(m));
              }}
            >
              {MADHHAB_LABELS[m]}
            </Chip>
          ))}
        </div>
      </Field>

      {mode === "calc" ? (
        <div className="space-y-4">
          <Field label="أنا">
            <div className="flex gap-2">
              <Chip active={gender === "male"} onClick={() => setGender("male")}>رجل</Chip>
              <Chip active={gender === "female"} onClick={() => setGender("female")}>امرأة</Chip>
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="تاريخ الميلاد">
              <DateField max={today} value={birth} onChange={(e) => setBirth(e.target.value)} className={inputCls} />
            </Field>
            <Field label="سن البلوغ">
              <input type="number" inputMode="numeric" min={8} max={20} value={bulughAge} onChange={(e) => setBulughAge(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <Field label="متى بدأت المحافظة على الصلاة؟">
            <DateField max={today} value={started} onChange={(e) => setStarted(e.target.value)} className={inputCls} />
          </Field>
          <Field label="كم نسبة ما صليته في تلك الفترة؟ (٪)">
            <input type="number" inputMode="numeric" min={0} max={100} value={prayedPct} onChange={(e) => setPrayedPct(e.target.value)} className={inputCls} />
          </Field>
          <Field label="مدى تأكدك من التواريخ">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CERTAINTY) as Certainty[]).map((c) => (
                <Chip key={c} active={certainty === c} onClick={() => setCertainty(c)}>{CERTAINTY[c].label}</Chip>
              ))}
            </div>
          </Field>
          {gender === "female" && (
            <div className="grid grid-cols-3 gap-3">
              <Field label="أيام الحيض"><input type="number" inputMode="numeric" value={haydDays} onChange={(e) => setHaydDays(e.target.value)} className={inputCls} /></Field>
              <Field label="الولادات"><input type="number" inputMode="numeric" value={births} onChange={(e) => setBirths(e.target.value)} className={inputCls} /></Field>
              <Field label="أيام النفاس"><input type="number" inputMode="numeric" value={nifasDays} onChange={(e) => setNifasDays(e.target.value)} className={inputCls} /></Field>
            </div>
          )}
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={includeWitr} onChange={(e) => setIncludeWitr(e.target.checked)} />
            احسب الوتر
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={withFasts} onChange={(e) => setWithFasts(e.target.checked)} />
            احسب أيام رمضان الفائتة أيضًا
          </label>
          {withFasts && (
            <Field label="كم يومًا صمتَ من كل رمضان في تلك الفترة؟">
              <input type="number" inputMode="numeric" min={0} max={30} value={fastedPerRamadan} onChange={(e) => setFastedPerRamadan(e.target.value)} className={inputCls} />
            </Field>
          )}

          {prayerEst && (
            <div className="rounded-2xl bg-[var(--card)] p-4 space-y-3" data-testid="qadaa-estimate">
              <div className="text-xs text-[var(--muted)]">اختر الرقم الذي تعتمده</div>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(SCENARIO_LABELS) as Scenario[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={scenario === s}
                    onClick={() => setScenario(s)}
                    className={
                      "rounded-2xl py-3 border text-center " +
                      (scenario === s ? "border-[var(--accent)] bg-[var(--card-2)]" : "border-[var(--stroke)]")
                    }
                  >
                    <div className="text-[11px] text-[var(--muted)]">{SCENARIO_LABELS[s]}</div>
                    <div className="text-base font-semibold">{arNum(prayerEst.total[s])}</div>
                    <div className="text-[10px] text-[var(--muted)]">صلاة</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--muted)] leading-6">
                مدة التكليف نحو {arNum(prayerEst.periodDays[scenario])} يومًا
                {gender === "female" ? `، بعد خصم ${arNum(prayerEst.exemptDays[scenario])} يوم حيض ونفاس` : ""}.
                القضاء دَين، والأحوط أن تبرأ منه.
              </p>
              {fastEst && fastEst.total[scenario] > 0 && (
                <p className="text-xs leading-6">
                  الصيام: <b>{arNum(fastEst.total[scenario])}</b> يومًا من {arNum(fastEst.years.length)} رمضان.
                </p>
              )}
              {prayerEst.warnings.map((w) => (
                <p key={w} className="text-xs text-[var(--danger)]">{w}</p>
              ))}
              <Button className="w-full" onClick={applyCalc}>اعتمد هذا الرقم وابدأ</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[...FARD_KEYS, ...(includeWitr ? (["witr"] as const) : [])].map((k) => (
              <Field key={k} label={PRAYER_LABELS[k]}>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={manual[k] ?? ""}
                  onChange={(e) => setManual((m) => ({ ...m, [k]: e.target.value }))}
                  className={inputCls}
                />
              </Field>
            ))}
          </div>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={includeWitr} onChange={(e) => setIncludeWitr(e.target.checked)} />
            احسب الوتر
          </label>
          <Field label="أيام صيام عليّ (اختياري)">
            <input type="number" inputMode="numeric" min={0} value={manualFast} onChange={(e) => setManualFast(e.target.value)} className={inputCls} />
          </Field>
          <Button className="w-full" onClick={applyManual}>حفظ وبدء</Button>
        </div>
      )}
    </Card>
  );
}
