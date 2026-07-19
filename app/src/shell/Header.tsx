// No app chrome: a masthead row that scrolls away with the page, and a
// floating dock that is the only persistent navigation on every screen size.

import { useT } from '../hooks';
import { useSettings } from '../state/settings';
import { unreadCount, useAlerts } from '../state/alerts';
import { useUi, type Tab } from '../state/ui';
import { Icon, type IconName } from '../ui/Icon';
import { Logo } from './Logo';
import s from './shell.module.css';

const TAB_ICONS: Record<Tab, IconName> = {
  today: 'today',
  week: 'week',
  planner: 'planner',
  settings: 'settings',
};

export function Masthead() {
  const t = useT();
  const loc = useSettings((st) => st.loc);
  const { setLocOpen, setAlertsOpen } = useUi();
  const unread = useAlerts(unreadCount);

  return (
    <header className={s.masthead}>
      <Logo />
      <span className={s.wordmark}>BlockCast</span>
      <span className={s.spacer} />
      <button className={s.locChip} onClick={() => setLocOpen(true)} title={t.location.set}>
        <Icon name="pin" size={14} />
        <b>{loc.name}</b>
      </button>
      <button
        className={s.bell}
        onClick={() => setAlertsOpen(true)}
        aria-label={`${t.alerts.title}${unread ? ` (${unread})` : ''}`}
      >
        <Icon name="bell" size={17} />
        {unread > 0 && <span className={s.badge}>{unread > 9 ? '9+' : unread}</span>}
      </button>
    </header>
  );
}

export function TabBar() {
  const t = useT();
  const { tab, setTab } = useUi();
  return (
    <nav className={s.dock} aria-label="Sections">
      {(Object.keys(TAB_ICONS) as Tab[]).map((k) => (
        <button
          key={k}
          className={tab === k ? `${s.dockBtn} ${s.on}` : s.dockBtn}
          aria-current={tab === k ? 'page' : undefined}
          onClick={() => setTab(k)}
        >
          <Icon name={TAB_ICONS[k]} size={19} />
          {t.tabs[k]}
        </button>
      ))}
    </nav>
  );
}
