// The "Hour by hour" panel: one boxed module — a compact felt-temperature
// curve with values written on the points, and a per-hour grid (rain, wind)
// column-aligned with the curve. Numbers beat charts for 2–6 data points.

import { motion } from 'framer-motion';
import type { HourSlice } from '../../core/scoring';
import {
  cToF,
  formatHour,
  type ClockFormat,
  type UnitSystem,
} from '../../core/units';
import type { Dict } from '../../i18n';
import s from './detail.module.css';

const W = 320;
const H = 74;
const TOP = 20; // room for the value labels above the curve
const BOT = 8;

interface ChartsProps {
  hours: { h: number; slice: HourSlice }[];
  units: UnitSystem;
  clock: ClockFormat;
  t: Dict;
}

export function HourlyCharts({ hours, units, clock, t }: ChartsProps) {
  if (hours.length < 2) return null;
  const n = hours.length;
  const temps = hours.map((h) => h.slice.temp);
  const probs = hours.map((h) => Math.round(h.slice.pprob));
  const winds = hours.map((h) => Math.round(h.slice.wind));

  // points sit at column centers so the grid below lines up with the curve
  const x = (i: number) => ((i + 0.5) * W) / n;
  const lo = Math.min(...temps);
  const hi = Math.max(...temps);
  const span = Math.max(3, hi - lo);
  const mid = (hi + lo) / 2;
  const y = (v: number) => H - BOT - ((v - (mid - span / 2)) / span) * (H - TOP - BOT);

  const line = temps.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
  const area = `${line} L${x(n - 1)},${H} L${x(0)},${H} Z`;
  const deg = (c: number) => `${Math.round(units === 'imperial' ? cToF(c) : c)}°`;

  const rainColor = (p: number) =>
    p >= 60 ? 'var(--red)' : p >= 30 ? 'var(--amber)' : p > 0 ? 'var(--ink-2)' : 'var(--ink-3)';

  const cols = { gridTemplateColumns: `repeat(${n}, 1fr)` };

  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <b>{t.detail.hourly}</b>
        <span className="tnum">
          {t.detail.rain} % · {t.detail.wind} {units === 'imperial' ? 'mph' : 'km/h'}
        </span>
      </div>

      <svg className={s.chart} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
        <path d={area} fill="var(--accent-soft)" />
        <motion.path
          d={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
        {temps.map((v, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(v)} r="2.6" fill="var(--accent)" />
            <text
              x={x(i)}
              y={y(v) - 8}
              textAnchor="middle"
              fontSize="11"
              fontWeight="650"
              fill="var(--ink)"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {deg(v)}
            </text>
          </g>
        ))}
      </svg>

      <div className={s.hgrid} style={cols}>
        {hours.map(({ h }) => (
          <span key={h} className={s.hHour}>
            {formatHour(h, clock)}
          </span>
        ))}
        {probs.map((p, i) => (
          <span key={`p${i}`} className={s.hCell} style={{ color: rainColor(p) }}>
            💧 {p}%
          </span>
        ))}
        {winds.map((w, i) => (
          <span key={`w${i}`} className={s.hCell} style={{ color: 'var(--ink-2)' }}>
            💨 {units === 'imperial' ? Math.round(w / 1.609344) : w}
          </span>
        ))}
      </div>
    </div>
  );
}
