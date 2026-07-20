// "Add to calendar ▾" — one menu, four destinations: Google and Outlook get
// pre-filled compose links, Apple and desktop apps get the .ics download.

import { useEffect, useRef, useState } from 'react';
import { googleCalUrl, outlookCalUrl } from '../core/calendarLinks';
import { buildCalendar, type IcsEvent } from '../core/ics';
import { useT } from '../hooks';
import { downloadFile } from '../lib/download';
import { Button } from './primitives';
import s from './addtocal.module.css';

interface Props {
  event: IcsEvent;
  /** Icon-only trigger for tight rows (planner items). */
  compact?: boolean;
  /** Open the menu above the trigger — for use near a container's bottom edge (sheets). */
  dropUp?: boolean;
}

export function AddToCalendar({ event, compact, dropUp }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (ev: PointerEvent) => {
      if (!ref.current?.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const go = (url: string) => {
    window.open(url, '_blank', 'noopener');
    setOpen(false);
  };
  const dlIcs = () => {
    downloadFile(buildCalendar([event], new Date().toISOString()), 'blockcast-session.ics', 'text/calendar');
    setOpen(false);
  };

  return (
    <div className={s.wrap} ref={ref}>
      {compact ? (
        <button
          className={s.iconBtn}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={t.planner.addCal}
        >
          📅
        </button>
      ) : (
        <Button variant="ghost" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu">
          📅 {t.planner.addCal} ▾
        </Button>
      )}
      {open && (
        <div className={dropUp ? `${s.menu} ${s.up}` : s.menu} role="menu" aria-label={t.planner.addCal}>
          <button role="menuitem" onClick={() => go(googleCalUrl(event))}>
            {t.planner.calGoogle}
          </button>
          <button role="menuitem" onClick={() => go(outlookCalUrl(event, 'live'))}>
            {t.planner.calOutlook}
          </button>
          <button role="menuitem" onClick={() => go(outlookCalUrl(event, 'office'))}>
            {t.planner.calOffice}
          </button>
          <button role="menuitem" onClick={dlIcs}>
            {t.planner.calIcs}
          </button>
        </div>
      )}
    </div>
  );
}
