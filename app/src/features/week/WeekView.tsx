import { AnimatePresence, motion } from 'framer-motion';
import { Fragment, useMemo, type ReactNode } from 'react';
import {
  ACTIVITIES,
  FACTOR_KEYS,
  TOL_MULT,
  type ActivityId,
  type FactorKey,
  type Tolerance,
} from '../../core/activities';
import { forecastDayKeys, getBlock, isoDate, locNow, wmoIcon } from '../../core/forecast';
import { orderActivities } from '../../core/season';
import { formatHour, formatTemp } from '../../core/units';
import { useLocale, useNowMs, useT } from '../../hooks';
import { fmtDayMonth, fmtWeekdayShort } from '../../lib/format';
import { useForecast } from '../../state/forecast';
import { usePlanner } from '../../state/planner';
import { critFor, useSettings, type BlockLen } from '../../state/settings';
import { useUi } from '../../state/ui';
import { useSeason } from '../home/useSeason';
import { Button, Card, Field, Segmented, uiCss } from '../../ui/primitives';
import s from './week.module.css';

export function WeekView() {
  return (
    <>
      <Controls />
      <TunePanel />
      <HeatBoard />
    </>
  );
}

function Controls() {
  const t = useT();
  const st = useSettings();
  const { tuneOpen, setTuneOpen } = useUi();
  const winter = useSeason();
  const ordered = useMemo(() => orderActivities(winter), [winter]);

  return (
    <Card className={s.controls}>
      <Field label={t.controls.activity}>
        <select
          className={uiCss.select}
          value={st.activity}
          onChange={(e) => st.setActivity(e.target.value as typeof st.activity)}
        >
          {ordered.map((id) => (
            <option key={id} value={id}>
              {`${emojiOf(id)} ${t.activities[id]}`}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t.controls.blockLen}>
        <Segmented<BlockLen>
          options={[2, 3, 4, 6].map((v) => ({ value: v as BlockLen, label: `${v} ${t.controls.hourUnit}` }))}
          value={st.blockLen}
          onChange={st.setBlockLen}
          ariaLabel={t.controls.blockLen}
        />
      </Field>

      <Field label={t.controls.riskTol}>
        <Segmented<Tolerance>
          options={(['cautious', 'balanced', 'tolerant'] as const).map((v) => ({
            value: v,
            label: t.controls[v],
          }))}
          value={st.tolerance}
          onChange={st.setTolerance}
          ariaLabel={t.controls.riskTol}
        />
      </Field>

      <Field label={t.controls.hours}>
        <div className={s.hoursRow}>
          <select
            className={uiCss.select}
            style={{ minWidth: 86 }}
            value={st.hFrom}
            onChange={(e) => st.setHours(+e.target.value, st.hTo)}
          >
            {Array.from({ length: 23 }, (_, h) => (
              <option key={h} value={h}>
                {formatHour(h, st.clock)}
              </option>
            ))}
          </select>
          →
          <select
            className={uiCss.select}
            style={{ minWidth: 86 }}
            value={st.hTo}
            onChange={(e) => st.setHours(st.hFrom, +e.target.value)}
          >
            {Array.from({ length: 23 }, (_, i) => i + 2).map((h) => (
              <option key={h} value={h}>
                {formatHour(h, st.clock)}
              </option>
            ))}
          </select>
        </div>
      </Field>

      <div style={{ marginLeft: 'auto' }}>
        <Button variant="ghost" onClick={() => setTuneOpen(!tuneOpen)}>
          ⚙ {t.controls.tune}
        </Button>
      </div>
    </Card>
  );
}

const emojiOf = (id: ActivityId) => ACTIVITIES[id].emoji;

const SLIDER_DEFS: { k: FactorKey; snowOnly: boolean }[] = FACTOR_KEYS.map((k) => ({
  k,
  snowOnly: k === 'snow' || k === 'fresh',
}));

function TunePanel() {
  const t = useT();
  const st = useSettings();
  const tuneOpen = useUi((u) => u.tuneOpen);
  const crit = critFor(st, st.activity);
  const isWinterAct = ACTIVITIES[st.activity].snowBase != null;

  return (
    <AnimatePresence initial={false}>
      {tuneOpen && (
        <motion.div
          className={s.tuneWrap}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <Card className={s.tunePanel}>
            <h3>
              {t.tune.critFor} {ACTIVITIES[st.activity].emoji} {t.activities[st.activity]}
            </h3>
            <div className={s.tuneHint}>{t.tune.hint}</div>
            <div className={s.sliders}>
              {SLIDER_DEFS.filter((d) => !d.snowOnly || isWinterAct).map(({ k }) => (
                <div className={s.srow} key={k}>
                  <label>
                    <span>{t.tune[k]}</span>
                    <span>{crit.weights[k]}</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={crit.weights[k]}
                    onChange={(e) => st.setWeight(st.activity, k, +e.target.value)}
                  />
                  {k === 'cold' ? (
                    <small>
                      {t.tune.coldS}{' '}
                      <input
                        type="number"
                        className={s.tnum}
                        value={crit.tMin}
                        onChange={(e) => {
                          const v = +e.target.value;
                          if (Number.isFinite(v)) st.setTempBand(st.activity, 'tMin', v);
                        }}
                      />{' '}
                      °C
                    </small>
                  ) : k === 'heat' ? (
                    <small>
                      {t.tune.heatS}{' '}
                      <input
                        type="number"
                        className={s.tnum}
                        value={crit.tMax}
                        onChange={(e) => {
                          const v = +e.target.value;
                          if (Number.isFinite(v)) st.setTempBand(st.activity, 'tMax', v);
                        }}
                      />{' '}
                      °C
                    </small>
                  ) : (
                    <small>{t.tune[`${k}S`]}</small>
                  )}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <Button variant="ghost" onClick={() => st.resetTune(st.activity)}>
                {t.tune.reset}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HeatBoard() {
  const t = useT();
  const locale = useLocale();
  const st = useSettings();
  const { data, status, error, updatedAt } = useForecast();
  const { selected, select } = useUi();
  const sessions = usePlanner((p) => p.sessions);
  const nowMs = useNowMs();

  const crit = useMemo(() => critFor(st, st.activity), [st]);
  const tolMult = TOL_MULT[st.tolerance];

  if (!data) {
    return (
      <Card className={s.board}>
        <div className={uiCss.empty}>
          {status === 'error' ? `${t.common.loadErr} ${error} ${t.common.checkConn}` : t.common.loading}
        </div>
      </Card>
    );
  }

  const dayKeys = forecastDayKeys(data);
  const starts: number[] = [];
  for (let h = st.hFrom; h < st.hTo; h += st.blockLen) starts.push(h);
  const blockEnd = (h0: number) => Math.min(h0 + st.blockLen, st.hTo);
  const now = locNow(data, nowMs);
  const todayISO = isoDate(now);
  const dailyIdx = (d: string) => data.daily.time.indexOf(d);

  return (
    <Card className={s.board}>
      <div className={s.boardHead}>
        <h2>
          {t.activities[st.activity]} {t.board.weekGlance}
        </h2>
        <div className={s.legend}>
          <span>
            <span className={s.dot} style={{ background: 'var(--green-vivid)' }} />
            {t.board.legendG}
          </span>
          <span>
            <span className={s.dot} style={{ background: 'var(--amber-vivid)' }} />
            {t.board.legendY}
          </span>
          <span>
            <span className={s.dot} style={{ background: 'var(--red-vivid)' }} />
            {t.board.legendR}
          </span>
        </div>
      </div>

      <div
        className={s.grid}
        style={{ gridTemplateColumns: `76px repeat(${dayKeys.length}, minmax(0,1fr))` }}
      >
        <div />
        {dayKeys.map((d) => {
          const di = dailyIdx(d);
          return (
            <div className={s.gh} key={d}>
              <b>{d === todayISO ? t.common.today : fmtWeekdayShort(d, locale)}</b>
              <span className="ico" style={{ fontSize: 19, display: 'block', margin: '2px 0' }}>
                {wmoIcon(data.daily.weather_code[di] ?? 0)}
              </span>
              {fmtDayMonth(d, locale)}
              <br />
              <span className="tnum">
                {formatTemp(data.daily.apparent_temperature_min[di] ?? 0, st.units)} /{' '}
                {formatTemp(data.daily.apparent_temperature_max[di] ?? 0, st.units)}
              </span>
            </div>
          );
        })}

        {starts.map((h0) => {
          const end = blockEnd(h0);
          return (
            <FragmentRow key={h0}>
              <div className={s.tlabel}>
                {formatHour(h0, st.clock)} – {formatHour(end, st.clock)}
              </div>
              {dayKeys.map((d) => {
                const b = getBlock(data, d, h0, Math.max(1, end - h0), crit, tolMult);
                if (!b) return <div key={d} className={`${s.cell} ${s.past}`} />;
                const isPast = (d === todayISO && end <= now.getHours()) || d < todayISO;
                const isSel = selected?.day === d && selected?.h === h0;
                const pinned = sessions.some(
                  (p) => p.day === d && p.h === h0 && p.activityId === st.activity,
                );
                const cls = [
                  s.cell,
                  b.band === 'g' ? s.rg : b.band === 'y' ? s.ry : s.rr,
                  isPast ? s.past : '',
                  isSel ? s.sel : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <div
                    key={d}
                    className={cls}
                    role="button"
                    tabIndex={isPast ? -1 : 0}
                    aria-label={`${fmtWeekdayShort(d, locale)} ${formatHour(h0, st.clock)}–${formatHour(end, st.clock)} · ${t.common.risk} ${b.score} · ${t.risk[b.band]}`}
                    onClick={() => select(isSel ? null : { day: d, h: h0 })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        select(isSel ? null : { day: d, h: h0 });
                      }
                    }}
                  >
                    {b.score}
                    {pinned && <span className={s.pin}>📌</span>}
                  </div>
                );
              })}
            </FragmentRow>
          );
        })}
      </div>

      <div className={`${uiCss.empty}`} style={{ padding: '10px 0 0', fontSize: 12.5 }}>
        {updatedAt
          ? `${t.common.liveForecast} · ${st.loc.name} · ${t.common.updated} ${new Date(updatedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`
          : null}
      </div>
    </Card>
  );
}

// grid rows are laid out by the parent grid — this is just a keyed fragment
function FragmentRow({ children }: { children: ReactNode }) {
  return <Fragment>{children}</Fragment>;
}
