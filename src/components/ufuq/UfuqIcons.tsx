/**
 * The tab icons of «أفق», drawn for it rather than taken from the icon set the
 * classic design uses: an arch for «اليوم», an open mushaf, a dome, a ring of
 * beads and a four-part grid. One stroke weight, round joins, 24-unit grid.
 */
import * as React from "react";

type IconProps = { size?: number; active?: boolean; className?: string };

function Svg({ size = 24, active, className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 1.9 : 1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

/** A mihrab arch over the floor line. */
export function IconToday(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 20.5h17" />
      <path d="M6 20.5V11.2c0-3.6 2.7-6.4 6-8.2 3.3 1.8 6 4.6 6 8.2v9.3" />
      {props.active ? <path d="M9.5 20.5v-6.2a2.5 2.5 0 0 1 5 0v6.2" fill="currentColor" fillOpacity={0.18} /> : <path d="M9.5 20.5v-6.2a2.5 2.5 0 0 1 5 0v6.2" />}
    </Svg>
  );
}

/** An open mushaf with its spine. */
export function IconQuran(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M12 6.4C10.1 5 7.3 4.4 3.8 4.8v13.4c3.5-.4 6.3.2 8.2 1.6 1.9-1.4 4.7-2 8.2-1.6V4.8C16.7 4.4 13.9 5 12 6.4Z"
        fill={props.active ? "currentColor" : "none"}
        fillOpacity={props.active ? 0.14 : 0}
      />
      <path d="M12 6.4v13.4" />
    </Svg>
  );
}

/** A dome with its finial and crescent. */
export function IconPrayer(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.5 20.5h17" />
      <path
        d="M5.5 20.5v-6.3c0-3.4 2.9-6 6.5-6.7 3.6.7 6.5 3.3 6.5 6.7v6.3"
        fill={props.active ? "currentColor" : "none"}
        fillOpacity={props.active ? 0.14 : 0}
      />
      <path d="M12 7.5V5.2" />
      <path d="M13.3 3.4a1.6 1.6 0 1 1-1.9-.6" />
    </Svg>
  );
}

/** A ring of beads with its tassel. */
export function IconTasbeeh(props: IconProps) {
  const beads = Array.from({ length: 9 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 9 - Math.PI / 2 + Math.PI / 9;
    return { cx: 12 + Math.cos(angle) * 6, cy: 10 + Math.sin(angle) * 6 };
  });
  return (
    <Svg {...props}>
      {beads.map((b, i) => (
        <circle key={i} cx={b.cx.toFixed(2)} cy={b.cy.toFixed(2)} r={1.15} fill={props.active ? "currentColor" : "none"} />
      ))}
      <path d="M12 16.2v2.6" />
      <path d="M10.6 21l1.4-2.2 1.4 2.2" />
    </Svg>
  );
}

/** Four parts: everything else in Athar. */
export function IconExplore(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="2" fill={props.active ? "currentColor" : "none"} fillOpacity={props.active ? 0.16 : 0} />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="3.25" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="3.25" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2" fill={props.active ? "currentColor" : "none"} fillOpacity={props.active ? 0.16 : 0} />
    </Svg>
  );
}
