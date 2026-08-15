// No app chrome: a masthead row that scrolls away with the page, and a
// floating dock that is the only persistent navigation on every screen size.

import { useEffect, useRef, useState } from 'react';
import { useT } from '../hooks';
import { useGeo } from '../state/geo';
import { useSettings, type Place } from '../state/settings';
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

// The masthead location chip. Device location is the app's home state, so the
// menu always leads with it: one tap away whatever you are looking at, and the
// chip's icon says which mode you are in — crosshair live, pin held.
function LocSwitch() {
  const t = useT();
  const loc = useSettings((st) => st.loc);
  const saved = useSettings((st) => st.savedPlaces);
  const lastPinned = useSettings((st) => st.lastPinned);
  const setLoc = useSettings((st) => st.setLoc);
  const toggleSavedPlace = useSettings((st) => st.toggleSavedPlace);
  const setLocOpen = useUi((u) => u.setLocOpen);
  const geo = useGeo();

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

  const following = loc.follow === true;
  const here = (p: { lat: number; lon: number }) => p.lat === loc.lat && p.lon === loc.lon;
  // while following, no pinned row is the active one — the device row is
  const isCur = (p: { lat: number; lon: number }) => !following && here(p);

  const pinTo = (p: Place) => {
    setLoc({ name: p.name, lat: p.lat, lon: p.lon });
    setOpen(false);
  };

  // already live → a manual refresh, and the menu stays put to show the result;
  // otherwise switch back, closing only once we actually have a fix
  const goLive = async () => {
    if (following) {
      geo.refresh(true);
      return;
    }
    if (await geo.follow()) setOpen(false);
  };

  const status =
    geo.status === 'locating'
      ? t.location.locating
      : geo.status === 'denied'
        ? t.location.denied
        : geo.status === 'unavailable'
          ? t.location.unavailable
          : following
            ? loc.name
            : null;

  // the last hand-picked place, when it isn't already a saved chip — the other
  // half of the back-and-forth
  const isSaved = (p: { lat: number; lon: number }) =>
    saved.some((x) => x.lat === p.lat && x.lon === p.lon);
  const back = lastPinned && !isCur(lastPinned) && !isSaved(lastPinned) ? lastPinned : null;

  return (
    <div className={s.locWrap} ref={wrapRef}>
      <button
        className={following ? `${s.locChip} ${s.locChipLive}` : s.locChip}
        aria-haspopup="menu"
        aria-expanded={open}
        title={`${loc.name} — ${following ? t.location.following : t.location.pinned}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={following ? 'locate' : 'pin'} size={14} />
        <b>{loc.name}</b>
        <span className={s.locChevron} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className={s.locMenu} role="menu" aria-label={t.location.set}>
          {geo.supported && (
            <button
              role="menuitemradio"
              aria-checked={following}
              aria-label={`${t.location.myLoc}${status ? ` — ${status}` : ''}`}
              className={following ? `${s.locItem} ${s.locItemOn}` : s.locItem}
              disabled={geo.status === 'locating'}
              onClick={() => void goLive()}
            >
              <Icon name="locate" size={15} />
              <span className={s.locItemName}>
                {t.location.myLoc}
                {status && <small className={s.locItemSub}>{status}</small>}
              </span>
              {following && <span aria-hidden="true">✓</span>}
            </button>
          )}

          {(saved.length > 0 || back) && <div className={s.locSep} role="separator" />}

          {saved.map((p) => (
            <span key={`${p.lat}-${p.lon}`} className={s.locRow}>
              <button
                role="menuitemradio"
                aria-checked={isCur(p)}
                aria-label={p.name}
                className={isCur(p) ? `${s.locItem} ${s.locItemOn}` : s.locItem}
                onClick={() => pinTo(p)}
              >
                <Icon name="pin" size={15} />
                <span className={s.locItemName}>{p.name}</span>
                {isCur(p) && <span aria-hidden="true">✓</span>}
              </button>
              {/* un-save without switching; the menu stays open to show the result */}
              <button
                className={s.locX}
                aria-label={`${t.common.remove} ${p.name}`}
                onClick={() => toggleSavedPlace(p)}
              >
                ×
              </button>
            </span>
          ))}

          {back && (
            <button
              role="menuitem"
              aria-label={`${back.name} — ${t.location.lastUsed}`}
              className={s.locItem}
              onClick={() => pinTo(back)}
            >
              <Icon name="pin" size={15} />
              <span className={s.locItemName}>
                {back.name}
                <small className={s.locItemSub}>{t.location.lastUsed}</small>
              </span>
            </button>
          )}

          <div className={s.locSep} role="separator" />

          {/* saving works while following too — that's how the city you
              flew into becomes a spot you can come back to */}
          {!saved.some(here) && (
            <button
              role="menuitem"
              className={`${s.locItem} ${s.locItemSave}`}
              onClick={() => toggleSavedPlace(loc)}
            >
              ☆ {t.location.saveSpot} — <span className={s.locItemName}>{loc.name}</span>
            </button>
          )}
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
