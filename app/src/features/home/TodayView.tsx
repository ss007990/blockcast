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
  const nameOf = useActivityName();
  const st = useSettings();
  const { data, status, error } = useForecast();
  const { aqhi, alerts } = useExtras();
  const { select, setLocOpen, setRadarOpen, setCamsOpen } = useUi();
  const nowMs = useNowMs();
  const [alertOpen, setAlertOpen] = useState(false);

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
  const sky = paintSky(daySlices, st.hFrom, st.hTo, sunrise, sunset);

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

  const radarCard = (
    <motion.button
      className={s.radarCard}
      data-wet={nowcast != null || undefined}
      onClick={() => setRadarOpen(true)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <span className={s.radarCap}>
        📡 {nowcast ? t.home.radarWet : t.home.radarDry}
      </span>
      <span className={s.radarOpen}>{t.home.openRadar} ↗</span>
    </motion.button>
  );

  return (
    <div>
      <ActivityPicker />

      <motion.header
        key={st.activity}
        className={s.lede}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <div className={s.ledeSub}>
          <button className={s.ledeLoc} onClick={() => setLocOpen(true)}>
            <Icon name="pin" size={12} /> {st.loc.name}
          </button>
          <span className={s.ledeMeta}>{fmtFull(todayISO, locale)}</span>
        </div>
      </motion.header>

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
        style={{ backgroundImage: sky }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
        aria-label={t.home.todayBlocks}
      >
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
            {fill(t.home.hiLo, {
              hi: formatTemp(
                data.daily.temperature_2m_max?.[di] ?? data.daily.apparent_temperature_max[di] ?? 0,
                st.units,
              ),
              lo: formatTemp(
                data.daily.temperature_2m_min?.[di] ?? data.daily.apparent_temperature_min[di] ?? 0,
                st.units,
              ),
            })}
          </span>
        </div>

        <p className={s.narrative}>
          {storyLine} <b>{bestLine}</b>
        </p>

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
              onClick={() => openBlock(todayISO, b.h)}
            >
              <b className={s.blockWord}>{t.risk[`${b.band}Tiny`]}</b>
              <span className={s.blockHours}>
                {formatHour(b.h, st.clock)}·{b.score}
              </span>
            </motion.button>
          ))}
        </div>

        <div className={s.skyActions}>
          <button className={s.skyActionBtn} onClick={() => setRadarOpen(true)}>
            📡 {t.home.radar}
          </button>
          {webcamsAvailable() && (
            <button className={s.skyActionBtn} onClick={() => setCamsOpen(true)}>
              🎥 {t.home.cams}
            </button>
          )}
        </div>

        {sunrise && sunset && (
          <div className={s.skyFoot}>
            <span>🌅 {fmtIsoTime(sunrise, locale, st.clock)}</span>
            <span className={s.footNow}>
              {t.home.now} · {t.home.feels} {cur ? formatTemp(cur.temp, st.units) : '–'}
            </span>
            <span>🌇 {fmtIsoTime(sunset, locale, st.clock)}</span>
          </div>
        )}

        <div className={s.scale} aria-label={t.home.scaleFine}>
          <div className={s.scaleBar} aria-hidden="true">
            <i data-band="g" />
            <i data-band="y" />
            <i data-band="r" />
          </div>
          <div className={s.scaleLabels} aria-hidden="true">
            <span>{t.home.scaleGo}</span>
            <span>25</span>
            <span>55</span>
            <span>{t.home.scaleStay}</span>
          </div>
        </div>
      </motion.section>

      {nowcast && (
        <>
          <NowcastCard nc={nowcast} />
          {radarCard}
        </>
      )}

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

      {!nowcast && radarCard}

      <TilesGrid
        daySlices={daySlices}
        nowH={nowH}
        now={now}
        sunrise={sunrise}
        sunset={sunset}
        aqhi={aqhi}
      />
    </div>
  );
}
