import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { ACTIVITIES, TOL_MULT, type ActivityId } from '../../core/activities';
import { forecastDayKeys, isoDate, locNow, wmoIcon } from '../../core/forecast';
import { orderActivities } from '../../core/season';
import { bestWindows, snowfallEvent } from '../../core/suggestions';
import { formatDepth, formatHourRange, formatTemp } from '../../core/units';
import { useLocale, useNowMs, useT } from '../../hooks';
import { fill } from '../../i18n';
import { fmtFull, fmtIsoTime, fmtWeekdayLong } from '../../lib/format';
import { useForecast } from '../../state/forecast';
import { critFor, useSettings } from '../../state/settings';
import { useUi } from '../../state/ui';
import { Icon } from '../../ui/Icon';
import { uiCss } from '../../ui/primitives';
import { useSeason } from './useSeason';
import s from './home.module.css';

type Sky = 'clear' | 'cloud' | 'rain' | 'snow' | 'storm' | 'dusk' | 'night';

/** Map WMO code + local hour to one of the hero sky moods. */
function skyOf(code: number, hour: number, sunrise?: string, sunset?: string): Sky {
  if (code >= 95) return 'storm';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  const rise = sunrise ? +sunrise.slice(11, 13) : 6;
  const set = sunset ? +sunset.slice(11, 13) : 20;
  if (hour < rise - 1 || hour > set + 1) return 'night';
  if (Math.abs(hour - rise) <= 1 || Math.abs(hour - set) <= 1) return 'dusk';
  return code >= 2 ? 'cloud' : 'clear';
}

export function TodayView() {
  const t = useT();
  const locale = useLocale();
  const st = useSettings();
  const { data, status, error } = useForecast();
  const { setTab, select, setLocOpen } = useUi();
  const winter = useSeason();
  const nowMs = useNowMs();

  const now = locNow(data, nowMs);
  const todayISO = isoDate(now);

  const suggestions = useMemo(() => {
    if (!data) return [];
    const ordered = orderActivities(winter);
    const scan: ActivityId[] = [
      st.activity,
      ...ordered.filter((id) => id !== st.activity).slice(0, 3),
    ];
    return bestWindows(data, {
      activities: scan,
      critFor: (id) => critFor(st, id),
      tolMult: TOL_MULT[st.tolerance],
      blockLen: st.blockLen,
      hFrom: st.hFrom,
      hTo: st.hTo,
      todayISO,
      nowHour: now.getHours(),
    });
  }, [data, winter, st, todayISO, now]);

  const snow = useMemo(() => {
    if (!data) return null;
    return snowfallEvent(data, todayISO, now.getHours(), orderActivities(true));
  }, [data, todayISO, now]);

  if (!data) {
    return (
      <div className={uiCss.empty}>
        {status === 'error' ? `${t.common.loadErr} ${error} ${t.common.checkConn}` : t.common.loading}
      </div>
    );
  }

  const dayKeys = forecastDayKeys(data);
  const di = data.daily.time.indexOf(dayKeys[0] ?? todayISO);
  const cur = data.days[todayISO]?.[now.getHours()] ?? data.days[dayKeys[0] ?? '']?.[12];
  const sunrise = data.daily.sunrise?.[di];
  const sunset = data.daily.sunset?.[di];
  const code = data.daily.weather_code[di] ?? 0;
  const sky = skyOf(code, now.getHours(), sunrise, sunset);

  const goPlan = (activityId: ActivityId, day: string, h: number) => {
    st.setActivity(activityId);
    setTab('week');
    select({ day, h });
  };

  return (
    <div>
      <motion.section
        className={s.hero}
        data-sky={sky}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className={s.heroHead}>
          <button className={s.heroLoc} onClick={() => setLocOpen(true)}>
            <Icon name="pin" size={13} /> {st.loc.name}
          </button>
          <span className={s.heroDate}>{fmtFull(todayISO, locale)}</span>
        </div>

        <div className={s.heroRow}>
          <span className={s.heroTemp}>{cur ? formatTemp(cur.temp, st.units) : '–'}</span>
          <span className={s.heroIcon}>{wmoIcon(code)}</span>
        </div>

        <div className={s.heroStrip}>
          <span>
            {t.home.now} · {t.home.feels} <b>{cur ? formatTemp(cur.temp, st.units) : '–'}</b>
          </span>
          <span className="tnum">
            {fill(t.home.hiLo, {
              hi: formatTemp(data.daily.apparent_temperature_max[di] ?? 0, st.units),
              lo: formatTemp(data.daily.apparent_temperature_min[di] ?? 0, st.units),
            })}
          </span>
          {sunrise && sunset && (
            <span>
              🌅 {fmtIsoTime(sunrise, locale, st.clock)} · 🌇 {fmtIsoTime(sunset, locale, st.clock)}
            </span>
          )}
        </div>
      </motion.section>

      {snow && (
        <motion.div
          className={s.snowCard}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
        >
          <span className={s.snowIco}>❄️</span>
          <div>
            <div className={s.snowTitle}>
              {fill(t.home.snowTitle, { cm: formatDepth(snow.totalCm, st.units) })}
            </div>
            <div className={s.snowBody}>
              {fill(t.home.snowBody, {
                activities: snow.activities.map((a) => t.activities[a]).join(' · '),
              })}
            </div>
          </div>
        </motion.div>
      )}

      <h2 className={s.sectionTitle}>
        <span>{t.home.suggestions}</span>
      </h2>
      {suggestions.length === 0 ? (
        <div className={uiCss.empty}>{t.home.suggestionsEmpty}</div>
      ) : (
        <div className={s.list}>
          {suggestions.map((w, i) => (
            <motion.button
              key={`${w.activityId}-${w.day}-${w.h}`}
              className={s.row}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              onClick={() => goPlan(w.activityId, w.day, w.h)}
            >
              <span className={s.rowIdx}>{String(i + 1).padStart(2, '0')}</span>
              <span className={s.rowIco}>{ACTIVITIES[w.activityId].emoji}</span>
              <span className={s.rowMain}>
                <span className={s.rowTitle}>
                  {fill(t.home.bestWindow, { activity: t.activities[w.activityId] })}
                  {w.isWeekend && <span className={s.rowBadge}>{t.home.weekendBadge}</span>}
                </span>
                <span className={s.rowSub}>
                  {fmtWeekdayLong(w.day, locale)} ·{' '}
                  {formatHourRange(w.h, Math.min(w.h + w.len, 24), st.clock)}
                </span>
              </span>
              <span className={uiCss.chipG}>
                {t.common.risk} {w.score}
              </span>
              <span className={s.rowArrow} aria-hidden="true">
                →
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
