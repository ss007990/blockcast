import { motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { TOL_MULT } from '../../core/activities';
import {
  forecastDayKeys,
  getBlock,
  isoDate,
  locNow,
  wmoIcon,
  type BlockResult,
} from '../../core/forecast';
import { computeNowcast, precipStory } from '../../core/nowcast';
import { orderActivities } from '../../core/season';
import type { Band } from '../../core/scoring';
import { snowfallEvent } from '../../core/suggestions';
import { formatDepth, formatHour, formatHourRange, formatTemp } from '../../core/units';
import { useActivityName, useLocale, useNowMs, useT } from '../../hooks';
import { fill } from '../../i18n';
import { fmtClock, fmtFull, fmtIsoTime } from '../../lib/format';
import { webcamsAvailable } from '../../services/webcams';
import { useExtras } from '../../state/extras';
import { useForecast } from '../../state/forecast';
import { critFor, useSettings } from '../../state/settings';
import { useUi } from '../../state/ui';
import { ActivityPicker } from '../../ui/ActivityPicker';
import { Icon } from '../../ui/Icon';
import { RiskScale } from '../../ui/RiskScale';
import { uiCss } from '../../ui/primitives';
import { FactorChips } from '../detail/FactorChips';
import { TunePanel, TuneToggle } from '../tune/TunePanel';
import { DailyList } from './DailyList';
import { HourlyRail } from './HourlyRail';
import { NowcastCard } from './NowcastCard';
import { TilesGrid } from './TilesGrid';
import { paintSky, skyCard, skyNow } from './sky';
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
  const nameOf = useActivityName();
  const st = useSettings();
  const { data, status, error } = useForecast();
  const { aqhi, alerts } = useExtras();
  const { select, setLocOpen, setRadarOpen, setCamsOpen } = useUi();
  const nowMs = useNowMs();
  const [alertOpen, setAlertOpen] = useState(false);

  // Everything is read off the Date here and nothing but primitives escapes:
  // a mutable value living on into the render body defeats React Compiler,
  // which then can't prove the memo deps below are stable.
  const now = locNow(data, nowMs);
  const todayISO = isoDate(now);
  const nowH = now.getHours();
  const nowMin = now.getMinutes();
  const nowTime = now.getTime();

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
    return snowfallEvent(data, todayISO, nowH, orderActivities(true, st.customActivities), 5, st.customActivities);
  }, [data, todayISO, nowH, st.customActivities]);

  // 15-minute nowcast — non-null only when precip is due within ~2 h
  const nowcast = useMemo(() => {
    if (!data) return null;
    const local = locNow(data, nowMs);
    const q = Math.floor(local.getMinutes() / 15) * 15;
    const iso = `${isoDate(local)}T${String(local.getHours()).padStart(2, '0')}:${String(q).padStart(2, '0')}`;
    return computeNowcast(data, iso);
  }, [data, nowMs]);

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
  const ribbon = paintSky(daySlices, st.hFrom, st.hTo, sunrise, sunset);

  // the panel behind the type: this hour's sky, vertically, contrast-floored
  const nowFrac = nowH + nowMin / 60;
  const panel = skyNow(daySlices, nowFrac, sunrise, sunset);
  const card = skyCard(daySlices, nowFrac, sunrise, sunset);

  // where "now" falls on the ribbon's scale — the same scale the blocks use
  const axisSpan = Math.max(1, st.hTo - st.hFrom);
  const nowPct = ((nowFrac - st.hFrom) / axisSpan) * 100;
  const nowOnAxis = nowPct >= 0 && nowPct <= 100;
  // the caret is placed to the minute, so the label under it reads to the minute
  const nowClock = fmtIsoTime(
    `${todayISO}T${String(nowH).padStart(2, '0')}:${String(nowMin).padStart(2, '0')}`,
    locale,
    st.clock,
  );

  // the verdict: the best block still ahead of us
  const upcoming = blocks.filter((b) => !b.isPast);
  const best = upcoming.reduce<TodayBlock | null>(
    (a, b) => (a == null || b.score < a.score ? b : a),
    null,
  );

  // hero narrative: the day's precipitation story + the block verdict
  const story = precipStory(daySlices, nowH);
  const kindWord = (k: 'rain' | 'snow') => (k === 'rain' ? t.home.kindRain : t.home.kindSnow);
  const storyLine =
    story.type === 'dry'
      ? t.home.storyDry
      : fill(story.type === 'start' ? t.home.storyStart : t.home.storyEnd, {
          kind: kindWord(story.kind),
          time: formatHour(story.hour, st.clock),
        });
  const bestLine =
    best && best.band !== 'r'
      ? fill(t.home.bestLine, {
          range: formatHourRange(best.h, best.end, st.clock),
          score: String(best.score),
        })
      : t.home.bestLineNone;

  const openBlock = (day: string, h: number) => select({ day, h });

  // most severe ECCC alert first: warnings outrank watches outrank the rest
  const alertRank = (ty: string) => (ty === 'warning' ? 0 : ty === 'watch' ? 1 : 2);
  const alert = [...alerts].sort((a, b) => alertRank(a.type) - alertRank(b.type))[0];
  const fr = st.lang === 'fr';

  // radar and the webcams: the two ways to check the model against the sky
  const lookRow = (
    <motion.div
      className={s.lookRow}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <button
        className={s.lookCard}
        style={{ background: card }}
        data-wet={nowcast != null || undefined}
        onClick={() => setRadarOpen(true)}
      >
        <span className={s.lookIco} aria-hidden="true">
          📡
        </span>
        <span className={s.lookGo} aria-hidden="true">
          ↗
        </span>
        <b className={s.lookTitle}>{t.home.radar}</b>
        <span className={s.lookSub}>{nowcast ? t.home.radarWet : t.home.radarDry}</span>
      </button>
      {webcamsAvailable() && (
        <button className={s.lookCard} style={{ background: card }} onClick={() => setCamsOpen(true)}>
          <span className={s.lookIco} aria-hidden="true">
            📺
          </span>
          <span className={s.lookGo} aria-hidden="true">
            ↗
          </span>
          <b className={s.lookTitle}>{t.home.cams}</b>
          <span className={s.lookSub}>{t.home.camsSub}</span>
        </button>
      )}
    </motion.div>
  );

  return (
    <div>
      <ActivityPicker />

      {alert && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button
            className={s.alertBanner}
            data-type={alert.type}
            aria-expanded={alertOpen}
            onClick={() => setAlertOpen((v) => !v)}
          >
            <b>⚠️ {fr ? alert.nameFr : alert.nameEn}</b>
            <span>
              {fr ? alert.areaFr : alert.areaEn}
              {alert.ends
                ? ` · ${fill(t.home.alertUntil, { time: fmtClock(new Date(alert.ends), locale) })}`
                : ''}
            </span>
          </button>
          {alertOpen && (
            <div className={s.alertText}>{fr ? alert.textFr : alert.textEn}</div>
          )}
        </motion.div>
      )}

      <motion.section
        className={s.sky}
        style={{ background: panel }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
        aria-label={t.home.todayBlocks}
      >
        <div className={s.skyHead}>
          <button className={s.skyLoc} onClick={() => setLocOpen(true)}>
            <Icon name="pin" size={11} /> {st.loc.name}
          </button>
          <span className={s.skyDate}>{fmtFull(todayISO, locale)}</span>
        </div>

        <div className={s.skyMeta}>
          <span className={s.skyTempWrap}>
            <span className={s.skyTemp}>
              {cur ? formatTemp(cur.air ?? cur.temp, st.units) : '–'}
            </span>
            <span className={s.skyFeels}>
              {cur ? fill(t.home.feelsLike, { t: formatTemp(cur.temp, st.units) }) : ''}
            </span>
          </span>
          <span className={s.skyIcon}>{wmoIcon(code)}</span>
          <span className={s.skyHiLo}>
            <i>{t.home.hi}</i>{' '}
            {formatTemp(
              data.daily.temperature_2m_max?.[di] ?? data.daily.apparent_temperature_max[di] ?? 0,
              st.units,
            )}
            <br />
            <i>{t.home.lo}</i>{' '}
            {formatTemp(
              data.daily.temperature_2m_min?.[di] ?? data.daily.apparent_temperature_min[di] ?? 0,
              st.units,
            )}
          </span>
        </div>

        <p className={s.narrative}>
          {storyLine} <b>{bestLine}</b>
        </p>

        {/* ribbon, axis and blocks all run hFrom → hTo, so the painted hours
            line up with the block you'd tap */}
        <motion.div
          className={s.day}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut', delay: 0.14 }}
        >
          <div className={s.ribbon} style={{ backgroundImage: ribbon }} aria-hidden="true" />

          <div className={s.axis} aria-hidden="true">
            {sunrise && (nowPct > 22 || !nowOnAxis) && (
              <span className={s.axisLo}>🌅 {fmtIsoTime(sunrise, locale, st.clock)}</span>
            )}
            {nowOnAxis && (
              <span className={s.axisNow} style={{ left: `${nowPct}%` }}>
                {nowClock}
              </span>
            )}
            {sunset && (nowPct < 78 || !nowOnAxis) && (
              <span className={s.axisHi}>🌇 {fmtIsoTime(sunset, locale, st.clock)}</span>
            )}
          </div>

          <div className={s.blocks}>
            {blocks.map((b) => (
              <button
                key={`${st.activity}-${b.h}`}
                className={s.block}
                data-band={b.band}
                data-past={b.isPast || undefined}
                data-now={b.isNow || undefined}
                disabled={b.isPast}
                aria-label={`${formatHourRange(b.h, b.end, st.clock)} · ${t.common.risk} ${b.score} · ${t.risk[b.band]}`}
                onClick={() => openBlock(todayISO, b.h)}
              >
                <b className={s.blockWord}>{t.risk[`${b.band}Tiny`]}</b>
                <span className={s.blockHours}>
                  {formatHour(b.h, st.clock)}·{b.score}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      </motion.section>

      {nowcast && <NowcastCard nc={nowcast} />}

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
                activities: snow.activities.map(nameOf).join(' · '),
              })}
            </div>
          </div>
        </motion.div>
      )}

      <h2 className={s.sectionTitle}>
        <span>{t.home.bestTitle}</span>
        <span className={s.sectionFine}>{st.actChosen ? nameOf(st.activity) : ''}</span>
        <span className={s.sectionTune}>
          <TuneToggle />
        </span>
      </h2>
      <TunePanel />
      {best && best.band !== 'r' ? (
        <motion.section
          className={s.bestCard}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.06 }}
        >
          <button className={s.detailHead} onClick={() => openBlock(todayISO, best.h)}>
            <span className={s.detailGauge} data-band={best.band}>
              {best.score}
              <RiskScale score={best.score} />
            </span>
            <span className={s.detailWhen}>
              <b>
                {best.isNow
                  ? fill(t.home.bestNow, { end: formatHour(best.end, st.clock) })
                  : fill(t.home.bestAt, { range: formatHourRange(best.h, best.end, st.clock) })}
              </b>
              <span>{t.risk[best.band]}</span>
            </span>
            <span className={s.bestPlan}>＋ {t.home.plan}</span>
          </button>
          <FactorChips b={best.b} crit={crit} tolMult={tolMult} units={st.units} t={t} />
        </motion.section>
      ) : (
        <div className={s.bestNone}>{t.home.bestNone}</div>
      )}

      {lookRow}

      <HourlyRail
        data={data}
        todayISO={todayISO}
        nextISO={dayKeys[1]}
        nowH={nowH}
        dayCode={code}
        onHour={openBlock}
      />

      <DailyList
        data={data}
        todayISO={todayISO}
        nowH={nowH}
        curTemp={cur ? (cur.air ?? cur.temp) : null}
        onDay={openBlock}
      />

      <TilesGrid
        daySlices={daySlices}
        nowH={nowH}
        nowTime={nowTime}
        sunrise={sunrise}
        sunset={sunset}
        aqhi={aqhi}
      />
    </div>
  );
}
