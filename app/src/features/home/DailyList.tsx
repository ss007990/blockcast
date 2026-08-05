// The 7/14-day list: weekday, condition, real min/max on a shared-scale range
// bar (with a "now" dot on today), and each day's best block score as a
// risk chip. Tapping a row opens the day's best block in the DetailSheet.

import { motion } from 'framer-motion';
import { useState } from 'react';
import { TOL_MULT } from '../../core/activities';
import { forecastDayKeys, getBlock, wmoIcon, type ForecastData } from '../../core/forecast';
import type { Band } from '../../core/scoring';
import { formatTemp } from '../../core/units';
import { useLocale, useT } from '../../hooks';
import { fill } from '../../i18n';
import { fmtWeekdayShort } from '../../lib/format';
import { critFor, useSettings } from '../../state/settings';
import s from './home.module.css';

interface Props {
  data: ForecastData;
  todayISO: string;
  nowH: number;
  /** Current real temp, for the "now" dot on today's bar. */
  curTemp: number | null;
  onDay: (day: string, h: number) => void;
}

interface Row {
  day: string;
  icon: string;
  lo: number;
  hi: number;
  best: { h: number; score: number; band: Band } | null;
}

export function DailyList({ data, todayISO, nowH, curTemp, onDay }: Props) {
  const t = useT();
  const locale = useLocale();
  const st = useSettings();
  const [all, setAll] = useState(false);

  const crit = critFor(st, st.activity);
  const tolMult = TOL_MULT[st.tolerance];

  const rows: Row[] = forecastDayKeys(data, all ? 14 : 7).map((day) => {
    const di = data.daily.time.indexOf(day);
    let best: Row['best'] = null;
    for (let h = st.hFrom; h < st.hTo; h += st.blockLen) {
      const end = Math.min(h + st.blockLen, st.hTo);
      if (day === todayISO && end <= nowH) continue; // block already over
      const b = getBlock(data, day, h, Math.max(1, end - h), crit, tolMult);
      if (b && (!best || b.score < best.score)) best = { h, score: b.score, band: b.band };
    }
    return {
      day,
      icon: wmoIcon(data.daily.weather_code[di] ?? 0),
      lo: data.daily.temperature_2m_min?.[di] ?? data.daily.apparent_temperature_min[di] ?? 0,
      hi: data.daily.temperature_2m_max?.[di] ?? data.daily.apparent_temperature_max[di] ?? 0,
      best,
    };
  });

  const gmin = Math.min(...rows.map((r) => r.lo));
  const gmax = Math.max(...rows.map((r) => r.hi));
  const total = Math.max(1, gmax - gmin);

  return (
    <motion.section
      aria-label={t.home.next7}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.12 }}
    >
      <h2 className={s.sectionTitle}>
        <span>{t.home.next7}</span>
      </h2>
      <p className={s.sectionCaption}>{t.home.next7Fine}</p>
      <div className={s.daily}>
        {rows.map((r) => {
          const left = ((r.lo - gmin) / total) * 100;
          const width = Math.max(4, ((r.hi - r.lo) / total) * 100);
          const isToday = r.day === todayISO;
          const dot =
            isToday && curTemp != null
              ? Math.min(100, Math.max(0, ((curTemp - gmin) / total) * 100))
              : null;
          return (
            <button
              key={r.day}
              className={s.dayRow}
              onClick={() => r.best && onDay(r.day, r.best.h)}
              disabled={!r.best}
              aria-label={`${fmtWeekdayShort(r.day, locale)} · ${formatTemp(r.lo, st.units)}–${formatTemp(r.hi, st.units)}${r.best ? ` · ${fill(t.home.dayBest, { score: String(r.best.score) })}` : ''}`}
            >
              <span className={s.dayName}>
                {isToday ? t.common.today : fmtWeekdayShort(r.day, locale)}
              </span>
              <span className={s.dayIco} aria-hidden="true">
                {r.icon}
              </span>
              <span className={s.dayLo}>{formatTemp(r.lo, st.units)}</span>
              <span className={s.dayBar} aria-hidden="true">
                <i
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundSize: `${(100 / width) * 100}% 100%`,
                    backgroundPosition: `${width >= 99 ? 0 : (left / (100 - width)) * 100}% 0`,
                  }}
                />
                {dot != null && <span className={s.dayDot} style={{ left: `${dot}%` }} />}
              </span>
              <span className={s.dayHi}>{formatTemp(r.hi, st.units)}</span>
              {r.best ? (
                <span className={s.dayChip} data-band={r.best.band}>
                  {r.best.score}
                </span>
              ) : (
                <span className={s.dayChip} data-band="none">
                  –
                </span>
              )}
            </button>
          );
        })}
        <button className={s.dayMore} onClick={() => setAll((v) => !v)}>
          {all ? t.home.show7 : t.home.show14} {all ? '▴' : '▾'}
        </button>
      </div>
    </motion.section>
  );
}
