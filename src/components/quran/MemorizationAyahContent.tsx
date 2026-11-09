import * as React from "react";

type MemorizationAyahContentProps = {
  enabled: boolean;
  hidden: boolean;
  label: string;
  onToggle: () => void;
  children: React.ReactNode;
};

/** Keeps a masked ayah out of the accessibility tree while exposing a usable reveal control. */
export function MemorizationAyahContent({
  enabled,
  hidden,
  label,
  onToggle,
  children,
}: MemorizationAyahContentProps) {
  const maskText = enabled && hidden;

  return (
    <>
      <span
        className={`mushaf-ayah-content${maskText ? " mem-hidden-text" : ""}`}
        aria-hidden={maskText || undefined}
      >
        {children}
      </span>
      {enabled ? (
        <button
          type="button"
          className="sr-only focus:not-sr-only focus:absolute focus:z-20 focus:rounded-lg focus:border focus:border-[var(--accent)] focus:bg-[var(--surface)] focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg"
          aria-label={label}
          aria-pressed={!hidden}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") return;
            event.preventDefault();
            event.stopPropagation();
            onToggle();
          }}
        >
          {label}
        </button>
      ) : null}
    </>
  );
}
