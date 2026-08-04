// The "rain starting around 15:10" card — 15-minute nowcast, shown only when
// precipitation is expected within the next two hours. Snow-aware: names the
// precipitation and totals it in cm instead of mm.

import { motion } from 'framer-motion';
import type { Nowcast } from '../../core/nowcast';
import { formatDepth, formatPrecip } from '../../core/units';
import { useLocale, useT } from '../../hooks';
import { fill } from '../../i18n';
import { fmtIsoTime } from '../../lib/format';
import { useSettings } from '../../state/settings';
import s from './home.module.css';

export function NowcastCard({ nc }: { nc: Nowcast }) {
  const t = useT();
  const locale = useLocale();
  const { units, clock } = useSettings();
  const snow = nc.kind === 'snow';

  const title = nc.startISO
    ? fill(snow ? t.home.nowcastSnowStart : t.home.nowcastRainStart, {
        time: fmtIsoTime(nc.startISO, locale, clock),
      })
    : nc.endISO
      ? fill(snow ? t.home.nowcastSnowEnd : t.home.nowcastRainEnd, {
          time: fmtIsoTime(nc.endISO, locale, clock),
        })
      : snow
        ? t.home.nowcastSnowOn
        : t.home.nowcastRainOn;

  const total = snow
    ? fill(t.home.nowcastSnowTotal, { amt: formatDepth(nc.snowCm, units) })
    : fill(t.home.nowcastRainTotal, { amt: formatPrecip(nc.rainMm, units) });

  // chart scale: bars are mm of rain (or cm of snow) per 15 min; the axis
  // tops out at the window's peak, floored so drizzle doesn't look like a storm
  const peak = Math.max(...nc.bars, snow ? 0.2 : 0.4);
  const amt = (v: number) =>
    snow ? formatDepth(+v.toFixed(1), units) : formatPrecip(+v.toFixed(1), units);

  return (
    <motion.section
      className={s.nowcast}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      aria-label={title}
    >
      <div className={s.nowcastTitle}>
        {snow ? '🌨' : '🌧'} {title}
      </div>
      <div className={s.nowcastChart} aria-hidden="true">
        <div className={s.nowcastPlotCol}>
          <div className={s.nowcastBars} data-snow={snow || undefined}>
            {nc.bars.map((v, i) => (
              <i key={i} style={{ height: `${Math.max(4, (v / peak) * 100)}%` }} />
            ))}
          </div>
          <div className={s.nowcastFoot}>
            <span>0 h</span>
            <span>1 h</span>
            <span>2 h</span>
            <span>3 h</span>
          </div>
        </div>
        <span className={s.nowcastScale}>{amt(peak)}</span>
      </div>
      <div className={s.nowcastTotal}>{total}</div>
    </motion.section>
  );
}
