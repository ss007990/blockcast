import { Fragment, useMemo, type ReactNode } from 'react';
import { TOL_MULT, type Tolerance } from '../../core/activities';
import { forecastDayKeys, getBlock, isoDate, locNow, wmoIcon } from '../../core/forecast';
import { formatHour, formatTemp } from '../../core/units';
import { useActivityName, useLocale, useNowMs, useT } from '../../hooks';
import { fmtDayMonth, fmtWeekdayShort } from '../../lib/format';
import { useForecast } from '../../state/forecast';
import { usePlanner } from '../../state/planner';
import { critFor, useSettings, type BlockLen } from '../../state/settings';
import { useUi } from '../../state/ui';
import { ActivityRail } from '../../ui/ActivityRail';
import { TunePanel, TuneToggle } from '../tune/TunePanel';
import { Card, Field, Segmented, uiCss } from '../../ui/primitives';
import s from './week.module.css';

export function WeekView() {
  return (
    <>
      <ActivityRail />
      <Controls />
      <TunePanel />
      <HeatBoard />
    </>
  );
}

function Controls() {
  const t = useT();
  const st = useSettings();

  return (
    <Card className={s.controls}>
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
        <TuneToggle />
      </div>
    </Card>
  );
}

function HeatBoard() {
  const t = useT();
  const locale = useLocale();
  const nameOf = useActivityName();
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

  const dayKeys = forecastDayKeys(data, st.planDays);
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
          {nameOf(st.activity)} {t.board.weekGlance}
        </h2>
        <button
          className={s.extendBtn}
          onClick={() => st.setPlanDays(st.planDays === 7 ? 14 : 7)}
          aria-pressed={st.planDays === 14}
        >
          {st.planDays === 7 ? t.board.nextWeek : t.board.backWeek}
        </button>
        {st.planDays === 14 && <span className={s.confNote}>{t.board.lowConf}</span>}
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
        style={{
          gridTemplateColumns: `76px repeat(${dayKeys.length}, minmax(0,1fr))`,
          minWidth: dayKeys.length > 7 ? 1080 : undefined,
        }}
      >
        <div />
        {dayKeys.map((d, i) => {
          const di = dailyIdx(d);
          const cls = [s.gh, d === todayISO ? s.ghToday : '', i >= 7 ? s.ext : '']
            .filter(Boolean)
            .join(' ');
          return (
            <div className={cls} key={d}>
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
              {dayKeys.map((d, i) => {
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
                  i >= 7 ? s.ext : '',
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

      <div
        className={`${uiCss.empty}`}
        style={{ padding: '10px 0 0', fontSize: 11, fontFamily: 'var(--font-mono)' }}
      >
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
