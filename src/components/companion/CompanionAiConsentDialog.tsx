import * as Dialog from "@radix-ui/react-dialog";
import { Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export function CompanionAiConsentDialog(props: {
  open: boolean;
  onApprove: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={props.open}
      onClose={props.onCancel}
      ariaLabel="إذن إرسال الرسائل إلى OpenAI"
      portalClassName="z-10001"
    >
      <div className="stack-y-4 px-5 pb-6 pt-4" dir="rtl">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-accent-35 bg-accent-15">
            <Sparkles className="h-5 w-5 text-(--accent)" aria-hidden="true" />
          </span>
          <h2 className="text-base font-bold text-(--fg)">إذن استخدام اسأل أثر</h2>
        </div>
        <Dialog.Description className="text-sm leading-7 text-(--fg) opacity-80">
          عند الموافقة، يُرسل أثر سؤالك وسياق المحادثة والصفحة إلى OpenAI لإنشاء الرد. وإذا فعّلت السياق الشخصي، تُرسل المعلومات التي اخترتها أيضًا. تسري موافقتك على الرسائل التالية، ويمكنك سحبها من الإعدادات في أي وقت. قد تُعالج البيانات خارج بلدك.
        </Dialog.Description>
        <a
          href="https://www.athark.org/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-(--accent) underline underline-offset-4"
        >
          تفاصيل سياسة الخصوصية
        </a>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={props.onCancel}
            className="min-h-11 flex-1 rounded-xl border border-(--stroke) bg-(--card) px-4 text-sm font-semibold text-(--fg)"
          >
            ليس الآن
          </button>
          <button
            type="button"
            onClick={props.onApprove}
            className="min-h-11 flex-1 rounded-xl bg-(--accent) px-4 text-sm font-bold text-black"
          >
            موافقة وإرسال
          </button>
        </div>
      </div>
    </Modal>
  );
}
