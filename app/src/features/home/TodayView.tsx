import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { ACTIVITIES, TOL_MULT, type ActivityId } from '../../core/activities';
import { forecastDayKeys, getBlock, isoDate, locNow, wmoIcon } from '../../core/forecast';
import { orderActivities } from '../../core/season';
import type { Band } from '../../core/scoring';
import { bestWindows, snowfallEvent } from '../../core/suggestions';
import { formatDepth, formatHour, formatHourRange, formatTemp } from '../../core/units';
import { useLocale, useNowMs, useT } from '../../hooks';
import { fill } from '../../i18n';
import { fmtFull, fmtIsoTime, fmtWeekdayLong } from '../../lib/format';
import { useForecast } from '../../state/forecast';
import { critFor, useSettings } from '../../state/settings';
import { useUi } from '../../state/ui';
import { ActivityRail } from '../../ui/ActivityRail';
import { Icon } from '../../ui/Icon';
import { uiCss } from '../../ui/primitives';
import { paintSky } from './sky';
import { useSeason } from './useSeason';
import s from './home.module.css';

interface TodayBlock {
  h: number;
  end: number;
  score: number;
  band: Band;
  isPast: boolean;
  isNow: boolean;
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
  const nowH = now.getHours();

  const crit = useMemo(() => critFor(st, st.activity), [st]);
  const tolMult = TOL_MULT[st.tolerance];

  // today's blocks, scored for the current activity — same maths as the board
  const blocks = useMemo<TodayBlock[]>(() => {
    if (!data) return [];
    const out: TodayBlock[] = [];
    for (let h = st.hFrom; h < st.hTo; h += st.blockLen) {
      const end = Math.min(h + st.blockLen, st.hTo);
      const b = getBlock(data, todayISO, h, Math.max(1, end - h), crit, tolMult);
      if (!b) continue;
      out.push({
        h,
        end,
        score: b.score,
        band: b.band,
        isPast: end <= nowH,
        isNow: h <= nowH && nowH < end,
      });
    }
    return out;
  }, [data, st.hFrom, st.hTo, st.blockLen, todayISO, crit, tolMult, nowH]);

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
      tolMult,
      blockLen: st.blockLen,
      hFrom: st.hFrom,
      hTo: st.hTo,
      todayISO,
      nowHour: nowH,
    });
  }, [data, winter, st, tolMult, todayISO, nowH]);

  const snow = useMemo(() => {
    if (!data) return null;
    return snowfallEvent(data, todayISO, nowH, orderActivities(true));
  }, [data, todayISO, nowH]);

  if (!data) {
    return (
      <div className={uiCss.empty}>
        {status === 'error' ? `${t.common.loadErr} ${error} ${t.common.checkConn}` : t.common.loading}
      </div>
    );
  }

  const dayKeys = forecastDayKeys(data);
  const di = data.daily.time.indexOf(dayKeys[0] ?? todayISO);
  const cur = data.days[todayISO]?.[nowH] ?? data.days[dayKeys[0] ?? '']?.[12];
  const sunrise = data.daily.sunrise?.[di];
  const sunset = data.daily.sunset?.[di];
  const code = data.daily.weather_code[di] ?? 0;

  const sky = paintSky(data.days[todayISO] ?? [], st.hFrom, st.hTo, sunrise, sunset);

  // the verdict: lead with the answer for the best block still ahead
  const upcoming = blocks.filter((b) => !b.isPast);
  const best = upcoming.reduce<TodayBlock | null>(
    (a, b) => (a == null || b.score < a.score ? b : a),
    null,
  );
  const activityName = t.activities[st.activity];
  const headline = !best
    ? t.home.verdictDone
    : best.band === 'g'
      ? fill(t.home.verdictGreat, { activity: activityName })
      : best.band === 'y'
        ? fill(t.home.verdictOk, { activity: activityName })
        : fill(t.home.verdictBad, { activity: activityName });
  const verdictSub = !best
    ? t.home.verdictDoneSub
    : best.band === 'r'
      ? t.home.verdictBadSub
      : fill(t.home.verdictSub, {
          range: formatHourRange(best.h, best.end, st.clock),
          score: String(best.score),
        });

  const goPlan = (activityId: ActivityId, day: string, h: number) => {
    st.setActivity(activityId);
    setTab('week');
    select({ day, h });
  };

  return (
    <div>
      <ActivityRail />

      <motion.header
        key={`${st.activity}-${best?.band ?? 'x'}`}
        className={s.lede}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <h1 className={s.headline}>{headline}</h1>
        <div className={s.ledeSub}>
          <button className={s.ledeLoc} onClick={() => setLocOpen(true)}>
            <Icon name="pin" size={12} /> {st.loc.name}
          </button>
          <span className={s.ledeMeta}>
            {fmtFull(todayISO, locale)} · {verdictSub}
          </span>
        </div>
      </motion.header>

      <motion.section
        className={s.sky}
        style={{ backgroundImage: sky }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
        aria-label={t.home.todayBlocks}
      >
        <div className={s.skyMeta}>
          <span className={s.skyTemp}>{cur ? formatTemp(cur.temp, st.units) : '–'}</span>
          <span className={s.skyIcon}>{wmoIcon(code)}</span>
          <span className={s.skyHiLo}>
            {fill(t.home.hiLo, {
              hi: formatTemp(data.daily.apparent_temperature_max[di] ?? 0, st.units),
              lo: formatTemp(data.daily.apparent_temperature_min[di] ?? 0, st.units),
            })}
          </span>
        </div>

        <div className={s.blocks}>
          {blocks.map((b, i) => (
            <motion.button
              key={`${st.activity}-${b.h}`}
              className={s.block}
              data-band={b.band}
              data-past={b.isPast || undefined}
              data-now={b.isNow || undefined}
              disabled={b.isPast}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.04 * i }}
              aria-label={`${formatHourRange(b.h, b.end, st.clock)} · ${t.common.risk} ${b.score} · ${t.risk[b.band]}`}
              onClick={() => select({ day: todayISO, h: b.h })}
            >
              <b className={s.blockScore}>{b.score}</b>
              <span className={s.blockHours}>{formatHour(b.h, st.clock)}</span>
            </motion.button>
          ))}
        </div>

        {sunrise && sunset && (
          <div className={s.skyFoot}>
            <span>🌅 {fmtIsoTime(sunrise, locale, st.clock)}</span>
            <span>
              {t.home.now} · {t.home.feels} {cur ? formatTemp(cur.temp, st.units) : '–'}
            </span>
            <span>🌇 {fmtIsoTime(sunset, locale, st.clock)}</span>
          </div>
        )}
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
