import { useState } from 'react';
import { TOL_MULT } from '../../core/activities';
import { ActivityIcon } from '../../ui/ActivityIcon';
import { AddToCalendar } from '../../ui/AddToCalendar';
import { formatHour } from '../../core/units';
import { useActivityName, useLocale, useT } from '../../hooks';
import { sessionToIcsEvent } from '../../lib/download';
import { fmtWeekdayShort } from '../../lib/format';
import { pushAvailability, subscribePush, unsubscribePush } from '../../services/push';
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
  const [pushBusy, setPushBusy] = useState(false);

  const checkOf = (p: (typeof sessions)[number]) =>
    checkSession(p, data, dataFor, critFor(st, p.activityId), TOL_MULT[st.tolerance]);

  const availability = pushAvailability();
  // opting in registers the transport and sends the current planner; from
  // then on App mirrors every change while `pushOn` stays set
  const enablePush = async () => {
    setPushBusy(true);
    const ok = await subscribePush({
      sessions,
      critFor: (id) => critFor(st, id),
      customs: st.customActivities,
      tolMult: TOL_MULT[st.tolerance],
      lang: st.lang,
      units: st.units,
    });
    if (ok) st.setPushOn(true);
    setPushBusy(false);
  };
  const disablePush = async () => {
    setPushBusy(true);
    await unsubscribePush();
    st.setPushOn(false);
    setPushBusy(false);
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
                    {b ? (
                      <BandChip band={b.band}>
                        {t.risk[`${b.band}Short`]} · {b.score}
                      </BandChip>
                    ) : (
                      <BandChip band={null}>{t.common.noData}</BandChip>
                    )}
                    <input
                      className={`${uiCss.input} ${s.note}`}
                      value={p.note ?? ''}
                      placeholder={t.planner.notePh}
                      onChange={(e) => update(p.id, { note: e.target.value || undefined })}
                    />
                  </div>
                </div>
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

      <CalendarFeed />

      {sessions.length > 0 && (
        <div className={s.foot}>
          <AddToCalendar
            dropUp
            label={t.planner.addAllCal}
            items={sessions.map((p) => ({
              event: sessionToIcsEvent(p, checkOf(p), t, nameOf),
              label: `${nameOf(p.activityId)} · ${fmtWeekdayShort(p.day, locale)} ${formatHour(p.h, st.clock)}`,
            }))}
          />
        </div>
      )}

      {sessions.length > 0 && (
        <div className={s.pushRow}>
          {availability === 'ok' || availability === 'unconfigured' ? (
            st.pushOn ? (
              <>
                <span>🔔 {t.alerts.pushOn}</span>
                <Button variant="ghost" onClick={disablePush} disabled={pushBusy}>
                  {t.alerts.pushOff}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={enablePush}
                  disabled={pushBusy || availability === 'unconfigured'}
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
