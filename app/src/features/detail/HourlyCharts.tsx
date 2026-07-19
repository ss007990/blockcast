// Hand-rolled SVG micro-charts: felt-temp area curve, rain-probability bars,
// wind line. Light, animated, theme-aware — no chart library.

import { motion } from 'framer-motion';
import type { HourSlice } from '../../core/scoring';
import { formatHour, formatSpeed, formatTemp, type ClockFormat, type UnitSystem } from '../../core/units';
import type { Dict } from '../../i18n';
import s from './detail.module.css';

const W = 320;
const H = 56;
const PAD = 6;

interface ChartsProps {
  hours: { h: number; slice: HourSlice }[];
  units: UnitSystem;
  clock: ClockFormat;
  t: Dict;
}

const x = (i: number, n: number) => PAD + (i * (W - 2 * PAD)) / Math.max(1, n - 1);

function scaleY(values: number[], v: number, minSpan = 4): number {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(minSpan, hi - lo);
  const mid = (hi + lo) / 2;
  const a = mid - span / 2;
  return H - PAD - ((v - a) / span) * (H - 2 * PAD);
}

export function HourlyCharts({ hours, units, clock, t }: ChartsProps) {
  if (hours.length < 2) return null;
  const n = hours.length;
  const temps = hours.map((h) => h.slice.temp);
  const winds = hours.map((h) => h.slice.wind);
  const probs = hours.map((h) => h.slice.pprob);

  const tempPath = temps.map((v, i) => `${i ? 'L' : 'M'}${x(i, n)},${scaleY(temps, v)}`).join(' ');
  const tempArea = `${tempPath} L${x(n - 1, n)},${H - 2} L${x(0, n)},${H - 2} Z`;
  const windPath = winds
    .map((v, i) => `${i ? 'L' : 'M'}${x(i, n)},${scaleY(winds, v, 10)}`)
    .join(' ');

  const barW = Math.min(18, (W - 2 * PAD) / n - 4);

  return (
    <div>
      <div className={s.chartsTitle}>{t.detail.hourly}</div>

      <div className={s.chartRow}>
        <div className={s.chartLabel}>
          <b>{t.detail.tempCurve}</b>
          <span className="tnum">
            {formatTemp(Math.min(...temps), units)} – {formatTemp(Math.max(...temps), units)}
          </span>
        </div>
        <svg className={s.chart} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <motion.path
            d={tempArea}
            fill="var(--accent-soft)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
          <motion.path
            d={tempPath}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </svg>
      </div>

      <div className={s.chartRow}>
        <div className={s.chartLabel}>
          <b>{t.detail.rainCurve}</b>
          <span className="tnum">{Math.max(...probs)}%</span>
        </div>
        <svg className={s.chart} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          {probs.map((p, i) => {
            const bh = Math.max(2, (p / 100) * (H - 2 * PAD));
            return (
              <motion.rect
                key={i}
                x={x(i, n) - barW / 2}
                width={barW}
                rx={3}
                fill={p >= 60 ? 'var(--red-vivid)' : p >= 30 ? 'var(--amber-vivid)' : 'var(--accent-2)'}
                opacity={0.75}
                initial={{ y: H - PAD, height: 0 }}
                animate={{ y: H - PAD - bh, height: bh }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
              />
            );
          })}
        </svg>
      </div>

      <div className={s.chartRow}>
        <div className={s.chartLabel}>
          <b>{t.detail.windCurve}</b>
          <span className="tnum">{formatSpeed(Math.max(...winds), units)}</span>
        </div>
        <svg className={s.chart} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
          <motion.path
            d={windPath}
            fill="none"
            stroke="var(--ink-3)"
            strokeWidth="2"
            strokeDasharray="1 0"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </svg>
      </div>

      <div className={s.chartLabel} style={{ marginTop: 2 }}>
        <span className="tnum">{formatHour(hours[0]!.h, clock)}</span>
        <span className="tnum">{formatHour(hours[n - 1]!.h + 1, clock)}</span>
      </div>
    </div>
  );
}
