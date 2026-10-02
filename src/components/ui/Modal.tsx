/**
 * Modal — centered on desktop, bottom-sheet on mobile.
 *
 * Why both? On a long scrollable list like the Quran page, a centred modal
 * positions itself in the middle of the *whole viewport* which can feel
 * disconnected from the row the user just tapped. A bottom sheet slides up
 * from the bottom and keeps the row visible above it.
 *
 * Behaviour:
 *  - Mobile (<sm): sheet pinned to the bottom of the viewport with rounded
 *    top corners. Max height 88vh so the user can still see the list above.
 *  - Desktop (>=sm): centred modal like a classic dialog.
 *  - Backdrop blur + click-to-dismiss on both.
 */
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X as XIcon } from "lucide-react";

export function Modal(props: {
  open: boolean;
  onClose: () => void;
  /** Accessible title announced for the dialog. */
  ariaLabel: string;
  children: React.ReactNode;
  /** Optional className applied to the panel */
  className?: string;
  /** Maximum height class. Mobile default: max-h-[88vh]; desktop: max-h-[85vh]. */
  maxHeightClass?: string;
}) {
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!props.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [props.open]);

  if (!props.open) return null;

  return (
    <Dialog.Root open={props.open} onOpenChange={(open) => { if (!open) props.onClose(); }}>
      <Dialog.Portal>
        <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center" dir="rtl">
          <Dialog.Overlay
            aria-hidden="true"
            onClick={props.onClose}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px] animate-athar-modal-fade"
          />
          <Dialog.Content
            tabIndex={-1}
            aria-describedby={undefined}
            onOpenAutoFocus={() => {
              restoreFocusRef.current = document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const restoreTarget = restoreFocusRef.current;
              if (restoreTarget?.isConnected) restoreTarget.focus({ preventScroll: true });
            }}
            className={[
              "absolute inset-x-0 bottom-0 flex w-full max-w-none flex-col overflow-hidden rounded-t-3xl border border-[var(--stroke)] bg-[var(--bg)] shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.45)]",
              "max-h-[88vh] animate-athar-modal-sheet",
              "sm:static sm:inset-auto sm:mx-auto sm:my-auto sm:max-h-[85vh] sm:w-full sm:max-w-xl sm:rounded-3xl sm:shadow-[0_24px_70px_-12px_rgba(0,0,0,0.45)]",
              props.className ?? "",
            ].join(" ")}
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
          >
            <Dialog.Title className="sr-only">{props.ariaLabel}</Dialog.Title>
            {/* Drag handle on mobile for affordance */}
            <div className="flex justify-center pt-2 pb-1 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-[var(--muted-2)]/40" />
            </div>
            {props.children}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
      <style>{`
        @keyframes athar-modal-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes athar-modal-sheet {
          from { transform: translateY(100%) }
          to { transform: translateY(0) }
        }
        @keyframes athar-modal-pop {
          from { transform: scale(0.96); opacity: 0 }
          to { transform: scale(1); opacity: 1 }
        }
      `}</style>
    </Dialog.Root>
  );
}

export const ModalCloseButton = (props: { onClose: () => void; label?: string }) => (
  <button type="button" onClick={props.onClose} aria-label={props.label ?? "إغلاق"}
    className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--stroke)] bg-[var(--card)] transition hover:bg-[var(--card-2)]">
    <XIcon className="h-4 w-4" aria-hidden="true" />
  </button>
);
