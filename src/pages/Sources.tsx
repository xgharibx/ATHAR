import * as React from "react";
import { Database, Trash2, Upload, ExternalLink, Info } from "lucide-react";
import toast from "react-hot-toast";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAdhkarDB } from "@/data/useAdhkarDB";
import { addPackFromJson, loadPacks, removePack, savePacks, type NoorPack } from "@/data/packs";

export function SourcesPage() {
  const { data } = useAdhkarDB();
  const [packs, setPacks] = React.useState<NoorPack[]>(() => loadPacks());

  const refresh = () => setPacks(loadPacks());

  const onImport = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const pack = addPackFromJson(json, file.name.replace(/\.json$/i, ""));
      const next = [...packs, pack];
      savePacks(next);
      setPacks(next);
      toast.success("تمت إضافة حزمة بيانات جديدة. أعد فتح الصفحة لرؤية الأقسام.");
      setTimeout(() => window.location.reload(), 500);
    } catch (e: any) {
      toast.error("تعذر استيراد الملف (صيغة غير مدعومة أو ملف غير صالح)");
      console.error(e);
    }
  };

  const onRemove = (packId: string) => {
    if (!confirm("حذف هذه الحزمة؟")) return;
    const next = removePack(packId);
    setPacks(next);
    toast.success("تم الحذف. أعد تحميل الصفحة.");
    setTimeout(() => window.location.reload(), 400);
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-[var(--accent)]" />
          <div className="font-semibold">المصادر والبيانات</div>
        </div>

        <div className="mt-3 text-sm opacity-70 leading-7">
          هذا التطبيق يعتمد على ملف محلي:{" "}
          <code className="px-2 py-1 rounded-lg bg-white/6 border border-white/10">public/data/adhkar</code>
          . يمكنك إضافة “حزم بيانات” لتوسيع الأقسام — مثل أقسام أذكار جديدة أو ترجمات.
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
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/12 border border-white/10 cursor-pointer text-sm">
              <Upload size={16} />
              استيراد حزمة
            </span>
          </label>

          <Button
            variant="outline"
            onClick={() => {
              toast("تلميح: يمكنك تصدير أي قسم من داخله ثم استيراده هنا كتجربة.");
            }}
          >
            <Info size={16} />
            تلميحات
          </Button>

          <a
            href="https://www.islambook.com/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/6 hover:bg-white/8 border border-white/10 text-sm"
          >
            <ExternalLink size={16} />
            islambook.com
          </a>
        </div>

        <div className="mt-4 text-xs opacity-60 leading-6">
          ملاحظة: تأكد من صحة الأذكار ومصدرها قبل إضافتها. احترام حقوق النشر وشروط المواقع مسؤولية المستخدم.
        </div>
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
                <Button variant="outline" onClick={() => onRemove(p.packId)}>
                  <Trash2 size={16} />
                  حذف
                </Button>
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

function MiniStat(props: { label: string; value: number }) {
  return (
    <div className="glass rounded-3xl p-4 border border-white/10">
      <div className="text-xs opacity-60">{props.label}</div>
      <div className="text-2xl font-semibold mt-1 tabular-nums">{props.value}</div>
    </div>
  );
}
