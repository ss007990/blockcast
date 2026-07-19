import { useIsMobile, useT } from '../hooks';
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

export function Header() {
  const t = useT();
  const mobile = useIsMobile();
  const loc = useSettings((st) => st.loc);
  const { tab, setTab, setLocOpen, setAlertsOpen } = useUi();
  const unread = useAlerts(unreadCount);

  return (
    <header className={s.header}>
      <Logo />
      <div className={s.title}>
        <h1>BlockCast</h1>
        {!mobile && <div className={s.tagline}>{t.tagline}</div>}
      </div>

      {!mobile && (
        <nav className={s.nav} aria-label="Sections">
          {(Object.keys(TAB_ICONS) as Tab[]).map((k) => (
            <button
              key={k}
              className={tab === k ? `${s.navBtn} ${s.on}` : s.navBtn}
              aria-current={tab === k ? 'page' : undefined}
              onClick={() => setTab(k)}
            >
              <Icon name={TAB_ICONS[k]} size={16} />
              {t.tabs[k]}
            </button>
          ))}
        </nav>
      )}

      <span className={s.spacer} />

      <button className={s.locChip} onClick={() => setLocOpen(true)} title={t.location.set}>
        <Icon name="pin" size={15} />
        <b>{loc.name}</b>
      </button>

      <button
        className={s.bell}
        onClick={() => setAlertsOpen(true)}
        aria-label={`${t.alerts.title}${unread ? ` (${unread})` : ''}`}
      >
        <Icon name="bell" size={18} />
        {unread > 0 && <span className={s.badge}>{unread > 9 ? '9+' : unread}</span>}
      </button>
    </header>
  );
}

export function TabBar() {
  const t = useT();
  const { tab, setTab } = useUi();
  return (
    <nav className={s.tabbar} aria-label="Sections">
      {(Object.keys(TAB_ICONS) as Tab[]).map((k) => (
        <button
          key={k}
          className={tab === k ? `${s.tabBtn} ${s.on}` : s.tabBtn}
          aria-current={tab === k ? 'page' : undefined}
          onClick={() => setTab(k)}
        >
          <Icon name={TAB_ICONS[k]} size={21} />
          {t.tabs[k]}
        </button>
      ))}
    </nav>
  );
}
