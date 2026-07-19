import { useEffect } from 'react';
import { ActivityIcon } from '../../ui/ActivityIcon';
import { formatHour } from '../../core/units';
import { useLocale, useT } from '../../hooks';
import { fill } from '../../i18n';
import { fmtWeekdayLong } from '../../lib/format';
import { useAlerts } from '../../state/alerts';
import { useSettings } from '../../state/settings';
import { useUi } from '../../state/ui';
import { BandChip, uiCss } from '../../ui/primitives';
import { Sheet } from '../../ui/Sheet';

export function AlertsSheet() {
  const t = useT();
  const locale = useLocale();
  const clock = useSettings((s) => s.clock);
  const { alertsOpen, setAlertsOpen } = useUi();
  const { items, markAllRead } = useAlerts();

  // opening the panel marks everything read (badge clears on close)
  useEffect(() => {
    if (alertsOpen) return () => markAllRead();
  }, [alertsOpen, markAllRead]);

  return (
    <Sheet open={alertsOpen} onClose={() => setAlertsOpen(false)} ariaLabel={t.alerts.title}>
      <h2 style={{ fontSize: 19, marginBottom: 14 }}>{t.alerts.title}</h2>
      {items.length === 0 ? (
        <div className={uiCss.empty}>{t.alerts.empty}</div>
      ) : (
        items.map((a) => (
          <div
            key={a.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 0',
              borderBottom: '1px solid var(--line)',
              fontSize: 13.5,
            }}
          >
            <span style={{ fontSize: 22 }}>
              <ActivityIcon id={a.activityId} />
            </span>
            <span style={{ flex: 1, lineHeight: 1.45 }}>
              {fill(t.alerts[a.kind], {
                activity: t.activities[a.activityId],
                when: `${fmtWeekdayLong(a.day, locale)} ${formatHour(a.h, clock)}`,
                band: t.risk[`${a.toBand}Short`],
              })}
            </span>
            <BandChip band={a.toBand}>{a.score}</BandChip>
          </div>
        ))
      )}
    </Sheet>
  );
}
