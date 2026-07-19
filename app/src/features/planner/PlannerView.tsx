import { useState } from 'react';
import { ACTIVITIES, TOL_MULT } from '../../core/activities';
import { formatHour } from '../../core/units';
import { useLocale, useT } from '../../hooks';
import { downloadFile, sessionsToIcs } from '../../lib/download';
import { fmtWeekdayShort } from '../../lib/format';
import { pushAvailability, subscribePush } from '../../services/push';
import { useForecast } from '../../state/forecast';
import { checkSession, usePlanner } from '../../state/planner';
import { critFor, useSettings } from '../../state/settings';
import { BandChip, Button, Card } from '../../ui/primitives';
import { uiCss } from '../../ui/primitives';
import s from './planner.module.css';

export function PlannerView() {
  const t = useT();
  const locale = useLocale();
  const st = useSettings();
  const { data, dataFor } = useForecast();
  const { sessions, remove } = usePlanner();
  const [pushState, setPushState] = useState<'idle' | 'busy' | 'on'>('idle');

  const checkOf = (p: (typeof sessions)[number]) =>
    checkSession(p, data, dataFor, critFor(st, p.activityId), TOL_MULT[st.tolerance]);

  const exportAll = () => {
    downloadFile(sessionsToIcs(sessions, checkOf, t), 'blockcast-sessions.ics', 'text/calendar');
  };

  const availability = pushAvailability();
  const enablePush = async () => {
    setPushState('busy');
    const ok = await subscribePush({
      sessions,
      critFor: (id) => critFor(st, id),
      tolMult: TOL_MULT[st.tolerance],
      lang: st.lang,
      units: st.units,
    });
    setPushState(ok ? 'on' : 'idle');
  };

  return (
    <Card>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>{t.planner.title}</h2>

      {sessions.length === 0 ? (
        <div className={uiCss.empty}>{t.planner.empty}</div>
      ) : (
        <div>
          {sessions.map((p) => {
            const b = checkOf(p);
            return (
              <div className={s.item} key={p.id}>
                <span className={s.ico}>{ACTIVITIES[p.activityId].emoji}</span>
                <div className={s.main}>
                  <div className={s.title}>{t.activities[p.activityId]}</div>
                  <div className={s.sub}>
                    {fmtWeekdayShort(p.day, locale)} ·{' '}
                    {formatHour(p.h, st.clock)}–{formatHour(Math.min(p.h + p.len, 24), st.clock)} ·{' '}
                    {p.locName}
                  </div>
                </div>
                {b ? (
                  <BandChip band={b.band}>
                    {t.risk[`${b.band}Short`]} · {b.score}
                  </BandChip>
                ) : (
                  <BandChip band={null}>{t.common.noData}</BandChip>
                )}
                <button
                  className={s.del}
                  onClick={() => remove(p.id)}
                  aria-label={`${t.common.remove} ${t.activities[p.activityId]}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className={s.foot}>
        <Button onClick={exportAll} disabled={!sessions.length}>
          ⬇ {t.planner.exportAll}
        </Button>
      </div>

      {sessions.length > 0 && (
        <div className={s.pushRow}>
          {availability === 'ok' || availability === 'unconfigured' ? (
            pushState === 'on' ? (
              <span>🔔 {t.alerts.pushOn}</span>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={enablePush}
                  disabled={pushState === 'busy' || availability === 'unconfigured'}
                >
                  🔔 {t.planner.notifyMe}
                </Button>
                {availability === 'unconfigured' && <span>{t.planner.notifyUnsupported}</span>}
              </>
            )
          ) : (
            <span>{availability === 'denied' ? t.planner.notifyDenied : t.planner.notifyUnsupported}</span>
          )}
        </div>
      )}
    </Card>
  );
}
