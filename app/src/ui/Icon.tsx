// Minimal stroke icon set, SF-Symbols-flavored. One component, no icon lib.

import type { ReactElement, SVGProps } from 'react';

export type IconName =
  | 'today'
  | 'week'
  | 'planner'
  | 'settings'
  | 'bell'
  | 'pin'
  | 'search'
  | 'thermo'
  | 'wind'
  | 'rain'
  | 'snow';

const PATHS: Record<IconName, ReactElement> = {
  today: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
    </>
  ),
  week: (
    <>
      <rect x="3.5" y="3.5" width="7.2" height="7.2" rx="2" />
      <rect x="13.3" y="3.5" width="7.2" height="7.2" rx="2" />
      <rect x="3.5" y="13.3" width="7.2" height="7.2" rx="2" />
      <rect x="13.3" y="13.3" width="7.2" height="7.2" rx="2" />
    </>
  ),
  planner: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.5h17M8.2 3v4M15.8 3v4" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="15" cy="7" r="2.2" fill="var(--surface)" />
      <circle cx="8.5" cy="12" r="2.2" fill="var(--surface)" />
      <circle cx="16.5" cy="17" r="2.2" fill="var(--surface)" />
    </>
  ),
  bell: (
    <>
      <path d="M6.2 9.8a5.8 5.8 0 0 1 11.6 0c0 5.2 1.7 6 1.7 7.2H4.5c0-1.2 1.7-2 1.7-7.2z" />
      <path d="M10 20a2.1 2.1 0 0 0 4 0" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21.5s-7.2-6.2-7.2-11.3a7.2 7.2 0 0 1 14.4 0c0 5.1-7.2 11.3-7.2 11.3z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  thermo: (
    <>
      <path d="M10 13.8V5a2 2 0 0 1 4 0v8.8a4.6 4.6 0 1 1-4 0z" />
      <path d="M12 9v7" />
      <circle cx="12" cy="16.8" r="1.1" fill="currentColor" />
    </>
  ),
  wind: (
    <>
      <path d="M3.5 8h9.6a2.6 2.6 0 1 0-2.6-2.6" />
      <path d="M3.5 12.5h13.8a2.8 2.8 0 1 1-2.8 2.8" />
      <path d="M3.5 17h6.4a2.1 2.1 0 1 1-2.1 2.1" />
    </>
  ),
  rain: (
    <>
      <path d="M12 3.6s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />
      <path d="M9.4 15.2a2.7 2.7 0 0 0 2 2.5" />
    </>
  ),
  snow: (
    <>
      <path d="M12 3.5v17M4.6 7.75l14.8 8.5M19.4 7.75l-14.8 8.5" />
      <path d="M9.7 4.6L12 6.9l2.3-2.3M9.7 19.4L12 17.1l2.3 2.3M3.9 11.3l3.1.8-.8 3.1M20.1 11.3l-3.1.8.8 3.1" />
    </>
  ),
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
