import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Keyboard, X } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

type Shortcut = { keys: string[]; label: string };
const SHORTCUTS: Array<{ section: string; items: Shortcut[] }> = [
  {
    section: "التنقل",
    items: [
      { keys: ["Ctrl", "K"], label: "فتح البحث السريع" },
      { keys: ["G", "H"], label: "الذهاب للرئيسية" },
      { keys: ["G", "Q"], label: "الذهاب للقرآن" },
      { keys: ["G", "F"], label: "الذهاب للمفضلة" },
      { keys: ["G", "I"], label: "الذهاب للإحصاءات" },
      { keys: ["G", "S"], label: "الذهاب للإعدادات" },
    ],
  },
  {
    section: "العرض",
    items: [
      { keys: ["?"], label: "عرض اختصارات لوحة المفاتيح" },
      { keys: ["Esc"], label: "إغلاق النافذة / إلغاء" },
    ],
  },
  {
    section: "صفحة السورة",
    items: [
      { keys: ["←", "→"], label: "التنقل بين الصفحات" },
      { keys: ["M"], label: "تبديل وضع الحفظ" },
      { keys: ["F"], label: "تبديل وضع التركيز الكامل" },
      { keys: ["/"], label: "البحث داخل السورة" },
      { keys: ["Esc"], label: "إغلاق / إلغاء" },
    ],
  },
];

function KbdKey({ key: k }: { key: string }) {
  return (
    <kbd
      className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg border border-white/20 bg-white/8 text-[11px] font-mono font-semibold leading-none min-w-[26px]"
    >
      {k}
    </kbd>
  );
}

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = React.useState(false);

  // Open on "?" key
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === "?" &&
        !e.ctrlKey && !e.metaKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        setOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <IconButton
          aria-label="اختصارات لوحة المفاتيح (?)"
          title="اختصارات لوحة المفاتيح (?)"
          className="hidden md:inline-flex"
        >
          <Keyboard size={16} />
        </IconButton>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
        <Dialog.Content
          dir="rtl"
          className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm outline-none animate-in fade-in zoom-in-95 duration-200"
        >
          <Dialog.Title className="sr-only">اختصارات لوحة المفاتيح</Dialog.Title>
          <div className="glass-strong rounded-3xl border border-white/15 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Keyboard size={16} className="text-[var(--accent)]" />
                <span className="font-semibold text-sm">اختصارات لوحة المفاتيح</span>
              </div>
              <Dialog.Close asChild>
                <IconButton aria-label="إغلاق" className="w-8 h-8 min-w-0">
                  <X size={16} />
                </IconButton>
              </Dialog.Close>
            </div>

            {/* Shortcuts list */}
            <div className="p-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {SHORTCUTS.map((group) => (
                <div key={group.section}>
                  <div className="text-[11px] font-semibold opacity-50 mb-2.5 tracking-wide uppercase">
                    {group.section}
                  </div>
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
                        <span className="opacity-75 leading-none">{item.label}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          {item.keys.map((k, i) => (
                            <React.Fragment key={k}>
                              {i > 0 && <span className="text-[10px] opacity-40">+</span>}
                              <KbdKey key={k} />
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 pb-4 text-[11px] opacity-40 text-center border-t border-white/8 pt-3">
              اضغط <kbd className="inline font-mono px-1 py-0.5 bg-white/8 rounded text-[10px]">?</kbd> في أي وقت لعرض هذه القائمة
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
