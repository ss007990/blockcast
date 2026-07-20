import { useState } from 'react';
import { TOL_MULT } from '../../core/activities';
import { PURPOSES, type Purpose } from '../../core/alerts';
import { ActivityIcon } from '../../ui/ActivityIcon';
import { AddToCalendar } from '../../ui/AddToCalendar';
import { formatHour } from '../../core/units';
import { useActivityName, useLocale, useT } from '../../hooks';
import { sessionToIcsEvent } from '../../lib/download';
import { fmtWeekdayShort } from '../../lib/format';
import { pushAvailability, subscribePush } from '../../services/push';
import { CalendarFeed } from './CalendarFeed';
import { useForecast } from '../../state/forecast';
import { checkSession, usePlanner } from '../../state/planner';
import { critFor, useSettings } from '../../state/settings';
import { BandChip, Button, Card } from '../../ui/primitives';
import { uiCss } from '../../ui/primitives';
import s from './planner.module.css';

export function PlannerView() {
  const t = useT();
  const locale = useLocale();
  const nameOf = useActivityName();
  const st = useSettings();
  const { data, dataFor } = useForecast();
  const { sessions, remove, update } = usePlanner();
  const [pushState, setPushState] = useState<'idle' | 'busy' | 'on'>('idle');

  const checkOf = (p: (typeof sessions)[number]) =>
    checkSession(p, data, dataFor, critFor(st, p.activityId), TOL_MULT[st.tolerance]);

  const availability = pushAvailability();
  const enablePush = async () => {
    setPushState('busy');
    const ok = await subscribePush({
      sessions,
      critFor: (id) => critFor(st, id),
      customs: st.customActivities,
      tolMult: TOL_MULT[st.tolerance],
      lang: st.lang,
      units: st.units,
    });
    setPushState(ok ? 'on' : 'idle');
  };

  return (
    <Card>
      <h2 style={{ fontSize: 21, marginBottom: 14 }}>{t.planner.title}</h2>

      {sessions.length === 0 ? (
        <div className={uiCss.empty}>{t.planner.empty}</div>
      ) : (
        <div>
          {sessions.map((p) => {
            const b = checkOf(p);
            return (
              <div className={s.item} key={p.id}>
                <span className={s.ico}>
                  <ActivityIcon id={p.activityId} />
                </span>
                <div className={s.main}>
                  <div className={s.title}>{nameOf(p.activityId)}</div>
                  <div className={s.sub}>
                    {fmtWeekdayShort(p.day, locale)} ·{' '}
                    {formatHour(p.h, st.clock)}–{formatHour(Math.min(p.h + p.len, 24), st.clock)} ·{' '}
                    {p.locName}
                  </div>
                  <div className={s.meta}>
                    <select
                      className={uiCss.select}
                      value={p.purpose ?? ''}
                      onChange={(e) =>
                        update(p.id, { purpose: (e.target.value || undefined) as Purpose | undefined })
                      }
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
                      className={`${uiCss.input} ${s.note}`}
                      value={p.note ?? ''}
                      placeholder={t.planner.notePh}
                      onChange={(e) => update(p.id, { note: e.target.value || undefined })}
                    />
                  </div>
                </div>
                {b ? (
                  <BandChip band={b.band}>
                    {t.risk[`${b.band}Short`]} · {b.score}
                  </BandChip>
                ) : (
                  <BandChip band={null}>{t.common.noData}</BandChip>
                )}
                <AddToCalendar compact items={[{ event: sessionToIcsEvent(p, b, t, nameOf) }]} />
                <button
                  className={s.del}
                  onClick={() => remove(p.id)}
                  aria-label={`${t.common.remove} ${nameOf(p.activityId)}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {sessions.length > 0 && (
        <div className={s.foot}>
          <AddToCalendar
            label={t.planner.addAllCal}
            items={sessions.map((p) => ({
              event: sessionToIcsEvent(p, checkOf(p), t, nameOf),
              label: `${nameOf(p.activityId)} · ${fmtWeekdayShort(p.day, locale)} ${formatHour(p.h, st.clock)}`,
            }))}
          />
        </div>
      )}

      <CalendarFeed />

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
