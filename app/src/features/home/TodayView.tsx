import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { TOL_MULT } from '../../core/activities';
import {
  forecastDayKeys,
  getBlock,
  isoDate,
  locNow,
  wmoIcon,
  type BlockResult,
} from '../../core/forecast';
import { orderActivities } from '../../core/season';
import type { Band, HourSlice } from '../../core/scoring';
import { snowfallEvent } from '../../core/suggestions';
import { formatDepth, formatHour, formatHourRange, formatTemp } from '../../core/units';
import { useLocale, useNowMs, useT } from '../../hooks';
import { fill } from '../../i18n';
import { fmtFull, fmtIsoTime } from '../../lib/format';
import { useForecast } from '../../state/forecast';
import { critFor, useSettings } from '../../state/settings';
import { useUi } from '../../state/ui';
import { ActivityRail } from '../../ui/ActivityRail';
import { Icon } from '../../ui/Icon';
import { uiCss } from '../../ui/primitives';
import { FactorChips } from '../detail/FactorChips';
import { HourlyCharts } from '../detail/HourlyCharts';
import { paintSky } from './sky';
import s from './home.module.css';

interface TodayBlock {
  h: number;
  end: number;
  score: number;
  band: Band;
  isPast: boolean;
  isNow: boolean;
  b: BlockResult;
}

export function TodayView() {
  const t = useT();
  const locale = useLocale();
  const st = useSettings();
  const { data, status, error } = useForecast();
  const { select, setLocOpen } = useUi();
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
        b,
      });
    }
    return out;
  }, [data, st.hFrom, st.hTo, st.blockLen, todayISO, crit, tolMult, nowH]);

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

  const daySlices = data.days[todayISO] ?? [];
  const sky = paintSky(daySlices, st.hFrom, st.hTo, sunrise, sunset);

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

  const blockHours = (blk: TodayBlock): { h: number; slice: HourSlice }[] => {
    const out: { h: number; slice: HourSlice }[] = [];
    for (let hh = blk.h; hh < blk.end && hh < 24; hh++) {
      const slice = daySlices[hh];
      if (slice) out.push({ h: hh, slice });
    }
    return out;
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
        <span>{t.home.blockByBlock}</span>
      </h2>
      <div className={s.details}>
        {blocks.map((blk, i) => (
          <motion.section
            key={`${st.activity}-${blk.h}-d`}
            className={s.detailCard}
            data-past={blk.isPast || undefined}
            data-now={blk.isNow || undefined}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: blk.isPast ? 0.55 : 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * i }}
            aria-label={`${formatHourRange(blk.h, blk.end, st.clock)} · ${t.common.risk} ${blk.score}`}
          >
            <button className={s.detailHead} onClick={() => select({ day: todayISO, h: blk.h })}>
              <span className={s.detailGauge} data-band={blk.band}>
                {blk.score}
              </span>
              <span className={s.detailWhen}>
                <b>{formatHourRange(blk.h, blk.end, st.clock)}</b>
                <span>
                  {t.risk[blk.band]}
                  {blk.isNow ? ` · ${t.home.now}` : ''}
                </span>
              </span>
              <span className={s.detailArrow} aria-hidden="true">
                →
              </span>
            </button>
            <FactorChips
              b={blk.b}
              crit={crit}
              tolMult={tolMult}
              units={st.units}
              activity={st.activity}
              t={t}
            />
            <HourlyCharts
              hours={blockHours(blk)}
              units={st.units}
              clock={st.clock}
              t={t}
              sun={null}
            />
          </motion.section>
        ))}
      </div>
    </div>
  );
}
