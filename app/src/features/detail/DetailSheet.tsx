import { useMemo } from 'react';
import { ACTIVITIES, TOL_MULT, type FactorKey } from '../../core/activities';
import { getBlock } from '../../core/forecast';
import type { HourSlice } from '../../core/scoring';
import { formatDepth, formatHour, formatPrecip, formatSpeed, formatTemp } from '../../core/units';
import { useLocale, useT } from '../../hooks';
import { downloadFile, sessionsToIcs } from '../../lib/download';
import { fmtFull, fmtIsoTime } from '../../lib/format';
import { useForecast } from '../../state/forecast';
import { usePlanner } from '../../state/planner';
import { critFor, useSettings } from '../../state/settings';
import { useUi } from '../../state/ui';
import { Button } from '../../ui/primitives';
import { Sheet } from '../../ui/Sheet';
import { HourlyCharts } from './HourlyCharts';
import s from './detail.module.css';

const bandColor = (score: number) =>
  score < 25 ? 'var(--green)' : score < 55 ? 'var(--amber)' : 'var(--red)';
const bandBg = (score: number) =>
  score < 25 ? 'var(--green-bg)' : score < 55 ? 'var(--amber-bg)' : 'var(--red-bg)';

export function DetailSheet() {
  const t = useT();
  const locale = useLocale();
  const st = useSettings();
  const data = useForecast((f) => f.data);
  const { selected, detailOpen, closeDetail } = useUi();
  const planner = usePlanner();

  const crit = useMemo(() => critFor(st, st.activity), [st]);
  const tolMult = TOL_MULT[st.tolerance];

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
  const effOf = (k: FactorKey) => Math.min(1, b.f.sev[k] * tolMult) * (crit.weights[k] / 10);
  const isWinterAct = ACTIVITIES[st.activity].snowBase != null;

  const tempVal =
    b.f.temp < crit.tMin
      ? `${formatTemp(b.f.temp, st.units)} · ${t.detail.min} ${formatTemp(crit.tMin, st.units)}`
      : b.f.temp > crit.tMax
        ? `${formatTemp(b.f.temp, st.units)} · ${t.detail.max} ${formatTemp(crit.tMax, st.units)}`
        : formatTemp(b.f.temp, st.units);

  const rows: { name: string; val: string; eff: number }[] = [
    {
      name: `🌧 ${t.detail.rain}`,
      val: `${b.f.rainProb}% · ${formatPrecip(b.f.rainSum, st.units)}`,
      eff: effOf('rain'),
    },
    ...(isWinterAct
      ? [
          {
            name: `❄️ ${t.detail.snow}`,
            val: `${formatDepth(b.f.depth, st.units)} ${t.detail.base}`,
            eff: effOf('snow'),
          },
          {
            name: `🌨 ${t.detail.freshSnow}`,
            val: `${formatDepth(b.f.fresh48, st.units)} / 48 h`,
            eff: effOf('fresh'),
          },
        ]
      : []),
    {
      name: `💨 ${t.detail.wind}`,
      val: `${formatSpeed(b.f.wind, st.units)} · ${t.detail.gusts} ${formatSpeed(b.f.gust, st.units)}`,
      eff: effOf('wind'),
    },
    { name: `🌡 ${t.detail.feels}`, val: tempVal, eff: Math.max(effOf('cold'), effOf('heat')) },
    { name: `☀️ ${t.detail.uv}`, val: `${t.detail.uvIdx} ${b.f.uv}`, eff: effOf('uv') },
  ];

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

  const addToPlanner = () => {
    planner.add({
      id: Date.now(),
      activityId: st.activity,
      day,
      h,
      len,
      locName: st.loc.name,
      lat: st.loc.lat,
      lon: st.loc.lon,
      baseScore: b.score,
      baseBand: b.band,
    });
  };

  const dlIcs = () => {
    const ics = sessionsToIcs(
      [
        {
          id: Date.now(),
          activityId: st.activity,
          day,
          h,
          len,
          locName: st.loc.name,
          lat: st.loc.lat,
          lon: st.loc.lon,
          baseScore: b.score,
          baseBand: b.band,
        },
      ],
      () => b,
      t,
    );
    downloadFile(ics, 'blockcast-session.ics', 'text/calendar');
  };

  return (
    <Sheet open={detailOpen} onClose={closeDetail} ariaLabel={t.detail.title}>
      <div className={s.top}>
        <div className={s.gauge} style={{ background: bandBg(b.score), color: bandColor(b.score) }}>
          {b.score}
        </div>
        <div>
          <div className={s.when}>
            {ACTIVITIES[st.activity].emoji} {t.activities[st.activity]} · {fmtFull(day, locale)}
          </div>
          <div className={s.verdict}>
            {formatHour(h, st.clock)} – {formatHour(end, st.clock)} · {t.risk[b.band]}
          </div>
        </div>
      </div>

      <div className={s.fbars}>
        {rows.map((r) => (
          <div className={s.fbar} key={r.name}>
            <span>{r.name}</span>
            <div className={s.track}>
              <div
                className={s.fill}
                style={{
                  width: `${Math.round(r.eff * 100)}%`,
                  background:
                    r.eff < 0.25 ? 'var(--green-vivid)' : r.eff < 0.55 ? 'var(--amber-vivid)' : 'var(--red-vivid)',
                }}
              />
            </div>
            <span className={s.val}>{r.val}</span>
          </div>
        ))}
      </div>

      <HourlyCharts hours={dayHours} units={st.units} clock={st.clock} t={t} />

      {sunrise && sunset && (
        <div className={s.sun}>
          <span>🌅 {t.home.sunrise} {fmtIsoTime(sunrise, locale, st.clock)}</span>
          <span>🌇 {t.home.sunset} {fmtIsoTime(sunset, locale, st.clock)}</span>
        </div>
      )}

      <div className={s.actions}>
        <Button onClick={addToPlanner} disabled={already}>
          {already ? `✓ ${t.detail.inPlanner}` : `➕ ${t.detail.addPlanner}`}
        </Button>
        <Button variant="ghost" onClick={dlIcs}>
          ⬇ {t.detail.ics}
        </Button>
      </div>
    </Sheet>
  );
}
