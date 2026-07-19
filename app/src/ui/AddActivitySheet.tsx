// "Add activity" — lets the user grow the rail with their own activities and
// categories. Saving selects the new activity and opens the tune panel on the
// Week tab so its criteria can be adjusted right away.

import { useState } from 'react';
import { CATEGORY_IDS, type Season } from '../core/activities';
import { useLocale, useT } from '../hooks';
import { useSettings } from '../state/settings';
import { useUi } from '../state/ui';
import { Button, Field, Segmented, uiCss } from './primitives';
import { Sheet } from './Sheet';

const NEW_CAT = '__new__';

export function AddActivitySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const locale = useLocale();
  const addActivity = useSettings((s) => s.addActivity);
  const customs = useSettings((s) => s.customActivities);
  const { setTab, setTuneOpen } = useUi();

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [cat, setCat] = useState<string>('leisure');
  const [newCat, setNewCat] = useState('');
  const [season, setSeason] = useState<Season>('all');

  // preset categories localized + sorted, then the user's own categories
  const catOptions = [
    ...CATEGORY_IDS.map((c) => ({ value: c as string, label: t.cats[c] })).sort((a, b) =>
      a.label.localeCompare(b.label, locale),
    ),
    ...[...new Set(customs.map((c) => c.cat))]
      .filter((c) => !(CATEGORY_IDS as readonly string[]).includes(c))
      .map((c) => ({ value: c, label: c })),
  ];

  const finalCat = cat === NEW_CAT ? newCat.trim() : cat;
  const canSave = name.trim().length > 0 && finalCat.length > 0;

  const save = () => {
    if (!canSave) return;
    addActivity({ name: name.trim(), emoji: emoji.trim() || '🏅', cat: finalCat, season });
    onClose();
    setName('');
    setEmoji('');
    setNewCat('');
    // the tune panel lives on the Week tab — land there ready to adjust
    setTuneOpen(true);
    setTab('week');
  };

  return (
    <Sheet open={open} onClose={onClose} ariaLabel={t.add.title}>
      <h2 style={{ fontSize: 19, marginBottom: 14 }}>{t.add.title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label={t.add.name}>
          <input
            className={uiCss.input}
            value={name}
            placeholder={t.add.namePh}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label={t.add.emoji}>
          <input
            className={uiCss.input}
            style={{ maxWidth: 90 }}
            value={emoji}
            placeholder="🏅"
            maxLength={4}
            onChange={(e) => setEmoji(e.target.value)}
          />
        </Field>
        <Field label={t.add.cat}>
          <select className={uiCss.select} value={cat} onChange={(e) => setCat(e.target.value)}>
            {catOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            <option value={NEW_CAT}>{t.add.newCat}</option>
          </select>
        </Field>
        {cat === NEW_CAT && (
          <Field label={t.add.newCatPh}>
            <input
              className={uiCss.input}
              value={newCat}
              placeholder={t.add.newCatPh}
              maxLength={24}
              onChange={(e) => setNewCat(e.target.value)}
            />
          </Field>
        )}
        <Field label={t.add.season}>
          <Segmented<Season>
            options={[
              { value: 'all', label: t.add.seasonAll },
              { value: 'warm', label: t.add.seasonWarm },
              { value: 'winter', label: t.add.seasonWinter },
            ]}
            value={season}
            onChange={setSeason}
            ariaLabel={t.add.season}
          />
        </Field>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Button onClick={save} disabled={!canSave}>
            ⚙ {t.add.create}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {t.common.cancel}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
