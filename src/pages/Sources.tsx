import * as React from "react";
import { Database, Trash2, Upload, ExternalLink, Plus } from "lucide-react";
import toast from "react-hot-toast";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { addCustomDhikrItem, addPackFromJson, loadPacks, removePack, savePacks, type NoorPack } from "@/data/packs";
import { useQueryClient } from "@tanstack/react-query";

export function SourcesPage() {
  const { data } = useAdhkarDB();
  const queryClient = useQueryClient();
  const [packs, setPacks] = React.useState<NoorPack[]>(() => loadPacks());
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [customText, setCustomText] = React.useState("");
  const [customCount, setCustomCount] = React.useState("1");
  const [customBenefit, setCustomBenefit] = React.useState("");

  const onImport = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const pack = addPackFromJson(json, file.name.replace(/\.json$/i, ""));
      const next = [...packs, pack];
      savePacks(next);
      setPacks(next);
      toast.success("تمت إضافة حزمة بيانات جديدة. أعد فتح الصفحة لرؤية الأقسام.");
      globalThis.setTimeout(() => globalThis.location.reload(), 500);
    } catch {
      toast.error("تعذر استيراد الملف (صيغة غير مدعومة أو ملف غير صالح)");
    }
  };

  const onRemove = (packId: string) => {
    const next = removePack(packId);
    setPacks(next);
    setConfirmDeleteId(null);
    toast.success("تم الحذف. أعد تحميل الصفحة.");
    globalThis.setTimeout(() => globalThis.location.reload(), 400);
  };

  const onAddCustomDhikr = () => {
    const text = customText.trim();
    const count = Math.max(1, Number.parseInt(customCount, 10) || 1);

    if (!text) {
      toast.error("اكتب الذكر أولاً");
      return;
    }

    const next = addCustomDhikrItem({ text, count, benefit: customBenefit });
    setPacks(next);
    setCustomText("");
    setCustomBenefit("");
    void queryClient.invalidateQueries({ queryKey: ["adhkar-db"] });
    toast.success("تمت إضافة الذكر");
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-[var(--accent)]" />
          <div className="font-semibold">المصادر والبيانات</div>
        </div>

        <div className="mt-3 text-sm opacity-70 leading-7">
          أضف أذكارك الخاصة أو استورد حزمة محفوظة.
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="inline-flex">
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onImport(file);
                e.currentTarget.value = "";
              }}
            />
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/12 border border-white/10 cursor-pointer text-sm min-h-[44px]">
              <Upload size={16} />
              استيراد حزمة
            </span>
          </label>

          <a
            href="https://www.islambook.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/6 hover:bg-white/8 border border-white/10 text-sm min-h-[44px]"
          >
            <ExternalLink size={16} />
            islambook.com
          </a>
        </div>

      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Plus size={18} className="text-[var(--accent)]" />
          <div className="font-semibold">إضافة ذكر</div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_120px] gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-[var(--fg)]">
            أذكاري
          </div>
          <Input
            type="number"
            min={1}
            value={customCount}
            onChange={(event) => setCustomCount(event.target.value)}
            placeholder="العدد"
          />
        </div>

        <textarea
          value={customText}
          onChange={(event) => setCustomText(event.target.value)}
          placeholder="اكتب الذكر"
          className="mt-3 min-h-32 w-full rounded-3xl border border-white/10 bg-white/6 px-4 py-3 text-sm leading-7 text-[var(--fg)] outline-none focus:border-[var(--accent)]/40 placeholder:text-[var(--muted-2)]"
        />

        <Input
          className="mt-3"
          value={customBenefit}
          onChange={(event) => setCustomBenefit(event.target.value)}
          placeholder="المصدر أو الفضل"
        />

        <Button className="mt-4 w-full" onClick={onAddCustomDhikr}>
          <Plus size={16} />
          حفظ الذكر
        </Button>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">حزم البيانات المضافة</div>
          <div className="text-xs opacity-70">{packs.length} حزمة</div>
        </div>

        {packs.length === 0 ? (
          <div className="mt-3 opacity-70 text-sm leading-7">
            لا توجد حزم إضافية. استورد ملفًا لإضافة أقسام جديدة.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {packs.map((p) => (
              <div
                key={p.packId}
                className="glass rounded-3xl p-4 border border-white/10 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{p.name}</div>
                  <div className="text-xs opacity-60 mt-1">
                    {p.sections.length} قسم • {new Date(p.importedAt).toLocaleString()}
                  </div>
                </div>
                {confirmDeleteId === p.packId ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger)]/10"
                      onClick={() => onRemove(p.packId)}
                    >
                      <Trash2 size={16} />
                      تأكيد
                    </Button>
                    <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
                      إلغاء
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setConfirmDeleteId(p.packId)}>
                    <Trash2 size={16} />
                    حذف
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="text-sm font-semibold">ملخص قاعدة البيانات</div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <MiniStat label="الأقسام" value={data?.db.sections.length ?? 0} />
          <MiniStat label="إجمالي الأذكار" value={data?.flat.length ?? 0} />
          <MiniStat label="الحزم الإضافية" value={packs.length} />
        </div>
      </Card>
    </div>
  );
}

function MiniStat(props: Readonly<{ label: string; value: number }>) {
  return (
    <div className="glass rounded-3xl p-4 border border-white/10">
      <div className="text-xs opacity-60">{props.label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums" style={{ color: "var(--accent)" }}>{props.value}</div>
    </div>
  );
}
