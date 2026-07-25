// No app chrome: a masthead row that scrolls away with the page, and a
// floating dock that is the only persistent navigation on every screen size.

import { useEffect, useRef, useState } from 'react';
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

// The masthead location chip: a straight door to the sheet until the user
// saves favourite spots — then it becomes a one-tap switcher between them.
function LocSwitch() {
  const t = useT();
  const loc = useSettings((st) => st.loc);
  const saved = useSettings((st) => st.savedPlaces);
  const setLoc = useSettings((st) => st.setLoc);
  const setLocOpen = useUi((u) => u.setLocOpen);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isCur = (p: { lat: number; lon: number }) => p.lat === loc.lat && p.lon === loc.lon;

  if (!saved.length) {
    return (
      <button className={s.locChip} onClick={() => setLocOpen(true)} title={t.location.set}>
        <Icon name="pin" size={14} />
        <b>{loc.name}</b>
      </button>
    );
  }

  return (
    <div className={s.locWrap} ref={wrapRef}>
      <button
        className={s.locChip}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t.location.set}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="pin" size={14} />
        <b>{loc.name}</b>
        <span className={s.locChevron} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className={s.locMenu} role="menu" aria-label={t.location.mySpots}>
          {saved.map((p) => (
            <button
              key={`${p.lat}-${p.lon}`}
              role="menuitemradio"
              aria-checked={isCur(p)}
              className={isCur(p) ? `${s.locItem} ${s.locItemOn}` : s.locItem}
              onClick={() => {
                setLoc(p);
                setOpen(false);
              }}
            >
              <span className={s.locItemName}>{p.name}</span>
              {isCur(p) && <span aria-hidden="true">✓</span>}
            </button>
          ))}
          <button
            role="menuitem"
            className={`${s.locItem} ${s.locItemChange}`}
            onClick={() => {
              setOpen(false);
              setLocOpen(true);
            }}
          >
            {t.location.change}
          </button>
        </div>
      )}
    </div>
  );
}

export function Masthead() {
  const t = useT();
  const setAlertsOpen = useUi((u) => u.setAlertsOpen);
  const unread = useAlerts(unreadCount);

  return (
    <header className={s.masthead}>
      <Logo />
      <span className={s.wordmark}>BlockCast</span>
      <span className={s.spacer} />
      <LocSwitch />
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
