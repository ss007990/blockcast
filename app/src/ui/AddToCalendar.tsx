// "Add to calendar ▾" — one menu, four destinations: Google and Outlook get
// pre-filled compose links, Apple and desktop apps get the .ics download.
// Compose pages hold a single event, so with several sessions the menu turns
// into a checklist: each click opens one session (its own user gesture, which
// keeps popup blockers happy) and gets ticked off. The .ics download always
// carries every session in one file.

import { useEffect, useRef, useState } from 'react';
import { googleCalUrl, outlookCalUrl } from '../core/calendarLinks';
import { buildCalendar, type IcsEvent } from '../core/ics';
import { useT } from '../hooks';
import { downloadFile } from '../lib/download';
import { Button } from './primitives';
import s from './addtocal.module.css';

export interface CalItem {
  event: IcsEvent;
  /** Row label in the multi-session checklist, e.g. "Tennis · Sat 18:00". */
  label?: string;
}

type Dest = 'google' | 'live' | 'office';
const urlFor = (d: Dest, e: IcsEvent) => (d === 'google' ? googleCalUrl(e) : outlookCalUrl(e, d));

interface Props {
  items: CalItem[];
  /** Trigger text; defaults to the generic "Add to calendar". */
  label?: string;
  /** Icon-only trigger for tight rows (planner items). */
  compact?: boolean;
  /** Open the menu above the trigger — for use near a container's bottom edge (sheets). */
  dropUp?: boolean;
}

export function AddToCalendar({ items, label, compact, dropUp }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [dest, setDest] = useState<Dest | null>(null);
  const [added, setAdded] = useState<ReadonlySet<number>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    setDest(null);
    setAdded(new Set());
  };

  useEffect(() => {
    if (!open) return;
    const away = (ev: PointerEvent) => {
      if (!ref.current?.contains(ev.target as Node)) close();
    };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const pick = (d: Dest) => {
    if (items.length === 1) {
      window.open(urlFor(d, items[0]!.event), '_blank', 'noopener');
      close();
    } else {
      setDest(d);
    }
  };

  const openOne = (i: number) => {
    window.open(urlFor(dest!, items[i]!.event), '_blank', 'noopener');
    setAdded(new Set(added).add(i));
  };

  const dlIcs = () => {
    downloadFile(
      buildCalendar(items.map((x) => x.event), new Date().toISOString()),
      items.length > 1 ? 'blockcast-sessions.ics' : 'blockcast-session.ics',
      'text/calendar',
    );
    close();
  };

  return (
    <div className={s.wrap} ref={ref}>
      {compact ? (
        <button
          className={s.iconBtn}
          onClick={() => (open ? close() : setOpen(true))}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={label ?? t.planner.addCal}
        >
          📅
        </button>
      ) : (
        <Button
          variant="ghost"
          onClick={() => (open ? close() : setOpen(true))}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          📅 {label ?? t.planner.addCal} ▾
        </Button>
      )}
      {open && (
        <div className={dropUp ? `${s.menu} ${s.up}` : s.menu} role="menu" aria-label={label ?? t.planner.addCal}>
          {dest === null ? (
            <>
              <button role="menuitem" onClick={() => pick('google')}>
                {t.planner.calGoogle}
              </button>
              <button role="menuitem" onClick={() => pick('live')}>
                {t.planner.calOutlook}
              </button>
              <button role="menuitem" onClick={() => pick('office')}>
                {t.planner.calOffice}
              </button>
              <button role="menuitem" onClick={dlIcs}>
                {t.planner.calIcs}
              </button>
            </>
          ) : (
            <>
              <button className={s.back} onClick={() => setDest(null)}>
                {t.planner.calBack}
              </button>
              <div className={s.head}>{t.planner.calOpenEach}</div>
              <div className={s.list}>
                {items.map((x, i) => (
                  <button
                    key={x.event.uid}
                    role="menuitem"
                    className={added.has(i) ? s.done : undefined}
                    onClick={() => openOne(i)}
                  >
                    {added.has(i) ? '✓ ' : ''}
                    {x.label ?? x.event.summary}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
