// The 24-hour rail under the sky hero: hour, condition icon, real temp with
// the felt temp under it, and precipitation odds, with sunrise/sunset markers
// inline. Tapping an hour opens the DetailSheet of the block that contains it.

import { motion } from 'framer-motion';
import { wmoIcon, wmoIconAt, type ForecastData } from '../../core/forecast';
import { formatHour, formatTemp } from '../../core/units';
import { useLocale, useT } from '../../hooks';
import { fmtIsoTime } from '../../lib/format';
import { useSettings } from '../../state/settings';
import s from './home.module.css';

interface Props {
  data: ForecastData;
  todayISO: string;
  nextISO: string | undefined;
  nowH: number;
  /** Fallback icon code for hours fetched without an hourly weather code. */
  dayCode: number;
  onHour: (day: string, h: number) => void;
}

type Cell =
  | {
      kind: 'h';
      key: string;
      day: string;
      h: number;
      icon: string;
      temp: string;
      feels: string;
      pprob: number;
      isNow: boolean;
    }
  | { kind: 'sun'; key: string; icon: string; time: string };

export function HourlyRail({ data, todayISO, nextISO, nowH, dayCode, onHour }: Props) {
  const t = useT();
  const locale = useLocale();
  const { units, clock, hFrom, hTo, blockLen } = useSettings();

  const cells: Cell[] = [];
  for (let off = 0; off < 24; off++) {
    const abs = nowH + off;
    const day = abs < 24 ? todayISO : nextISO;
    if (!day) break;
    const h = abs % 24;
    const slice = data.days[day]?.[h];
    if (!slice) continue;
    cells.push({
      kind: 'h',
      key: `${day}-${h}`,
      day,
      h,
      icon: slice.code != null ? wmoIconAt(slice.code, slice.isDay ?? true) : wmoIcon(dayCode),
      temp: formatTemp(slice.air ?? slice.temp, units),
      feels: formatTemp(slice.temp, units),
      pprob: Math.round(slice.pprob),
      isNow: off === 0,
    });
  }

  // sunrise/sunset markers slot in after the hour they fall within
  const di = (iso: string) => data.daily.time.indexOf(iso);
  const marks: { iso: string | undefined; icon: string }[] = [
    { iso: data.daily.sunset?.[di(todayISO)], icon: '🌇' },
    { iso: nextISO ? data.daily.sunrise?.[di(nextISO)] : undefined, icon: '🌅' },
  ];
  for (const mk of marks) {
    if (!mk.iso) continue;
    const day = mk.iso.slice(0, 10);
    const h = +mk.iso.slice(11, 13);
    const at = cells.findIndex((c) => c.kind === 'h' && c.day === day && c.h === h);
    if (at < 0) continue;
    cells.splice(at + 1, 0, {
      kind: 'sun',
      key: `sun-${mk.iso}`,
      icon: mk.icon,
      time: fmtIsoTime(mk.iso, locale, clock),
    });
  }

  const blockStart = (h: number) => hFrom + Math.floor((h - hFrom) / blockLen) * blockLen;

  return (
    <motion.section
      aria-label={t.home.next24}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.08 }}
    >
      <h2 className={s.sectionTitle}>
        <span>{t.home.next24}</span>
      </h2>
      <div className={s.rail}>
        {cells.map((c) =>
          c.kind === 'sun' ? (
            <span key={c.key} className={s.railSun} aria-hidden="true">
              <span className={s.railIco}>{c.icon}</span>
              <span className={s.railSunTime}>{c.time}</span>
            </span>
          ) : (
            <button
              key={c.key}
              className={s.railHour}
              data-now={c.isNow || undefined}
              disabled={c.h < hFrom || c.h >= hTo}
              onClick={() => onHour(c.day, blockStart(c.h))}
              aria-label={`${formatHour(c.h, clock)} · ${c.temp} (${t.detail.felt} ${c.feels}) · ${c.pprob}%`}
            >
              <span className={s.railH}>{formatHour(c.h, clock)}</span>
              <span className={s.railIco} aria-hidden="true">
                {c.icon}
              </span>
              <span className={s.railT}>{c.temp}</span>
              <span className={s.railFeels}>{c.feels}</span>
              <span className={s.railP} data-wet={c.pprob >= 30 || undefined}>
                {c.pprob}%
              </span>
            </button>
          ),
        )}
      </div>
    </motion.section>
  );
}
