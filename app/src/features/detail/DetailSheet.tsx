import { useEffect, useMemo, useState } from 'react';
import { TOL_MULT } from '../../core/activities';
import { PURPOSES, type PlannedSession, type Purpose } from '../../core/alerts';
import { ActivityIcon } from '../../ui/ActivityIcon';
import { AddToCalendar } from '../../ui/AddToCalendar';
import { getBlock } from '../../core/forecast';
import type { HourSlice } from '../../core/scoring';
import { formatHour } from '../../core/units';
import { useActivityName, useLocale, useT } from '../../hooks';
import { sessionToIcsEvent } from '../../lib/download';
import { fmtFull, fmtIsoTime } from '../../lib/format';
import { useForecast } from '../../state/forecast';
import { usePlanner } from '../../state/planner';
import { critFor, useSettings } from '../../state/settings';
import { useUi } from '../../state/ui';
import { Button, uiCss } from '../../ui/primitives';
import { Sheet } from '../../ui/Sheet';
import { FactorChips } from './FactorChips';
import { HourlyCharts } from './HourlyCharts';
import s from './detail.module.css';

const bandColor = (score: number) =>
  score < 25 ? 'var(--green)' : score < 55 ? 'var(--amber)' : 'var(--red)';
const bandBg = (score: number) =>
  score < 25 ? 'var(--green-bg)' : score < 55 ? 'var(--amber-bg)' : 'var(--red-bg)';

export function DetailSheet() {
  const t = useT();
  const locale = useLocale();
  const nameOf = useActivityName();
  const st = useSettings();
  const data = useForecast((f) => f.data);
  const { selected, detailOpen, closeDetail } = useUi();
  const planner = usePlanner();

  const crit = useMemo(() => critFor(st, st.activity), [st]);
  const tolMult = TOL_MULT[st.tolerance];

  const [purpose, setPurpose] = useState<Purpose | ''>('');
  const [note, setNote] = useState('');
  useEffect(() => {
    setPurpose('');
    setNote('');
  }, [selected]);

  const block = useMemo(() => {
    if (!selected || !data) return null;
    const end = Math.min(selected.h + st.blockLen, st.hTo);
    const len = Math.max(1, end - selected.h);
    return { end, len, b: getBlock(data, selected.day, selected.h, len, crit, tolMult) };
  }, [selected, data, st.blockLen, st.hTo, crit, tolMult]);

  if (!selected || !data || !block?.b) {
    return <Sheet open={false} onClose={closeDetail} ariaLabel={t.detail.title} children={null} />;
  }

  const { b, end, len } = block;
  const { day, h } = selected;

  const already = planner.sessions.some(
    (p) => p.day === day && p.h === h && p.activityId === st.activity,
  );

  const dayHours: { h: number; slice: HourSlice }[] = [];
  const daySlices = data.days[day] ?? [];
  for (let hh = h; hh < h + len && hh < 24; hh++) {
    const slice = daySlices[hh];
    if (slice) dayHours.push({ h: hh, slice });
  }

  const di = data.daily.time.indexOf(day);
  const sunrise = data.daily.sunrise?.[di];
  const sunset = data.daily.sunset?.[di];

  const session = (id: number): PlannedSession => ({
    id,
    activityId: st.activity,
    day,
    h,
    len,
    locName: st.loc.name,
    lat: st.loc.lat,
    lon: st.loc.lon,
    baseScore: b.score,
    baseBand: b.band,
    ...(purpose ? { purpose } : {}),
    ...(note.trim() ? { note: note.trim() } : {}),
  });

  const addToPlanner = () => planner.add(session(Date.now()));

  return (
    <Sheet open={detailOpen} onClose={closeDetail} ariaLabel={t.detail.title}>
      <div className={s.top}>
        <div className={s.gauge} style={{ background: bandBg(b.score), color: bandColor(b.score) }}>
          {b.score}
        </div>
        <div>
          <div className={s.when}>
            <ActivityIcon id={st.activity} /> {nameOf(st.activity)} · {fmtFull(day, locale)}
          </div>
          <div className={s.verdict}>
            {formatHour(h, st.clock)} – {formatHour(end, st.clock)} · {t.risk[b.band]}
          </div>
        </div>
      </div>

      <FactorChips b={b} crit={crit} tolMult={tolMult} units={st.units} t={t} />

      <HourlyCharts
        hours={dayHours}
        units={st.units}
        clock={st.clock}
        t={t}
        sun={
          sunrise && sunset
            ? {
                rise: fmtIsoTime(sunrise, locale, st.clock),
                set: fmtIsoTime(sunset, locale, st.clock),
              }
            : null
        }
      />

      <div className={s.planExtras}>
        <select
          className={uiCss.select}
          value={purpose}
          onChange={(e) => setPurpose(e.target.value as Purpose | '')}
          aria-label={t.planner.purposeNone}
        >
          <option value="">{t.planner.purposeNone}</option>
          {PURPOSES.map((k) => (
            <option key={k} value={k}>
              {t.planner.purposes[k]}
            </option>
          ))}
        </select>
        <input
          className={`${uiCss.input} ${s.noteInput}`}
          value={note}
          placeholder={t.planner.notePh}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className={s.actions}>
        <Button onClick={addToPlanner} disabled={already}>
          {already ? `✓ ${t.detail.inPlanner}` : `➕ ${t.detail.addPlanner}`}
        </Button>
        <AddToCalendar dropUp event={sessionToIcsEvent(session(0), b, t, nameOf)} />
      </div>
    </Sheet>
  );
}
