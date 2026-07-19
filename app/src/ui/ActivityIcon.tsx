// Activity glyph — emoji for most sports, hand-drawn SVG where no emoji
// exists (pontoon boats and side-by-sides are not in Unicode).
// SVGs size like emoji: 1.1em square, baseline-nudged, colors emoji-flat.

import type { ReactElement } from 'react';
import { ACTIVITIES, type ActivityId, type PresetActivityId } from '../core/activities';
import { useSettings } from '../state/settings';

const box = {
  width: '1.15em',
  height: '1.15em',
  verticalAlign: '-0.18em',
  display: 'inline-block',
} as const;

const PontoonSvg = (
  <svg viewBox="0 0 32 32" style={box} aria-hidden="true">
    <rect x="7.5" y="7" width="18" height="3.2" rx="1.4" fill="#2e7dd1" />
    <rect x="9.6" y="10" width="1.7" height="7" fill="#5b6670" />
    <rect x="21.7" y="10" width="1.7" height="7" fill="#5b6670" />
    <rect x="5.5" y="13.2" width="22" height="1.5" fill="#8b95a0" />
    <rect x="4" y="17" width="25" height="3.4" rx="1.2" fill="#c98a4b" />
    <rect x="27.4" y="18.5" width="2.4" height="5" rx="0.8" fill="#3d4249" />
    <rect x="4.5" y="21.6" width="22.5" height="4.2" rx="2.1" fill="#c3ccd4" stroke="#7f8a94" strokeWidth="0.9" />
    <path
      d="M2.5 29 q2 -2.2 4 0 t4 0 t4 0 t4 0 t4 0 t4 0 t4 0"
      stroke="#57a8e0"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const UtvSvg = (
  <svg viewBox="0 0 32 32" style={box} aria-hidden="true">
    <path
      d="M11.5 17.5 L14 8.5 L21.5 8.5 L24.5 17.5"
      stroke="#33373d"
      strokeWidth="2"
      strokeLinejoin="round"
      fill="none"
    />
    <rect x="15" y="13" width="5.4" height="4.8" rx="1" fill="#3d4249" />
    <path d="M3.5 22 v-4 l5.5-1.6 h6.5 l2-3.4 h4.5 l2.5 4.4 4.5 1.2 v3.4 z" fill="#2f6fae" />
    <path d="M3.5 22 h25 v1.6 h-25 z" fill="#26527d" />
    <circle cx="9.2" cy="24.2" r="4.6" fill="#2e2e33" />
    <circle cx="9.2" cy="24.2" r="2" fill="#9aa3ad" />
    <circle cx="23.6" cy="24.2" r="4.6" fill="#2e2e33" />
    <circle cx="23.6" cy="24.2" r="2" fill="#9aa3ad" />
  </svg>
);

const SVG: Partial<Record<PresetActivityId, ReactElement>> = {
  pontoon: PontoonSvg,
  utv: UtvSvg,
};

export function ActivityIcon({ id }: { id: ActivityId }) {
  // user-created activities carry their own emoji; 🏅 covers deleted ones
  const customEmoji = useSettings((s) => s.customActivities.find((c) => c.id === id)?.emoji);
  const svg = SVG[id as PresetActivityId];
  if (svg) return svg;
  const preset = (ACTIVITIES as Record<string, { emoji: string } | undefined>)[id];
  return <>{preset?.emoji ?? customEmoji ?? '🏅'}</>;
}
