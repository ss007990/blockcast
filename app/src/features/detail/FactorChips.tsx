// Severity-tinted factor chips for one scored block — shared by the
// detail sheet and the Today view's inline block cards.

import type { Criteria, FactorKey } from '../../core/activities';
import type { BlockResult } from '../../core/forecast';
import {
  formatDepth,
  formatHeight,
  formatPrecip,
  formatSpeed,
  formatTemp,
  type UnitSystem,
} from '../../core/units';
import type { Dict } from '../../i18n';
import s from './detail.module.css';

interface Props {
  b: BlockResult;
  crit: Criteria;
  tolMult: number;
  units: UnitSystem;
  t: Dict;
}

export function FactorChips({ b, crit, tolMult, units, t }: Props) {
  const effOf = (k: FactorKey) => Math.min(1, b.f.sev[k] * tolMult) * (crit.weights[k] / 10);

  const tempVal =
    b.f.temp < crit.tMin
      ? `${formatTemp(b.f.temp, units)} · ${t.detail.min} ${formatTemp(crit.tMin, units)}`
      : b.f.temp > crit.tMax
        ? `${formatTemp(b.f.temp, units)} · ${t.detail.max} ${formatTemp(crit.tMax, units)}`
        : formatTemp(b.f.temp, units);

  const gustSpan = `${Math.round(b.f.wind)}–${Math.round(b.f.gust)}`;
  const rows: { name: string; val: string; eff: number }[] = [
    {
      name: `🌧 ${t.detail.rain}`,
      val: `${b.f.rainProb}% · ${formatPrecip(b.f.rainSum, units)}`,
      eff: effOf('rain'),
    },
    ...(crit.act.snowBase != null
      ? [
          {
            name: `❄️ ${t.detail.snow}`,
            val: formatDepth(b.f.depth, units),
            eff: effOf('snow'),
          },
          {
            name: `🌨 ${t.detail.freshSnow}`,
            val: `${formatDepth(b.f.fresh48, units)}/48 h`,
            eff: effOf('fresh'),
          },
        ]
      : []),
    {
      name: `💨 ${t.detail.wind}`,
      val: units === 'imperial' ? formatSpeed(b.f.gust, units) : `${gustSpan} km/h`,
      eff: effOf('wind'),
    },
    // marine chips: water activities only, and only where the ocean data exists
    ...(crit.act.cat === 'water' && b.f.swell != null
      ? [{ name: `🌊 ${t.detail.swell}`, val: formatHeight(b.f.swell, units), eff: effOf('swell') }]
      : []),
    ...(crit.act.cat === 'water' && b.f.tideNorm != null
      ? [
          {
            name: `🌗 ${t.detail.tide}`,
            val:
              (b.f.tideNorm < 0.35
                ? t.detail.tideLow
                : b.f.tideNorm > 0.65
                  ? t.detail.tideHigh
                  : t.detail.tideMid) +
              ((b.f.tideTrend ?? 0) > 0.05 ? ' ↑' : (b.f.tideTrend ?? 0) < -0.05 ? ' ↓' : ''),
            eff: effOf('tide'),
          },
        ]
      : []),
    { name: `🌡 ${t.detail.feels}`, val: tempVal, eff: Math.max(effOf('cold'), effOf('heat')) },
    { name: `☀️ ${t.detail.uv}`, val: String(b.f.uv), eff: effOf('uv') },
  ];

  return (
    <div className={s.chips}>
      {rows.map((r) => (
        <span
          key={r.name}
          className={s.chip}
          data-sev={r.eff >= 0.55 ? 'r' : r.eff >= 0.25 ? 'y' : 'ok'}
        >
          {r.name} <b>{r.val}</b>
        </span>
      ))}
    </div>
  );
}
