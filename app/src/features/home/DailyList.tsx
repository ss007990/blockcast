// The 7/14-day list: weekday, condition, and a shared-scale range bar the
// user can flip between temperature (default), wind, rain and snow — plus
// each day's best block score as a risk chip. Tapping a row opens the day's
// best block in the DetailSheet.

import { motion } from 'framer-motion';
import { useState } from 'react';
import { TOL_MULT } from '../../core/activities';
import { forecastDayKeys, getBlock, wmoIcon, type ForecastData } from '../../core/forecast';
import type { Band } from '../../core/scoring';
import { cmToIn, formatTemp, kmhToMph, mmToIn } from '../../core/units';
import { useLocale, useT } from '../../hooks';
import { fill } from '../../i18n';
import { fmtWeekdayShort } from '../../lib/format';
import { Icon, type IconName } from '../../ui/Icon';
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

type Metric = 'temp' | 'wind' | 'rain' | 'snow';
const METRIC_ICONS: Record<Metric, IconName> = {
  temp: 'thermo',
  wind: 'wind',
  rain: 'rain',
  snow: 'snow',
};

interface Row {
  day: string;
  icon: string;
  lo: number;
  hi: number;
  /** Peak sustained wind / gust over the day, km/h. */
  wind: number;
  gust: number;
  /** Peak precipitation probability, %. */
  pprob: number;
  /** Total precipitation, mm. */
  rain: number;
  /** Total snowfall, cm. */
  snow: number;
  best: { h: number; score: number; band: Band } | null;
}

/** Total snowfall over one day, cm — from the flat hourly array. */
function daySnow(data: ForecastData, day: string): number {
  let sum = 0;
  for (let h = 0; h < 24; h++) {
    const i = data.timeIndex.get(`${day}T${String(h).padStart(2, '0')}:00`);
    if (i !== undefined) sum += data.snowfall[i] ?? 0;
  }
  return sum;
}

export function DailyList({ data, todayISO, nowH, curTemp, onDay }: Props) {
  const t = useT();
  const locale = useLocale();
  const st = useSettings();
  const [all, setAll] = useState(false);
  const [picked, setPicked] = useState<Metric>('temp');

  const crit = critFor(st, st.activity);
  const tolMult = TOL_MULT[st.tolerance];
  const imp = st.units === 'imperial';

  const rows: Row[] = forecastDayKeys(data, all ? 14 : 7).map((day) => {
    const di = data.daily.time.indexOf(day);
    let best: Row['best'] = null;
    for (let h = st.hFrom; h < st.hTo; h += st.blockLen) {
      const end = Math.min(h + st.blockLen, st.hTo);
      if (day === todayISO && end <= nowH) continue; // block already over
      const b = getBlock(data, day, h, Math.max(1, end - h), crit, tolMult);
      if (b && (!best || b.score < best.score)) best = { h, score: b.score, band: b.band };
    }
    let wind = 0;
    let gust = 0;
    let pprob = 0;
    let rain = 0;
    for (const sl of data.days[day] ?? []) {
      if (!sl) continue;
      wind = Math.max(wind, sl.wind);
      gust = Math.max(gust, sl.gust);
      pprob = Math.max(pprob, sl.pprob);
      rain += sl.precip;
    }
    return {
      day,
      icon: wmoIcon(data.daily.weather_code[di] ?? 0),
      lo: data.daily.temperature_2m_min?.[di] ?? data.daily.apparent_temperature_min[di] ?? 0,
      hi: data.daily.temperature_2m_max?.[di] ?? data.daily.apparent_temperature_max[di] ?? 0,
      wind,
      gust,
      pprob,
      rain,
      snow: daySnow(data, day),
      best,
    };
  });

  // the ❄️ toggle only exists when the fortnight actually has snowfall
  const snowAny = forecastDayKeys(data, 14).some((day) => daySnow(data, day) > 0);
  const metric: Metric = picked === 'snow' && !snowAny ? 'temp' : picked;

  // shared scales: temperature spans [gmin, gmax]; wind and snow run 0 → max
  const gmin = Math.min(...rows.map((r) => r.lo));
  const gmax = Math.max(...rows.map((r) => r.hi));
  const total = Math.max(1, gmax - gmin);
  const maxGust = Math.max(10, ...rows.map((r) => r.gust));
  const maxSnow = Math.max(1, ...rows.map((r) => r.snow));

  const metricLabel: Record<Metric, string> = {
    temp: t.home.metricTemp,
    wind: t.tune.wind,
    rain: t.tune.rain,
    snow: t.detail.snow,
  };
  const metrics: Metric[] = snowAny ? ['temp', 'wind', 'rain', 'snow'] : ['temp', 'wind', 'rain'];

  // row labels stay unitless numbers; the caption line carries the unit
  const speedNum = (kmh: number) => String(Math.round(imp ? kmhToMph(kmh) : kmh));
  const precipNum = (mm: number) => String(imp ? +mmToIn(mm).toFixed(2) : +mm.toFixed(1));
  const depthNum = (cm: number) => String(imp ? +cmToIn(cm).toFixed(1) : Math.round(cm));

  const unit =
    metric === 'wind' ? (imp ? 'mph' : 'km/h') : metric === 'rain' ? (imp ? 'in' : 'mm') : imp ? 'in' : 'cm';
  const caption =
    metric === 'temp'
      ? t.home.next7Fine
      : fill(
          metric === 'wind'
            ? t.home.next7FineWind
            : metric === 'rain'
              ? t.home.next7FineRain
              : t.home.next7FineSnow,
          { u: unit },
        );

  return (
    <motion.section
      aria-label={t.home.next7}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.12 }}
    >
      <h2 className={s.sectionTitle}>
        <span>{t.home.next7}</span>
        <span className={s.metricBtns}>
          {metrics.map((m) => (
            <button
              key={m}
              className={s.metricBtn}
              data-on={metric === m || undefined}
              aria-label={metricLabel[m]}
              aria-pressed={metric === m}
              title={metricLabel[m]}
              onClick={() => setPicked(m)}
            >
              <Icon name={METRIC_ICONS[m]} size={20} />
            </button>
          ))}
        </span>
      </h2>
      <p className={s.sectionCaption}>{caption}</p>
      <div className={s.daily} data-metric={metric}>
        {rows.map((r) => {
          let left = 0;
          let loLabel = '';
          let width: number;
          let hiLabel: string;
          if (metric === 'temp') {
            left = ((r.lo - gmin) / total) * 100;
            width = Math.max(4, ((r.hi - r.lo) / total) * 100);
            loLabel = formatTemp(r.lo, st.units);
            hiLabel = formatTemp(r.hi, st.units);
          } else if (metric === 'wind') {
            width = Math.max(4, ((r.gust - r.wind) / maxGust) * 100);
            left = Math.min((r.wind / maxGust) * 100, 100 - width);
            loLabel = speedNum(r.wind);
            hiLabel = speedNum(r.gust);
          } else if (metric === 'rain') {
            width = r.pprob;
            loLabel = `${Math.round(r.pprob)}%`;
            hiLabel = precipNum(r.rain);
          } else {
            width = (r.snow / maxSnow) * 100;
            hiLabel = depthNum(r.snow);
          }
          const isToday = r.day === todayISO;
          const dot =
            metric === 'temp' && isToday && curTemp != null
              ? Math.min(100, Math.max(0, ((curTemp - gmin) / total) * 100))
              : null;
          const rangeText =
            metric === 'temp'
              ? `${formatTemp(r.lo, st.units)}–${formatTemp(r.hi, st.units)}`
              : `${metricLabel[metric]} ${loLabel}${loLabel && hiLabel ? (metric === 'wind' ? '–' : ' · ') : ''}${hiLabel} ${unit}`;
          return (
            <button
              key={r.day}
              className={s.dayRow}
              onClick={() => r.best && onDay(r.day, r.best.h)}
              disabled={!r.best}
              aria-label={`${fmtWeekdayShort(r.day, locale)} · ${rangeText}`}
            >
              <span className={s.dayName}>
                {isToday ? t.common.today : fmtWeekdayShort(r.day, locale)}
              </span>
              <span className={s.dayIco} aria-hidden="true">
                {r.icon}
              </span>
              <span className={s.dayLo}>{loLabel}</span>
              <span className={s.dayBar} aria-hidden="true">
                <i
                  style={
                    metric === 'temp'
                      ? {
                          left: `${left}%`,
                          width: `${width}%`,
                          backgroundSize: `${(100 / width) * 100}% 100%`,
                          backgroundPosition: `${width >= 99 ? 0 : (left / (100 - width)) * 100}% 0`,
                        }
                      : { left: `${left}%`, width: `${width}%` }
                  }
                />
                {dot != null && <span className={s.dayDot} style={{ left: `${dot}%` }} />}
              </span>
              <span className={s.dayHi}>{hiLabel}</span>
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
