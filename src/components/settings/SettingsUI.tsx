/**
 * Building blocks for the Settings pages: grouped cards of rows, the way the
 * phone's own Settings app lays them out. Each row can carry an anchor id
 * (setting-<id>) that search links to; the row then glows briefly.
 */
import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/utils";

export function SettingsSection(props: { title?: string; footer?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("settings-section", props.className)}>
      {props.title ? <h2 className="settings-section-title">{props.title}</h2> : null}
      <div className="settings-section-card">{props.children}</div>
      {props.footer ? <p className="settings-section-footer">{props.footer}</p> : null}
    </section>
  );
}

type RowProps = {
  /** Anchor for search: becomes id="setting-<id>". */
  id?: string;
  title: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  /** The control at the end of the row (switch, buttons…). */
  control?: React.ReactNode;
  /** A value shown at the end of a row that opens something. */
  value?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** Content under the title line, full width (sliders, lists). */
  children?: React.ReactNode;
};

export function SettingsRow({ id, title, hint, icon, control, value, onClick, disabled, children }: RowProps) {
  const head = (
    <>
      {icon ? <span className="settings-row-icon" aria-hidden="true">{icon}</span> : null}
      <span className="settings-row-text">
        <span className="settings-row-title">{title}</span>
        {hint ? <span className="settings-row-hint">{hint}</span> : null}
      </span>
      {value !== undefined ? <span className="settings-row-value">{value}</span> : null}
      {control ? <span className="settings-row-control">{control}</span> : null}
      {onClick ? <ChevronLeft size={16} className="settings-row-chevron" aria-hidden="true" /> : null}
    </>
  );
  return (
    <div id={id ? `setting-${id}` : undefined} className={cn("settings-row", disabled && "is-disabled")}>
      {onClick ? (
        <button type="button" className="settings-row-head is-button" onClick={onClick} disabled={disabled}>
          {head}
        </button>
      ) : (
        <div className="settings-row-head">{head}</div>
      )}
      {children ? <div className="settings-row-body">{children}</div> : null}
    </div>
  );
}

export function ToggleRow(props: {
  id?: string;
  title: string;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <SettingsRow
      id={props.id}
      title={props.title}
      hint={props.hint}
      icon={props.icon}
      disabled={props.disabled}
      control={<Switch aria-label={props.title} checked={props.checked} onCheckedChange={props.onChange} disabled={props.disabled} />}
    >
      {props.children}
    </SettingsRow>
  );
}

export function Segmented<T extends string | number>(props: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="settings-segment" role="radiogroup" aria-label={props.label}>
      {props.options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={props.value === option.value}
          disabled={props.disabled}
          onClick={() => props.onChange(option.value)}
          className={cn(props.value === option.value && "is-active")}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const step = props.step ?? 1;
  return (
    <div className="settings-stepper" role="group" aria-label={props.label}>
      <button
        type="button"
        aria-label={`إنقاص ${props.label}`}
        disabled={props.disabled || props.value <= props.min}
        onClick={() => props.onChange(Math.max(props.min, props.value - step))}
      >
        −
      </button>
      <output aria-live="polite">{props.format(props.value)}</output>
      <button
        type="button"
        aria-label={`زيادة ${props.label}`}
        disabled={props.disabled || props.value >= props.max}
        onClick={() => props.onChange(Math.min(props.max, props.value + step))}
      >
        +
      </button>
    </div>
  );
}

/** A choice from a list, each with a preview button (sounds). */
export function SoundChoices<T extends string>(props: {
  label: string;
  options: ReadonlyArray<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
  playing: string | null;
  previewKey: (id: T) => string;
  onPreview: (id: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="settings-choices" role="radiogroup" aria-label={props.label}>
      {props.options.map((option) => {
        const active = props.value === option.id;
        const playing = props.playing === props.previewKey(option.id);
        return (
          <div key={option.id} className={cn("settings-choice", active && "is-active")}>
            <button
              type="button"
              role="radio"
              aria-checked={active}
              disabled={props.disabled}
              onClick={() => props.onChange(option.id)}
              className="settings-choice-main"
            >
              <span className="settings-choice-dot" aria-hidden="true" />
              {option.label}
            </button>
            <button
              type="button"
              className="settings-choice-preview"
              onClick={() => props.onPreview(option.id)}
              aria-label={playing ? `إيقاف معاينة ${option.label}` : `معاينة ${option.label}`}
            >
              {playing ? "إيقاف" : "استماع"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
