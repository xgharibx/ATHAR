import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, Plus, ArrowRight, BookOpen, ChevronDown, ChevronUp, Share2, Pencil, X, Check } from "lucide-react";
import toast from "react-hot-toast";

import { useNoorStore } from "@/store/noorStore";
import type { CustomAdhkarPack } from "@/data/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";

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
        aria-label={`نص الذكر ${index + 1}`}
      />
      <input
        type="number"
        min={1}
        max={9999}
        value={count}
        onChange={(e) => onCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
        inputMode="numeric"
        className="w-16 px-2 py-2 rounded-xl bg-[var(--card)] border border-[var(--stroke)] text-center text-sm outline-none focus:border-[var(--accent)]"
        aria-label={`عدد الذكر ${index + 1}`}
      />
      <button type="button"
        onClick={onRemove}
        className="p-2 rounded-xl hover:bg-danger-10 text-danger-60 hover:text-[var(--danger)] transition-colors"
        aria-label="حذف السطر"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}

// ─── Create / Edit form ──────────────────────────────────────────────────────
type FormItem = { id: string; text: string; count: number };

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
    initial?.items.length
      ? initial.items.map((i) => ({ id: crypto.randomUUID(), text: i.text, count: i.count }))
      : [{ id: crypto.randomUUID(), text: "", count: 1 }],
  );

  function addRow() { setItems((prev) => [...prev, { id: crypto.randomUUID(), text: "", count: 1 }]); }
  function removeRow(i: number) { setItems((prev) => prev.filter((_, idx) => idx !== i)); }
  function setItemText(i: number, v: string) { setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, text: v } : item)); }
  function setItemCount(i: number, v: number) { setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, count: v } : item)); }

  const valid = title.trim().length > 0 && items.some((it) => it.text.trim().length > 0);
  const validCount = items.filter((it) => it.text.trim().length > 0).length;

  return (
    <Card className="overflow-hidden" dir="rtl">
      {/* Form header */}
      <div
        className="px-5 py-4 flex items-center justify-between gap-3"
        style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", borderBottom: "1px solid var(--stroke)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">{initial ? "✏️" : "✨"}</span>
          <div>
            <div className="font-semibold text-sm">{initial ? "تعديل الحزمة" : "إنشاء حزمة أذكار"}</div>
            <div className="text-[11px] opacity-50">أضف أذكارك الخاصة واحفظها</div>
          </div>
        </div>
        <button type="button" onClick={onCancel} className="h-8 w-8 rounded-xl bg-[var(--card)] border border-[var(--stroke)] grid place-items-center opacity-60 hover:opacity-100 transition" aria-label="إلغاء">
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Pack title */}
        <div>
          <label htmlFor="pack-title" className="text-xs font-medium opacity-60 block mb-1.5">اسم الحزمة <span className="text-[var(--danger)]">*</span></label>
          <Input
            id="pack-title"
            placeholder="مثال: أذكاري الخاصة"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            dir="rtl"
          />
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium opacity-60">الأذكار</div>
            {validCount > 0 && (
              <div className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--stroke)] opacity-60">{validCount} ذكر</div>
            )}
          </div>
          {items.map((it, i) => (
            <ItemRow
              key={it.id}
              index={i}
              text={it.text}
              count={it.count}
              onText={(v) => setItemText(i, v)}
              onCount={(v) => setItemCount(i, v)}
              onRemove={() => removeRow(i)}
            />
          ))}
          <button type="button"
            onClick={addRow}
            className="mt-3 flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-dashed border-[var(--stroke)] hover:border-[var(--accent)] hover:bg-[var(--card)] opacity-60 hover:opacity-100 transition-all w-full justify-center"
          >
            <Plus size={14} aria-hidden="true" /> إضافة ذكر
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onCancel} className="flex-none">إلغاء</Button>
          <Button variant="primary" className="flex-1" onClick={() => valid && onSave(title.trim(), items.filter((it) => it.text.trim()))} disabled={!valid}>
            <Check size={15} aria-hidden="true" />
            {initial ? "حفظ التعديل" : "إنشاء الحزمة"}
          </Button>
        </div>
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
  const updateCustomPackItem = useNoorStore((s) => s.updateCustomPackItem);
  const removeCustomPackItem = useNoorStore((s) => s.removeCustomPackItem);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [editingItemIdx, setEditingItemIdx] = React.useState<number | null>(null);
  const [editText, setEditText] = React.useState("");
  const [editCount, setEditCount] = React.useState(1);
  const [confirmItemDeleteIdx, setConfirmItemDeleteIdx] = React.useState<number | null>(null);

  function startEditItem(i: number) {
    const it = pack.items[i];
    if (!it) return;
    setEditText(it.text);
    setEditCount(it.count);
    setEditingItemIdx(i);
  }

  function saveEditItem() {
    if (editingItemIdx === null || !editText.trim()) return;
    updateCustomPackItem(pack.id, editingItemIdx, { text: editText.trim(), count: editCount });
    setEditingItemIdx(null);
  }

  return (
    <Card className="p-4 space-y-3" dir="rtl">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl" aria-hidden="true">📝</span>
          <div className="min-w-0">
            <div className="font-semibold text-sm leading-tight line-clamp-2">{pack.title}</div>
            <div className="text-xs opacity-50">{pack.items.length} ذكر</div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button"
            onClick={() => setExpanded((e) => !e)}
            className="p-2 rounded-xl hover:bg-[var(--card)] transition-colors opacity-50 hover:opacity-100"
            aria-label="عرض الأذكار"
            aria-expanded={expanded}
            aria-controls={`pack-items-${pack.id}`}
          >
            {expanded ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
          </button>
          <button type="button"
            onClick={async () => {
              const lines = pack.items.map((it) => `• ${it.text}${it.count > 1 ? ` (${it.count}×)` : ""}`).join("\n");
              const text = `${pack.title}\n\n${lines}\n\n• أثر`;
              if (navigator.share) { await navigator.share({ text }).catch(() => {}); }
              else { try { await navigator.clipboard.writeText(text); toast.success("تم النسخ"); } catch { toast.error("تعذّر النسخ"); } }
            }}
            className="p-2 rounded-xl hover:bg-[var(--card)] transition-colors opacity-50 hover:opacity-100"
            aria-label="مشاركة الحزمة"
          >
            <Share2 size={15} />
          </button>
          <button type="button"
            onClick={onEdit}
            className="p-2 rounded-xl hover:bg-[var(--card)] transition-colors opacity-50 hover:opacity-100 text-xs"
            aria-label="تعديل"
          >
            ✏️
          </button>
          {confirmDelete ? (
            <>
              <button type="button"
                onClick={onDelete}
                className="px-2 py-1 text-xs rounded-xl bg-danger-20 text-[var(--danger)] hover:bg-danger-30 transition-colors"
              >
                تأكيد الحذف
              </button>
              <button type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs rounded-xl hover:bg-[var(--card)] transition-colors opacity-60"
              >
                إلغاء
              </button>
            </>
          ) : (
            <button type="button"
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-xl hover:bg-danger-10 text-danger-50 hover:text-[var(--danger)] transition-colors"
              aria-label="حذف"
            >
              <Trash2 size={15} />
            </button>
          )}
          <Button variant="primary" onClick={onNavigate} className="py-1 px-3 text-xs">
            <BookOpen size={13} aria-hidden="true" />
            فتح
          </Button>
        </div>
      </div>

      {/* Expanded items list with per-item edit/delete */}
      {expanded && pack.items.length > 0 && (
        <div id={`pack-items-${pack.id}`} className="space-y-1.5 border-t border-[var(--stroke)] pt-3">
          {pack.items.map((it, i) => (
            <div key={i}>
              {editingItemIdx === i ? (
                // Inline edit form
                <div className="flex items-center gap-2 bg-[var(--card)] rounded-xl px-3 py-2 border border-[var(--accent)]/30">
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    autoFocus
                    dir="rtl"
                    className="flex-1 bg-transparent text-xs outline-none"
                    aria-label="تعديل نص الذكر"
                  />
                  <input
                    type="number"
                    min={1}
                    value={editCount}
                    onChange={(e) => setEditCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-12 bg-transparent text-xs text-center outline-none border border-[var(--stroke)] rounded-lg px-1 py-0.5"
                    aria-label="عدد التكرار"
                  />
                  <button type="button" onClick={saveEditItem} className="p-1 rounded-lg text-[var(--ok)] hover:bg-ok-10 transition" aria-label="حفظ">
                    <Check size={13} />
                  </button>
                  <button type="button" onClick={() => setEditingItemIdx(null)} className="p-1 rounded-lg opacity-50 hover:opacity-100 transition" aria-label="إلغاء">
                    <X size={13} />
                  </button>
                </div>
              ) : confirmItemDeleteIdx === i ? (
                // Delete confirm row
                <div className="flex items-center justify-between gap-2 rounded-xl bg-danger-10 border border-danger-20 px-3 py-2">
                  <span className="text-xs opacity-70 line-clamp-1 flex-1">{it.text}</span>
                  <div className="flex gap-1 shrink-0">
                    <button type="button"
                      onClick={() => { removeCustomPackItem(pack.id, i); setConfirmItemDeleteIdx(null); }}
                      className="text-[10px] px-2 py-1 rounded-lg bg-danger-20 text-[var(--danger)]"
                    >تأكيد</button>
                    <button type="button"
                      onClick={() => setConfirmItemDeleteIdx(null)}
                      className="text-[10px] px-2 py-1 rounded-lg bg-[var(--card)] border border-[var(--stroke)] opacity-60"
                    >إلغاء</button>
                  </div>
                </div>
              ) : (
                // Normal item row
                <div className="flex items-center justify-between gap-2 text-xs rounded-xl px-2 py-1.5 hover:bg-[var(--card)] group transition">
                  <span className="line-clamp-2 leading-snug flex-1 opacity-70">{it.text}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="opacity-40 tabular-nums">× {it.count}</span>
                    <button type="button" onClick={() => startEditItem(i)}
                      className="p-1 rounded-lg opacity-0 group-hover:opacity-60 hover:!opacity-100 transition text-[var(--accent)]"
                      aria-label="تعديل"
                    >
                      <Pencil size={12} />
                    </button>
                    <button type="button" onClick={() => setConfirmItemDeleteIdx(i)}
                      className="p-1 rounded-lg opacity-0 group-hover:opacity-60 hover:!opacity-100 transition text-[var(--danger)]"
                      aria-label="حذف"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
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
  useScrollRestoration();
  const customPacks = useNoorStore((s) => s.customPacks);
  const addCustomPack = useNoorStore((s) => s.addCustomPack);
  const updateCustomPack = useNoorStore((s) => s.updateCustomPack);
  const deleteCustomPack = useNoorStore((s) => s.deleteCustomPack);

  const [showForm, setShowForm] = React.useState(false);
  const [editingPack, setEditingPack] = React.useState<CustomAdhkarPack | null>(null);

  function handleSave(title: string, items: FormItem[]) {
    const cleanItems = items.map(({ text, count }) => ({ text, count }));
    if (editingPack) {
      updateCustomPack(editingPack.id, { title, items: cleanItems });
      setEditingPack(null);
    } else {
      addCustomPack({ title, items: cleanItems });
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
        <button type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-[var(--card)] transition-colors opacity-60 hover:opacity-100"
          aria-label="رجوع"
        >
          <ArrowRight size={18} aria-hidden="true" />
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
        <button type="button"
          onClick={() => { setEditingPack(null); setShowForm(true); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl glass border border-dashed border-[var(--stroke)] hover:border-accent-50 hover:bg-[var(--card)] transition-all text-sm opacity-70 hover:opacity-100"
        >
          <Plus size={16} aria-hidden="true" />
          إنشاء حزمة جديدة
        </button>
      )}

      {/* Existing packs */}
      {customPacks.length === 0 && !showForm && (
        <Card className="p-6 text-center">
          <div className="text-3xl mb-2" aria-hidden="true">📝</div>
          <div className="text-sm opacity-60">لا توجد حزمات بعد.<br />أنشئ أول حزمة أذكار خاصة بك!</div>
        </Card>
      )}

      <div role="list" aria-label="الحزمات المخصصة" className="space-y-3">
        {customPacks.map((pack) =>
          editingPack?.id === pack.id && showForm ? null : (
            <div key={pack.id} role="listitem">
              <PackCard
                pack={pack}
                onNavigate={() => navigate(`/c/${pack.id}`)}
                onDelete={() => deleteCustomPack(pack.id)}
                onEdit={() => handleEdit(pack)}
              />
            </div>
          ),
        )}
      </div>
    </div>
  );
}
