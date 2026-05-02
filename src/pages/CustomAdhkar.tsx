import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Plus, ArrowRight, BookOpen, ChevronDown, ChevronUp } from "lucide-react";

import { useNoorStore } from "@/store/noorStore";
import type { CustomAdhkarPack } from "@/data/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// ─── Small item row in the create/edit form ──────────────────────────────────
function ItemRow({
  index,
  text,
  count,
  onText,
  onCount,
  onRemove,
}: {
  index: number;
  text: string;
  count: number;
  onText: (v: string) => void;
  onCount: (v: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 mt-2" dir="rtl">
      <Input
        className="flex-1 text-sm"
        placeholder={`الذكر ${index + 1}`}
        value={text}
        onChange={(e) => onText(e.target.value)}
        dir="rtl"
      />
      <input
        type="number"
        min={1}
        max={9999}
        value={count}
        onChange={(e) => onCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
        className="w-16 px-2 py-2 rounded-xl bg-white/5 border border-white/10 text-center text-sm outline-none focus:border-[var(--accent)]"
      />
      <button
        type="button"
        onClick={onRemove}
        className="p-2 rounded-xl hover:bg-[var(--danger)]/10 text-[var(--danger)]/60 hover:text-[var(--danger)] transition-colors"
        aria-label="حذف السطر"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

// ─── Create / Edit form ──────────────────────────────────────────────────────
type FormItem = { text: string; count: number };

function PackForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: CustomAdhkarPack;
  onSave: (title: string, items: FormItem[]) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [items, setItems] = React.useState<FormItem[]>(
    initial?.items.length ? initial.items.map((i) => ({ text: i.text, count: i.count })) : [{ text: "", count: 1 }],
  );

  function addRow() { setItems((prev) => [...prev, { text: "", count: 1 }]); }
  function removeRow(i: number) { setItems((prev) => prev.filter((_, idx) => idx !== i)); }
  function setItemText(i: number, v: string) { setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, text: v } : item)); }
  function setItemCount(i: number, v: number) { setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, count: v } : item)); }

  const valid = title.trim().length > 0 && items.some((it) => it.text.trim().length > 0);

  return (
    <Card className="p-5 space-y-4" dir="rtl">
      <h2 className="font-semibold text-base">{initial ? "تعديل الحزمة" : "إنشاء حزمة أذكار"}</h2>
      <div>
        <label className="text-xs opacity-60 block mb-1">اسم الحزمة</label>
        <Input
          placeholder="مثال: أذكاري الخاصة"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          dir="rtl"
        />
      </div>
      <div>
        <div className="text-xs opacity-60 mb-1">الأذكار <span className="opacity-40">(النص • العدد)</span></div>
        {items.map((it, i) => (
          <ItemRow
            key={i}
            index={i}
            text={it.text}
            count={it.count}
            onText={(v) => setItemText(i, v)}
            onCount={(v) => setItemCount(i, v)}
            onRemove={() => removeRow(i)}
          />
        ))}
        <button
          type="button"
          onClick={addRow}
          className="mt-3 flex items-center gap-1 text-xs opacity-60 hover:opacity-100 transition-opacity"
        >
          <Plus size={14} /> إضافة ذكر
        </button>
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>إلغاء</Button>
        <Button variant="primary" onClick={() => valid && onSave(title.trim(), items.filter((it) => it.text.trim()))} disabled={!valid}>
          حفظ
        </Button>
      </div>
    </Card>
  );
}

// ─── Single pack card ────────────────────────────────────────────────────────
function PackCard({
  pack,
  onNavigate,
  onDelete,
  onEdit,
}: {
  pack: CustomAdhkarPack;
  onNavigate: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);

  return (
    <Card className="p-4 space-y-3" dir="rtl">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl">📝</span>
          <div className="min-w-0">
            <div className="font-semibold text-sm leading-tight truncate">{pack.title}</div>
            <div className="text-xs opacity-50">{pack.items.length} ذكر</div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors opacity-50 hover:opacity-100"
            aria-label="عرض الأذكار"
          >
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <button
            onClick={onEdit}
            className="p-2 rounded-xl hover:bg-white/5 transition-colors opacity-50 hover:opacity-100 text-xs"
            aria-label="تعديل"
          >
            ✏️
          </button>
          {confirmDelete ? (
            <>
              <button
                onClick={onDelete}
                className="px-2 py-1 text-xs rounded-xl bg-[var(--danger)]/20 text-[var(--danger)] hover:bg-[var(--danger)]/30 transition-colors"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs rounded-xl hover:bg-white/5 transition-colors opacity-60"
              >
                إلغاء
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-xl hover:bg-[var(--danger)]/10 text-[var(--danger)]/50 hover:text-[var(--danger)] transition-colors"
              aria-label="حذف"
            >
              <Trash2 size={15} />
            </button>
          )}
          <Button variant="primary" onClick={onNavigate} className="py-1 px-3 text-xs">
            <BookOpen size={13} />
            فتح
          </Button>
        </div>
      </div>
      {expanded && pack.items.length > 0 && (
        <div className="space-y-1 border-t border-white/5 pt-3">
          {pack.items.map((it, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-xs opacity-70">
              <span className="truncate">{it.text}</span>
              <span className="shrink-0 opacity-50">× {it.count}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export function CustomAdhkarPage() {
  const navigate = useNavigate();
  const customPacks = useNoorStore((s) => s.customPacks);
  const addCustomPack = useNoorStore((s) => s.addCustomPack);
  const updateCustomPack = useNoorStore((s) => s.updateCustomPack);
  const deleteCustomPack = useNoorStore((s) => s.deleteCustomPack);

  const [showForm, setShowForm] = React.useState(false);
  const [editingPack, setEditingPack] = React.useState<CustomAdhkarPack | null>(null);

  function handleSave(title: string, items: FormItem[]) {
    if (editingPack) {
      updateCustomPack(editingPack.id, { title, items });
      setEditingPack(null);
    } else {
      addCustomPack({ title, items });
    }
    setShowForm(false);
  }

  function handleEdit(pack: CustomAdhkarPack) {
    setEditingPack(pack);
    setShowForm(true);
  }

  function handleCancel() {
    setShowForm(false);
    setEditingPack(null);
  }

  return (
    <div className="space-y-4 page-enter" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-3 px-1">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-white/5 transition-colors opacity-60 hover:opacity-100"
          aria-label="رجوع"
        >
          <ArrowRight size={18} />
        </button>
        <div>
          <h1 className="text-lg font-semibold">أذكاري المخصصة</h1>
          <p className="text-xs opacity-50">أنشئ حزمة أذكار خاصة بك</p>
        </div>
      </div>

      {/* Create / Edit form */}
      {showForm ? (
        <PackForm
          initial={editingPack ?? undefined}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : (
        <button
          onClick={() => { setEditingPack(null); setShowForm(true); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl glass border border-dashed border-white/20 hover:border-[var(--accent)]/50 hover:bg-white/5 transition-all text-sm opacity-70 hover:opacity-100"
        >
          <Plus size={16} />
          إنشاء حزمة جديدة
        </button>
      )}

      {/* Existing packs */}
      {customPacks.length === 0 && !showForm && (
        <Card className="p-6 text-center">
          <div className="text-3xl mb-2">📝</div>
          <div className="text-sm opacity-60">لا توجد حزمات بعد.<br />أنشئ أول حزمة أذكار خاصة بك!</div>
        </Card>
      )}

      {customPacks.map((pack) =>
        editingPack?.id === pack.id && showForm ? null : (
          <PackCard
            key={pack.id}
            pack={pack}
            onNavigate={() => navigate(`/c/${pack.id}`)}
            onDelete={() => deleteCustomPack(pack.id)}
            onEdit={() => handleEdit(pack)}
          />
        ),
      )}
    </div>
  );
}
