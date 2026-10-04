import * as React from "react";

type FocusManagedDialogProps = Omit<React.HTMLAttributes<HTMLDivElement>, "onKeyDown"> & {
  onClose: () => void;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable=true]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) =>
    element.tabIndex >= 0
    && !element.matches(":disabled")
    && !element.closest("[hidden], [inert], [aria-hidden=true]"),
  );
}

/** A lightweight non-portal dialog wrapper for existing overlay sheets. */
export function FocusManagedDialog({ onClose, children, ...props }: FocusManagedDialogProps) {
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusables = getFocusableElements(dialog);
    const initialFocus = dialog.querySelector<HTMLElement>("[data-dialog-initial-focus]");
    const focusTarget = initialFocus && focusables.includes(initialFocus)
      ? initialFocus
      : focusables[0] ?? dialog;
    const inertedElements: Array<{ element: HTMLElement; wasInert: boolean }> = [];

    let current: HTMLElement | null = dialog;
    while (current?.parentElement) {
      const parentElement: HTMLElement = current.parentElement;
      for (const sibling of Array.from(parentElement.children)) {
        if (!(sibling instanceof HTMLElement) || sibling === current || sibling.contains(dialog)) continue;
        const wasInert = sibling.hasAttribute("inert") || sibling.inert;
        inertedElements.push({ element: sibling, wasInert });
        sibling.setAttribute("inert", "");
      }
      if (parentElement === document.body) break;
      current = parentElement;
    }

    const keepFocusInside = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) focusTarget.focus();
    };

    document.addEventListener("focusin", keepFocusInside);
    focusTarget.focus();

    return () => {
      document.removeEventListener("focusin", keepFocusInside);
      for (const { element, wasInert } of inertedElements) {
        if (wasInert) element.setAttribute("inert", "");
        else element.removeAttribute("inert");
      }
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const onKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onCloseRef.current();
      return;
    }
    if (event.key !== "Tab") return;

    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusables = getFocusableElements(dialog);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (!first || !last) {
      event.preventDefault();
      dialog.focus();
    } else if (!dialog.contains(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  return (
    <div
      {...props}
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
}
